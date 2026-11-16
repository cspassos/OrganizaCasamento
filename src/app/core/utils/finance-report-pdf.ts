import { FinanceReport, ReportSection } from './finance-reports';
import { money } from './finance';
export async function financeReportPdf(
  report: FinanceReport,
  wedding: string,
  filters: string,
): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape' }),
    width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight();
  let y = 25;
  const ensure = (space: number) => {
    if (y + space > height - 22) {
      doc.addPage();
      y = 24;
    }
  };
  const paragraph = (text: string, bold = false, size = 8) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width - 28) as string[];
    for (const line of lines) {
      ensure(6);
      doc.setTextColor('#343c35');
      doc.text(line, 14, y);
      y += size * 0.45 + 1;
    }
    y += 3;
  };
  const table = (section: ReportSection) => {
    if (section.title) {
      ensure(24);
      paragraph(section.title, true, 11);
    }
    if (section.notes) paragraph(section.notes);
    const body = section.rows.length ? section.rows : [['Nenhum registro para este recorte.']];
    autoTable(doc, {
      startY: y,
      head: [section.columns],
      body,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.6,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: { fillColor: [100, 118, 91], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 247, 243] },
      margin: { top: 23, right: 14, bottom: 20, left: 14 },
      columnStyles: section.columns.length === 2 ? { 0: { cellWidth: 65 } } : undefined,
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      didParseCell: (data) => {
        if (data.section === 'body') {
          const state = section.states?.[data.row.index];
          if (state === 'Vencida') {
            data.cell.styles.textColor = [163, 60, 53];
            data.cell.styles.fillColor = [255, 243, 240];
          } else if (state === 'Pago') {
            data.cell.styles.textColor = [40, 97, 62];
          } else if (state === 'Desfeita' || state === 'Cancelada') {
            data.cell.styles.textColor = [110, 110, 110];
          }
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  };
  paragraph(report.title, true, 18);
  paragraph(wedding, true, 11);
  paragraph(filters);
  paragraph(
    `Emitido em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`,
  );
  paragraph(report.notes);
  if (report.summary?.length)
    table({
      title: 'Resumo acumulado das despesas selecionadas',
      columns: ['Indicador', 'Valor / quantidade'],
      rows: report.summary.map((s) => [s.label, s.value]),
    });
  table({
    title: 'Visão geral dos registros selecionados',
    columns: report.columns,
    rows: report.rows,
  });
  paragraph(`${report.totalLabel}: ${money(report.totalCents)}`, true, 10);
  for (const section of report.sections ?? []) table(section);
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('OrganizaCasamento | Relatório financeiro', 14, 12);
    doc.setDrawColor(226, 228, 219);
    doc.line(14, 16, width - 14, 16);
    doc.text(`Dados locais do casamento | Página ${i} de ${count}`, 14, height - 9);
  }
  return doc.output('blob');
}
