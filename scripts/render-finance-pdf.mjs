import fs from 'node:fs/promises';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
const data = new Uint8Array(
  await fs.readFile(process.argv[2] ?? 'artifacts/etapa-03-relatorio.pdf'),
);
const pdf = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
let text = '';
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport, canvas }).promise;
  await fs.writeFile(
    `${process.argv[3] ?? 'artifacts/etapa-03-relatorio'}-pagina-${i}.png`,
    canvas.toBuffer('image/png'),
  );
  text += (await page.getTextContent()).items.map((item) => item.str ?? '').join(' ');
}
if (
  !text.includes('2.000,00') ||
  !text.includes(process.argv[2] ? 'Buffet detalhado' : 'Buffet completo')
)
  throw new Error('Os valores esperados não constam no relatório PDF.');
console.log(`PDF validado: ${pdf.numPages} página(s); conteúdo financeiro conferido.`);
