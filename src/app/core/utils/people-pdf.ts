export interface PeoplePrintList {
  title: string;
  wedding: string;
  filters: string;
  columns: string[];
  rows: string[][];
}

export async function peopleListPdf(list: PeoplePrintList): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
  const width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight();
  let y = 23;
  const text = (value: string, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor('#343c35');
    for (const line of doc.splitTextToSize(value, width - 28) as string[]) {
      if (y > height - 25) {
        doc.addPage();
        y = 23;
      }
      doc.text(line, 14, y);
      y += size * 0.45 + 1;
    }
    y += 3;
  };
  text(list.title, 19, true);
  text(list.wedding, 11, true);
  text(
    `Emitido em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`,
    9,
  );
  text(`${list.rows.length} pessoa(s) nesta lista. ${list.filters}`, 9);
  autoTable(doc, {
    startY: y + 2,
    head: [list.columns],
    body: list.rows.length
      ? list.rows
      : [['Nenhuma pessoa encontrada para os filtros selecionados.', '', '', '']],
    margin: { top: 22, left: 14, right: 14, bottom: 20 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: { fillColor: [100, 118, 91], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 247, 243] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 41 },
      2: { cellWidth: 43 },
      3: { cellWidth: 38 },
    },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#72776e');
    doc.text('OrganizaCasamento', 14, height - 10);
    doc.text(`Página ${page} de ${pages}`, width - 14, height - 10, { align: 'right' });
    if (page > 1) doc.text(list.title, 14, 13);
  }
  return doc.output('blob');
}
