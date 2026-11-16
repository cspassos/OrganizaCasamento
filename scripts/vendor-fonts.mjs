// Vendor Google Fonts for deterministic offline UI. Keep upstream license metadata.
import fs from 'node:fs/promises';
const url =
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Libre+Caslon+Display&family=Material+Symbols+Outlined:wght@300&display=swap';
await fs.mkdir('public/fonts', { recursive: true });
let css = await (await fetch(url, { signal: AbortSignal.timeout(15000) })).text();
if (!css.includes('@font-face')) throw new Error('Unexpected font response');
const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
let i = 0;
for (const font of urls) {
  const response = await fetch(font, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Font download failed');
  const filename = `font-${++i}.${new URL(font).pathname.split('.').pop()}`;
  await fs.writeFile(`public/fonts/${filename}`, Buffer.from(await response.arrayBuffer()));
  css = css.split(font).join(`/fonts/${filename}`);
}
await fs.writeFile('public/fonts/fonts.css', css);
console.log(`Vendored ${urls.length} font files.`);
for (const [name, source] of Object.entries({
  'DM-Sans-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt',
  'Libre-Caslon-Display-OFL.txt':
    'https://raw.githubusercontent.com/google/fonts/main/ofl/librecaslondisplay/OFL.txt',
  'Material-Symbols-LICENSE.txt':
    'https://raw.githubusercontent.com/google/material-design-icons/master/LICENSE',
})) {
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`License unavailable: ${source}`);
  await fs.writeFile(`public/fonts/${name}`, await response.text());
}
