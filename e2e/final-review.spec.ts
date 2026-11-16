import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
async function wedding(page: Page) {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Revisão do controle');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('João');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
async function addNames(page: Page, names: string) {
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  await page.getByLabel('Nomes dos convidados').fill(names);
  await page.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
}
async function pdfText(path: string) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({
    data: new Uint8Array(await fs.readFile(path)),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++)
    text += (await (await pdf.getPage(i)).getTextContent()).items
      .map((item: any) => item.str ?? '')
      .join(' ');
  const pages = pdf.numPages;
  await pdf.destroy();
  return { text, pages };
}
test('nomes repetidos exigem conferência, permitem corrigir a lista e aceitar homônimos', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/convidados');
  await addNames(page, 'José Silva');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await addNames(page, 'JOSE SILVA\nMaria Souza\nMaria Souza');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('nomes repetidos');
  await expect(
    dialog.getByRole('button', { name: 'Adicionar à lista', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.people-stats > div').first()).toContainText('1');
  await dialog.getByLabel('Nomes dos convidados').fill('Maria Souza');
  await dialog.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await addNames(page, 'Jose Silva');
  await dialog
    .getByRole('checkbox', {
      name: 'São pessoas diferentes. Quero adicionar todos os nomes.',
      exact: true,
    })
    .check();
  await dialog.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(3);
});
test('vencimento avança após pagar entrada e gasto cancelado não mostra dívida', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Descrição *', { exact: true }).fill('Buffet parcelado');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');
  await page.getByLabel('Valor total combinado *', { exact: true }).fill('12000');
  await page.getByLabel('Vencimento / data da entrada *', { exact: true }).fill('01/01/2020');
  await page.getByLabel('Entrada / sinal', { exact: true }).fill('2000');
  await page.getByLabel('Parcelas do restante', { exact: true }).fill('5');
  await page.getByLabel('Primeiro vencimento do restante', { exact: true }).fill('15/01/2027');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/financeiro/despesas');
  const buffet = page
    .locator('oc-collection-table tbody tr')
    .filter({ hasText: 'Buffet parcelado' });
  await expect(buffet).toContainText('15/01/2027');
  await expect(buffet).not.toContainText('01/01/2020');
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Descrição *', { exact: true }).fill('Gasto cancelado');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');
  await page.getByLabel('Valor total combinado *', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar despesa', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'não há valor a pagar' })).toBeVisible();
  await expect(
    page.locator('.finance-metrics > div').filter({ hasText: 'Falta pagar' }),
  ).toContainText('0,00');
  await expect(page.getByRole('button', { name: 'Registrar', exact: true })).toHaveCount(0);
  await page.reload();
  await page.goto('/financeiro/despesas');
  const cancelled = page
    .locator('oc-collection-table tbody tr')
    .filter({ hasText: 'Gasto cancelado' });
  await expect(cancelled.locator('td').nth(6)).toContainText('0,00');
  await expect(cancelled.locator('td').nth(2)).toHaveText('—');
});
test('PDFs incluem todos os filtrados, acentos e participações, com paginação para impressão', async ({
  page,
}) => {
  test.setTimeout(45000);
  await wedding(page);
  await page.goto('/pessoas/convidados');
  await addNames(
    page,
    [
      'João da Conceição',
      'Maria das Graças',
      ...Array.from({ length: 101 }, (_, i) => `Convidado ${String(i + 1).padStart(3, '0')}`),
    ].join('\n'),
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
  let download = page.waitForEvent('download');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Baixar PDF para imprimir', exact: true }).click();
  await (await download).saveAs('artifacts/lista-convidados.pdf');
  let pdf = await pdfText('artifacts/lista-convidados.pdf');
  expect(pdf.pages).toBeGreaterThan(1);
  expect(pdf.text).toContain('João da Conceição');
  expect(pdf.text).toContain('Convidado 101');
  expect(pdf.text).toContain('103 pessoa(s)');
  await page
    .getByRole('searchbox', { name: 'Pesquisar por nome', exact: true })
    .fill('Convidado 101');
  download = page.waitForEvent('download');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Baixar PDF para imprimir', exact: true }).click();
  await (await download).saveAs('artifacts/lista-convidados-filtrada.pdf');
  pdf = await pdfText('artifacts/lista-convidados-filtrada.pdf');
  expect(pdf.text).toContain('1 pessoa(s)');
  expect(pdf.text).not.toContain('João da Conceição');
  await page.getByRole('link', { name: 'Participações especiais', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar participação', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Pessoa da lista de convidados *')
    .fill('João da Conceição');
  await page.locator('mat-option').filter({ hasText: 'João da Conceição' }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Tipo de participação *', exact: true })
    .selectOption('Noivinho');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  download = page.waitForEvent('download');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Baixar PDF para imprimir', exact: true }).click();
  await (await download).saveAs('artifacts/participacoes-especiais.pdf');
  pdf = await pdfText('artifacts/participacoes-especiais.pdf');
  expect(pdf.text).toContain('João da Conceição');
  expect(pdf.text).toContain('Noivinho');
  expect(pdf.text).not.toContain('Convidado 101');
});
