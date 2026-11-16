import fs from 'node:fs/promises';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
for (const file of process.argv.slice(2)) {
  const pdf = await getDocument({
    data: new Uint8Array(await fs.readFile(file)),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i),
      viewport = page.getViewport({ scale: 1.3 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport, canvas }).promise;
    await fs.writeFile(file.replace(/\.pdf$/i, `-pagina-${i}.png`), canvas.toBuffer('image/png'));
    text += (await page.getTextContent()).items.map((i) => i.str ?? '').join(' ') + '\n';
  }
  await fs.writeFile(file.replace(/\.pdf$/i, '.txt'), text, 'utf8');
  console.log(`${file}: ${pdf.numPages} páginas renderizadas`);
  await pdf.destroy();
}
