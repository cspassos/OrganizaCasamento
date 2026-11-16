import { GiftList, giftQuantities } from '../models/gifts';
import { money } from './finance';
import { giftDescription } from './gift-description';
export async function giftsPdf(list: GiftList, wedding: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 22;
  const page = () => {
    doc.addPage();
    y = 22;
  };
  const room = (height: number) => {
    if (y + height > 276) page();
  };
  const text = (value: string, size = 10, bold = false, x = 16, width = 178, url = '') => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor('#343c35');
    for (const line of doc.splitTextToSize(value, width) as string[]) {
      room(size * 0.5 + 1);
      if (url) doc.textWithLink(line, x, y, { url });
      else doc.text(line, x, y);
      y += size * 0.5 + 1;
    }
  };
  const shopLink = (label: string, url: string, x = 16) => {
    room(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const width = doc.getTextWidth(label) + 10;
    doc.setFillColor('#586b50');
    doc.roundedRect(x, y - 4, width, 10, 2, 2, 'F');
    doc.setTextColor('#ffffff');
    doc.textWithLink(label, x + 5, y + 2, { url });
    doc.link(x, y - 4, width, 10, { url });
    y += 13;
  };
  text(list.title, 24, true);
  y += 3;
  text(wedding, 13, true);
  y += 4;
  text(list.message, 11);
  y += 8;
  if (list.sites.length) {
    room(25);
    text('Nossas listas nas lojas', 14, true);
    y += 3;
    for (const site of list.sites) {
      room(32);
      text(site.name, 11, true, 16, 178, site.url);
      y += 3;
      shopLink('Clique para abrir a lista na loja', site.url);
      text(new URL(site.url).hostname, 9);
      y += 6;
    }
  }
  const available = list.items.filter((item) => giftQuantities(item).remaining > 0);
  if (available.length) {
    room(24);
    text('Ideias de presentes', 14, true);
    y += 4;
  }
  for (const item of available) {
    room(65);
    const top = y,
      x = item.photo ? 60 : 16;
    if (item.photo) {
      try {
        const image = doc.getImageProperties(item.photo),
          scale = Math.min(36 / image.width, 36 / image.height);
        const w = image.width * scale,
          h = image.height * scale;
        doc.addImage(item.photo, 'JPEG', 16 + (36 - w) / 2, top - 4, w, h);
        if (item.url) doc.link(16, top - 4, 36, 36, { url: item.url });
      } catch {
        doc.setFontSize(8);
        doc.text('Foto indisponível', 16, top + 12);
      }
    }
    text(item.name, 13, true, x, 194 - x, item.url);
    text(`Quantidade que falta receber: ${giftQuantities(item).remaining}`, 10, false, x, 194 - x);
    if (item.priceCents !== null)
      text(`Preço aproximado por unidade: ${money(item.priceCents)}`, 10, false, x, 194 - x);
    if (item.url) {
      y += 3;
      shopLink('Clique para ver na loja', item.url, x);
    }
    y = Math.max(y, top + (item.photo ? 36 : 5));
    y += 5;
    const description = giftDescription(item.description, item.name);
    if (description) text(description, 10);
    y += 5;
    room(2);
    doc.setDrawColor('#e9e7de');
    doc.line(16, y, 194, y);
    y += 10;
  }
  room(24);
  text(`Lista atualizada em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}.`, 9);
  text('Os preços podem mudar. Confira as condições diretamente na loja.', 9);
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#646d66');
    doc.text('Lista de presentes', 16, 289);
    doc.text(`${n} / ${pages}`, 194, 289, { align: 'right' });
  }
  return doc.output('blob');
}
