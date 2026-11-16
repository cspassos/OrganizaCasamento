import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const file = process.argv[2] ?? 'artifacts/etapa-05-convite.pdf';
const bytes = await fs.readFile(file);
const module = await fs.readFile('node_modules/pdfjs-dist/build/pdf.mjs');
const worker = await fs.readFile('node_modules/pdfjs-dist/build/pdf.worker.mjs');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:4999/qa/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      contentType: path.endsWith('.mjs') ? 'text/javascript' : 'text/html',
      body: path.endsWith('pdf.worker.mjs')
        ? worker
        : path.endsWith('pdf.mjs')
          ? module
          : '<html><body><canvas id="canvas"></canvas></body></html>',
    });
  });
  await page.goto('http://127.0.0.1:4999/qa/');
  const result = await page.evaluate(async (data) => {
    const pdfjs = await import('/qa/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/qa/pdf.worker.mjs';
    const pdf = await pdfjs.getDocument({
      data: Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
      isEvalSupported: false,
    }).promise;
    const sheet = await pdf.getPage(1),
      mm = sheet.view.slice(2).map((n) => (n * 25.4) / 72),
      viewport = sheet.getViewport({ scale: 2 });
    const canvas = document.querySelector('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await sheet.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return { pages: pdf.numPages, mm, png: canvas.toDataURL('image/png') };
  }, bytes.toString('base64'));
  if (result.pages !== 1 || Math.abs(result.mm[0] - 140) > 1 || Math.abs(result.mm[1] - 200) > 1)
    throw new Error('Dimensões inesperadas do convite.');
  await fs.writeFile(
    'artifacts/etapa-05-pdf-pagina-1.png',
    Buffer.from(result.png.split(',')[1], 'base64'),
  );
  console.log(
    'PDF verificado: uma página, 14 x 20 cm; renderização em artifacts/etapa-05-pdf-pagina-1.png.',
  );
} finally {
  await browser.close();
}
