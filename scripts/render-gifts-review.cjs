const { chromium } = require('@playwright/test');
const fs = require('fs');
const http = require('http');
(async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.end('<html><body></body></html>');
      return;
    }
    const name =
      req.url === '/document.pdf'
        ? process.argv[2] || 'artifacts/lista-de-presentes.pdf'
        : req.url === '/pdf.mjs'
          ? 'node_modules/pdfjs-dist/build/pdf.mjs'
          : 'node_modules/pdfjs-dist/build/pdf.worker.mjs';
    res.setHeader(
      'Content-Type',
      name.endsWith('.pdf') ? 'application/pdf' : 'application/javascript',
    );
    res.end(fs.readFileSync(name));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const result = await page.evaluate(async () => {
      const lib = await import('/pdf.mjs');
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
      const pdf = await lib.getDocument('/document.pdf').promise;
      const images = [];
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i),
          v = p.getViewport({ scale: 1.3 }),
          c = document.createElement('canvas');
        c.width = Math.ceil(v.width);
        c.height = Math.ceil(v.height);
        await p.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
        text += (await p.getTextContent()).items.map((i) => i.str ?? '').join('\n') + '\n';
        images.push(c.toDataURL('image/png').split(',')[1]);
      }
      return { images, text };
    });
    result.images.forEach((data, i) =>
      fs.writeFileSync(
        (process.argv[3] || 'artifacts/presentes-pdf-page-') + (i + 1) + '.png',
        Buffer.from(data, 'base64'),
      ),
    );
    fs.writeFileSync(
      (process.argv[3] || 'artifacts/presentes-pdf-page-') + 'text.txt',
      result.text,
    );
    console.log(result.images.length + ' pages rendered');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
