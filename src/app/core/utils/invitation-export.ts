import { InvitationDesign } from '../models/invitations';
import { invitationSvg } from './invitation-art';
let fonts: Promise<string> | undefined;
function fontStyles() {
  return (fonts ??= (async () => {
    const values = await Promise.all(
      [
        ['Libre Caslon Display', 'font-5.ttf'],
        ['DM Sans', 'font-1.ttf'],
      ].map(async ([name, file]) => {
        const response = await fetch('/fonts/' + file);
        if (!response.ok) throw new Error('Não foi possível carregar as fontes do convite.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return `@font-face{font-family:'${name}';src:url(data:font/ttf;base64,${btoa(binary)}) format('truetype');}`;
      }),
    );
    return '<style>' + values.join('') + '</style>';
  })());
}
export async function invitationPng(design: InvitationDesign, recipient = ''): Promise<Blob> {
  const svg = invitationSvg(design, recipient).replace('<rect', (await fontStyles()) + '<rect');
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1260;
    canvas.height = 1800;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function invitationPdf(design: InvitationDesign, recipient = '') {
  const blob = await invitationPng(design, recipient),
    data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: [140, 200], orientation: 'portrait' });
  pdf.setProperties({ title: design.title, author: 'OrganizaCasamento' });
  pdf.addImage(data, 'PNG', 0, 0, 140, 200, undefined, 'FAST');
  return pdf.output('blob');
}
export function downloadInvitationFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function invitationQr(url: string) {
  const qr = await import('qrcode');
  return qr.toDataURL(url, { width: 512, margin: 3, errorCorrectionLevel: 'M' });
}
