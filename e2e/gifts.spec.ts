import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
async function wedding(page: Page, name = 'Presentes de Ana e Lucas') {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill(name);
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
function photo() {
  const canvas = createCanvas(640, 420),
    c = canvas.getContext('2d');
  c.fillStyle = '#f3ede0';
  c.fillRect(0, 0, 640, 420);
  c.fillStyle = '#64765b';
  c.fillRect(180, 100, 280, 220);
  c.fillStyle = '#c5a468';
  c.fillRect(300, 80, 40, 260);
  c.fillRect(160, 150, 320, 30);
  return canvas.toBuffer('image/png');
}
async function add(page: Page, name: string) {
  await page.getByRole('button', { name: 'Adicionar presente', exact: true }).click();
  await page.getByLabel('Nome do presente *', { exact: true }).fill(name);
}
test('presentes com foto, listas de lojas, recebidos, PDF completo e isolamento', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/presentes');
  await expect(
    page.getByRole('button', { name: 'Compartilhar lista', exact: true }),
  ).toBeDisabled();
  await add(page, 'Jogo de panelas em aço');
  await page.getByLabel('Quantidade que queremos', { exact: true }).fill('3');
  await page
    .getByLabel('Descrição (opcional)', { exact: true })
    .fill(
      'Jogo de panelas em aço\nCinco peças para os nossos primeiros almoços em família. Preferimos aço inox.\nCinco peças para os nossos primeiros almoços em família. Preferimos aço inox.',
    );
  await page.getByLabel('Preço aproximado (opcional)', { exact: true }).fill('299.90');
  await page
    .getByLabel('Link para comprar (opcional)', { exact: true })
    .fill('javascript:alert(1)');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('link válido');
  await page
    .getByLabel('Link para comprar (opcional)', { exact: true })
    .fill('https://loja.example.com/panelas');
  await page
    .getByLabel('Foto do presente', { exact: true })
    .setInputFiles({ name: 'presente.png', mimeType: 'image/png', buffer: photo() });
  await expect(page.getByRole('dialog').getByAltText('Foto do presente')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByAltText('Jogo de panelas em aço')).toBeVisible();
  await page
    .locator('.gift-card')
    .filter({ hasText: 'Jogo de panelas em aço' })
    .getByRole('button', { name: 'Registrar 1 recebido', exact: true })
    .click();
  await add(page, 'Presente que já recebemos');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const received = page.locator('.gift-card').filter({ hasText: 'Presente que já recebemos' });
  await received.getByRole('button', { name: 'Registrar 1 recebido', exact: true }).click();
  await expect(received).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Vincular lista de loja', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByAltText('Jogo de panelas em aço')).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((r) => {
      const q = indexedDB.open('organiza-casamento');
      q.onsuccess = () => r(q.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('gifts', 'readwrite'),
        store = tx.objectStore('gifts'),
        q = store.getAll();
      q.onsuccess = () => {
        const list = q.result[0],
          original = list.items[0];
        // Previously saved shop lists remain accessible after removing the creation shortcut.
        list.sites.push({
          id: crypto.randomUUID(),
          name: 'Nossa lista na loja',
          url: 'https://loja.example.com/lista-ana-lucas',
        });
        for (let n = 1; n <= 6; n++)
          list.items.push({
            ...original,
            id: crypto.randomUUID(),
            name: `Presente de teste ${n}`,
            description:
              'Uma sugestão para a nossa casa, com os detalhes combinados e as cores que escolhemos. '.repeat(
                5,
              ),
          });
        store.put(list);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator('.gift-card')).toHaveCount(7);
  await page.screenshot({
    path: 'artifacts/presentes-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Compartilhar lista', exact: true }).click();
  await (await download).saveAs('artifacts/lista-de-presentes.pdf');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({
    data: new Uint8Array(await fs.readFile('artifacts/lista-de-presentes.pdf')),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  let text = '',
    links: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const p = await pdf.getPage(n);
    text += (await p.getTextContent()).items.map((i: any) => i.str ?? '').join(' ');
    links.push(...(await p.getAnnotations()).filter((a: any) => a.url).map((a: any) => a.url));
  }
  expect(pdf.numPages).toBeGreaterThan(1);
  expect(text).toContain('Jogo de panelas em aço');
  expect(text.match(/Jogo de panelas em aço/g)).toHaveLength(1);
  expect(text.match(/Cinco peças para os nossos primeiros almoços/g)).toHaveLength(1);
  expect(text).toContain('Presente de teste 6');
  expect(text).not.toContain('Presente que já recebemos');
  expect(links).toContain('https://loja.example.com/panelas');
  expect(links).toContain('https://loja.example.com/lista-ana-lucas');
  expect(text).toContain('Clique para ver na loja');
  expect(text).toContain('Quantidade que falta receber: 2');
  expect(text).toContain('Clique para abrir a lista na loja');
  // Product title, photo and button all open the actual product address.
  expect(
    links.filter((url) => url === 'https://loja.example.com/panelas').length,
  ).toBeGreaterThanOrEqual(3);
  await pdf.destroy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Adicionar presente', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: 'artifacts/presentes-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await wedding(page, 'Outro casamento');
  await page.goto('/presentes');
  await expect(page.locator('.gift-card')).toHaveCount(0);
  await page
    .getByLabel('Casamento selecionado')
    .selectOption({ label: 'Presentes de Ana e Lucas' });
  await expect(page.locator('.gift-card')).toHaveCount(7);
});
test('compartilhamento cancelado não registra envio e arquivamento bloqueia gravação', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/presentes');
  await add(page, 'Vaso de flores');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => Promise.reject(new DOMException('Cancelado', 'AbortError')),
    });
  });
  await page.getByRole('button', { name: 'Compartilhar lista', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Compartilhar lista', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Adicionar presente', exact: true }).click();
  await page.getByLabel('Nome do presente *', { exact: true }).fill('Não deve salvar');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((r) => {
      const q = indexedDB.open('organiza-casamento');
      q.onsuccess = () => r(q.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('weddings', 'readwrite'),
        store = tx.objectStore('weddings'),
        q = store.getAll();
      q.onsuccess = () => store.put({ ...q.result[0], archived: true });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('arquivado ou excluído');
});

test('quantidades parciais, listas de recebidos e correção persistem', async ({ page }) => {
  await wedding(page);
  await page.goto('/presentes');
  await add(page, 'Toalhas');
  await page.getByLabel('Quantidade que queremos', { exact: true }).fill('3');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  const card = page.locator('.gift-card').filter({ hasText: 'Toalhas' });
  await card.getByRole('button', { name: 'Registrar 1 recebido', exact: true }).click();
  await expect(card).toContainText('Recebemos 1 de 3');
  await expect(card).toContainText('Faltam 2');
  await page.reload();
  await page.getByRole('button', { name: 'Já recebidos', exact: true }).click();
  await expect(card).toContainText('Recebemos 1 de 3');
  await page.getByRole('button', { name: 'Falta receber', exact: true }).click();
  await card.getByRole('button', { name: 'Registrar 1 recebido', exact: true }).click();
  await expect(card).toContainText('Recebemos 2 de 3');
  await card.getByRole('button', { name: 'Registrar 1 recebido', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Já recebidos', exact: true }).click();
  await expect(card).toContainText('Quantidade desejada completa');
  await card.getByRole('button', { name: 'Editar Toalhas', exact: true }).click();
  await page.getByLabel('Quantidade que queremos', { exact: true }).fill('5');
  await page.getByLabel('Quantidade já recebida', { exact: true }).fill('2');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByRole('button', { name: 'Falta receber', exact: true }).click();
  await expect(card).toContainText('Recebemos 2 de 5');
  await expect(card).toContainText('Faltam 3');
  await page.reload();
  await expect(card).toContainText('Recebemos 2 de 5');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.screenshot({ path: 'artifacts/presentes-quantidades-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
