import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs/promises';

test('WhatsApp permite preparar o modelo em imagem ou PDF e baixar quando não há compartilhamento de arquivos', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
  });
  await setup(page);
  await design(page);
  await page.goto('/convites/whatsapp');
  await page.getByLabel('Pessoa da lista').fill('Maria');
  await page.getByRole('option').filter({ hasText: 'Maria Silva' }).click();
  await expect(page.locator('.whatsapp-invite-card oc-invitation-preview svg')).toBeVisible();
  await page.getByRole('button', { name: 'Preparar convite para envio', exact: true }).click();
  await expect(page.locator('.whatsapp-invite-card')).toContainText(
    'não oferece compartilhamento direto',
  );
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar convite para anexar', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('convite.png');
  await page.getByLabel('Formato do convite').selectOption('pdf');
  await expect(
    page.getByRole('button', { name: 'Baixar convite para anexar', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Preparar convite para envio', exact: true }).click();
  download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar convite para anexar', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('convite.pdf');
});

test('compartilhamento nativo recebe arquivo e mensagem; cancelar não registra envio', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data: ShareData) => !!data.files?.length,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (window as unknown as { shared: unknown }).shared = {
          name: data.files?.[0].name,
          type: data.files?.[0].type,
          size: data.files?.[0].size,
          text: data.text,
        };
      },
    });
  });
  await setup(page);
  await design(page);
  await page.goto('/convites/whatsapp');
  await page.getByLabel('Pessoa da lista').fill('Maria');
  await page.getByRole('option').filter({ hasText: 'Maria Silva' }).click();
  await page.getByRole('button', { name: 'Preparar convite para envio', exact: true }).click();
  await page.getByRole('button', { name: 'Compartilhar convite e mensagem', exact: true }).click();
  const shared = await page.evaluate(
    () =>
      (window as unknown as { shared: { name: string; type: string; size: number; text: string } })
        .shared,
  );
  expect(shared.name).toBe('convite.png');
  expect(shared.type).toBe('image/png');
  expect(shared.size).toBeGreaterThan(1000);
  expect(shared.text).toContain('Maria Silva');
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        throw new DOMException('cancel', 'AbortError');
      },
    }),
  );
  await page.getByRole('button', { name: 'Compartilhar convite e mensagem', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('cancelado');
  await page.goto('/pessoas/convidados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Editar Maria Silva', exact: true }).click();
  await expect.poll(() => sentFlag(page, 'Maria Silva')).toBe(false);
});
async function setup(page: Page) {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Casamento da etapa 05');
  await page.getByLabel('Nome completo da noiva').fill('Clara Oliveira');
  await page.getByLabel('Nome completo do noivo').fill('Lucas Santos');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/pessoas/convidados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByLabel('Enviar planilha preenchida', { exact: true }).setInputFiles({
    name: 'familia.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Nome;Telefone;Família;Criança;Idade\nMaria Silva;11999998888;Família Silva;Não;\nPedro Silva;;Família Silva;Sim;8',
    ),
  });
  await page.getByRole('button', { name: 'Confirmar importação', exact: true }).click();
  await expect(page.locator('.people-person')).toHaveCount(2);
}
async function design(page: Page) {
  await page.goto('/convites/modelos');
  await expect(page.locator('.invitation-model-card')).toHaveCount(8);
  await page.getByRole('link', { name: 'Personalizar Floral', exact: true }).click();
  await page.getByLabel('Nome deste convite').fill('Convite Jardim');
  await page.getByLabel('Data do casamento', { exact: true }).fill('20/09/2027');
  await page.getByLabel('Horário da cerimônia', { exact: true }).fill('16:00');
  await page.getByLabel('Local da cerimônia', { exact: true }).fill('Jardim das Oliveiras');
  await page.getByLabel('Endereço', { exact: true }).fill('Rua das Flores, 100 — São Paulo');
  await page.getByRole('button', { name: 'Salvar convite', exact: true }).click();
  await expect(page).toHaveURL(/convites\/modelos\/[^/]+\/editar$/);
}
async function issue(page: Page) {
  await page.goto('/convites/enviados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Criar convite para convidados', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Pessoa da lista').fill('Maria');
  await page.getByRole('option').filter({ hasText: 'Maria Silva' }).click();
  await expect(dialog).toContainText('Pedro Silva');
  await dialog.getByRole('button', { name: 'Criar convite', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.issued-invitation')).toHaveCount(1);
  return (await page
    .getByRole('link', { name: 'Simular confirmação', exact: true })
    .getAttribute('href')) as string;
}
test('editor persiste, exporta PNG/PDF e mantém prévia responsiva', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  await design(page);
  await page.reload();
  await expect(page.getByLabel('Nome deste convite')).toHaveValue('Convite Jardim');
  await page.getByText('Cores, foto e outros detalhes', { exact: true }).click();
  await page.getByLabel('Cor dos detalhes', { exact: true }).fill('#7b8a65');
  await page.getByLabel('Imagem de fundo (opcional)').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhWQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('oc-invitation-preview svg image')).toHaveAttribute(
    'href',
    /^data:image\/png;base64,/,
  );
  await page.getByRole('button', { name: 'Salvar convite', exact: true }).click();
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar imagem PNG', exact: true }).click();
  await (await download).saveAs('artifacts/etapa-05-convite.png');
  download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PDF', exact: true }).click();
  await (await download).saveAs('artifacts/etapa-05-convite.pdf');
  expect((await fs.readFile('artifacts/etapa-05-convite.pdf')).subarray(0, 4).toString()).toBe(
    '%PDF',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sidebar')).not.toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'artifacts/etapa-05-editor-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});
test('convite familiar, envio manual, RSVP parcial, QR e desativação persistem sem expor o menu', async ({
  page,
  browser,
}) => {
  await setup(page);
  await design(page);
  const link = await issue(page);
  await page.getByRole('button', { name: 'QR de teste', exact: true }).click();
  await expect(page.locator('.invitation-qr img')).toHaveAttribute('src', /^data:image\/png/);
  await page.getByRole('button', { name: 'Marcar como enviado', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('.issued-invitation')).toContainText('Envio registrado');
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto('http://127.0.0.1:4300' + link);
  await expect(other.getByRole('alert')).toContainText('não encontrado');
  await expect(other.locator('.sidebar')).toHaveCount(0);
  await fresh.close();
  await page.goto(link);
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await page.getByLabel('Maria Silva vai comparecer?').selectOption('yes');
  await page.getByLabel('Pedro Silva vai comparecer?').selectOption('no');
  await page.getByRole('button', { name: 'Salvar respostas de teste', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Respostas salvas');
  await page.reload();
  await expect(page.getByLabel('Maria Silva vai comparecer?')).toHaveValue('yes');
  await expect(page.getByLabel('Pedro Silva vai comparecer?')).toHaveValue('no');
  await page.screenshot({
    path: 'artifacts/etapa-05-rsvp.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.goto('/convites/confirmacoes');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await expect(page.locator('.people-status').filter({ hasText: 'Confirmado' })).toHaveCount(1);
  await expect(page.locator('.people-status').filter({ hasText: 'Não comparecerá' })).toHaveCount(
    1,
  );
  await page.goto('/convites/enviados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Desativar link', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Link desativado');
  await page.goto(link);
  await expect(page.getByRole('alert')).toContainText('desativado');
});
test('mensagem do WhatsApp é pessoal e não registra envio automaticamente', async ({ page }) => {
  await setup(page);
  await design(page);
  await page.goto('/convites/whatsapp');
  await page.getByLabel('Pessoa da lista').fill('Maria');
  await page.getByRole('option').filter({ hasText: 'Maria Silva' }).click();
  await page.getByLabel('O que deseja enviar?').selectOption('location');
  const url = new URL(
    (await page
      .getByRole('link', { name: 'Abrir WhatsApp com mensagem', exact: true })
      .getAttribute('href'))!,
  );
  expect(url.hostname).toBe('wa.me');
  expect(url.pathname).toBe('/5511999998888');
  expect(url.searchParams.get('text')).toContain('Maria Silva');
  expect(url.searchParams.get('text')).toContain('google.com/maps');
  expect(url.searchParams.get('text')).not.toContain('localhost');
  await page.goto('/pessoas/convidados');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Editar Maria Silva', exact: true }).click();
  await expect.poll(() => sentFlag(page, 'Maria Silva')).toBe(false);
});

async function sentFlag(page: Page, name: string) {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('organiza-casamento');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const ledgers = await new Promise<any[]>((resolve, reject) => {
      const r = db.transaction('people').objectStore('people').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return ledgers.flatMap((l) => l.guests).find((g) => g.name === name)?.invitationSent;
  }, name);
}
