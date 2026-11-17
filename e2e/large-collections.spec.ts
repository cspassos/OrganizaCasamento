import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { unzipSync } from 'fflate';

async function setup(page: Page) {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Teste de listas grandes');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/pessoas/convidados');
  const csv =
    'Nome;Telefone;Família\n' +
    Array.from(
      { length: 125 },
      (_, i) =>
        `Pessoa ${String(i).padStart(3, '0')};119${String(i).padStart(8, '0')};Família ${String(Math.floor(i / 2)).padStart(3, '0')}`,
    ).join('\n');
  await page
    .getByLabel('Enviar planilha preenchida', { exact: true })
    .setInputFiles({ name: '125-pessoas.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Confirmar importação', exact: true }).click();
  await expect(page.locator('.import-feedback')).toContainText('125 pessoas importadas');
}

test('125 pessoas: paginação, busca, seleção entre páginas, atualização em lote e cadastro seguido', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  const list = page.locator('oc-collection-table');
  await page.getByRole('searchbox').fill('11900000124');
  await expect(list.locator('tbody tr')).toHaveCount(1);
  await expect(list).toContainText('Pessoa 124');
  await page.getByRole('searchbox').fill('');
  await expect(list.locator('tbody tr')).toHaveCount(25);
  await list.getByLabel('Por página').selectOption('100');
  await expect(list.locator('tbody tr')).toHaveCount(100);
  await list.getByRole('button', { name: 'Última', exact: true }).click();
  await expect(list.locator('tbody tr')).toHaveCount(25);
  await expect(list).toContainText('Pessoa 124');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(list.getByRole('spinbutton')).toHaveValue('2');
  await page.getByText('Filtros e outras opções', { exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar vários convidados', exact: true }).click();
  await list.getByRole('checkbox', { name: 'Selecionar esta página', exact: true }).check();
  await expect(list).toContainText('25 selecionados');
  await list.getByRole('button', { name: 'Primeira', exact: true }).click();
  await expect(
    list.getByRole('checkbox', { name: 'Selecionar Pessoa 000', exact: true }),
  ).not.toBeChecked();
  await list
    .getByRole('button', { name: 'Selecionar todos os 125 do filtro', exact: true })
    .click();
  await page.getByRole('searchbox').fill('Pessoa 124');
  await expect(list.locator('tbody tr')).toHaveCount(1);
  await expect(list).toContainText('125 selecionados');
  await page.getByLabel('Alterar confirmação dos selecionados').selectOption('Confirmado');
  await page.getByRole('button', { name: 'Aplicar a 125 pessoas', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '125 pessoas atualizadas' }),
  ).toBeVisible();
  await expect(list).toContainText('Confirmado');
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  if (page.url().includes('/pessoas/')) await page.locator('.people-list-options').waitFor();
  if (await page.locator('.people-list-options:not([open]) > summary').count())
    await page.locator('.people-list-options:not([open]) > summary').click();
  await page.getByRole('button', { name: 'Novo convidado', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome completo').fill('Cadastro em sequência A');
  await dialog.getByRole('button', { name: 'Salvar e adicionar outro', exact: true }).click();
  await expect(dialog.getByLabel('Nome completo')).toHaveValue('');
  await expect(dialog.getByRole('status')).toContainText('1 cadastro(s) salvo(s)');
  await dialog.getByLabel('Nome completo').fill('Cadastro em sequência B');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(list).toContainText('127 registros');
  await page.screenshot({ path: 'artifacts/lista-127-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/lista-127-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('lote cria 63 convites familiares, exporta ZIP e fila WhatsApp retoma após recarregar', async ({
  page,
}) => {
  test.setTimeout(45000);
  await setup(page);
  await page.goto('/convites/criar');
  await page.getByLabel('Nome deste convite').fill('Modelo para lote');
  await page.getByLabel('Data do casamento', { exact: true }).fill('20/09/2027');
  await page.getByLabel('Horário da cerimônia', { exact: true }).fill('16:00');
  await page.getByRole('button', { name: 'Salvar convite', exact: true }).click();
  await expect(page).toHaveURL(/\/editar$/);
  await page.goto('/convites/enviados');
  await page.getByRole('button', { name: 'Criar vários convites', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Selecionar todos os 63 do filtro', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Criar convites selecionados (63)', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Preparar 63 convites?' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('63 convites criados');
  const issues = page.locator('oc-collection-table');
  await issues.getByRole('button', { name: /Destinatário/ }).click();
  await issues.getByRole('checkbox', { name: 'Selecionar Família 000', exact: true }).check();
  await issues.getByRole('checkbox', { name: 'Selecionar Família 001', exact: true }).check();
  await page.getByRole('button', { name: 'Baixar imagens em ZIP', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Preparar ZIP', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Baixar ZIP', exact: true })).toBeVisible({
    timeout: 20000,
  });
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Baixar ZIP', exact: true }).click();
  const zip = unzipSync(await fs.readFile((await (await download).path())!));
  expect(Object.keys(zip)).toHaveLength(2);
  expect(Object.keys(zip).some((name) => name.includes('Família 000'))).toBe(true);
  for (const file of Object.values(zip)) expect([...file.slice(0, 4)]).toEqual([137, 80, 78, 71]);
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.goto('/convites/whatsapp');
  const batch = page.locator('oc-whatsapp-batch');
  await page.locator('.invitation-batch-options > summary').click();
  await batch
    .getByRole('combobox', { name: 'Modelo do convite', exact: true })
    .selectOption({ label: 'Modelo para lote' });
  await batch.getByRole('checkbox', { name: 'Selecionar esta página', exact: true }).check();
  await batch
    .getByRole('button', { name: 'Selecionar todos os 125 do filtro', exact: true })
    .click();
  await expect(batch).toContainText('63 conversas serão preparadas');
  await batch.getByRole('button', { name: 'Preparar fila de 63 conversas', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(batch).toContainText('63 pendentes');
  await page.reload();
  await expect(batch).toContainText('0 de 63 concluídos');
  await expect(
    batch.getByRole('link', { name: 'Abrir conversa no WhatsApp', exact: true }),
  ).toHaveAttribute('href', /wa\.me\/55119/);
  await batch
    .getByRole('button', { name: 'Já enviei — registrar e ir ao próximo', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(batch).toContainText('1 de 63 concluídos');
  await page.reload();
  await expect(batch).toContainText('1 de 63 concluídos');
  await page.screenshot({ path: 'artifacts/whatsapp-fila-63.png', fullPage: true });
  await page.goto('/pessoas/convidados');
  await page.getByRole('searchbox').fill('Família 000');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(2);
  await expect(page.locator('oc-collection-table tbody tr').first()).toContainText(
    'Aguardando confirmação',
  );
});

test('famílias localizam integrantes e despesas permitem salvar em sequência sem repetir valores', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/pessoas/familias');
  await page.getByRole('searchbox').fill('Pessoa 124');
  const families = page.locator('oc-collection-table').first();
  await expect(families.locator('tbody tr')).toHaveCount(1);
  await expect(families).toContainText('Família 062');
  await families.getByRole('button', { name: /Ações de/ }).click();
  await page.getByRole('menuitem', { name: 'Ver integrantes', exact: true }).click();
  const members = page.locator('oc-collection-table').last();
  await expect(members).toContainText('Pessoa 124');
  await members.getByRole('button', { name: /Ações de/ }).click();
  await page.getByRole('menuitem', { name: 'Editar pessoa', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Nome completo')).toHaveValue('Pessoa 124');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Descrição *', { exact: true }).fill('Primeira despesa sequencial');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');

  await page.getByLabel('Valor total combinado *', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Salvar e adicionar outro', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Despesa salva');
  await expect(page.getByLabel('Descrição *', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Valor total combinado *', { exact: true })).toHaveValue(/0,00/);
  await page.getByLabel('Descrição *', { exact: true }).fill('Segunda despesa sequencial');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');

  await page.getByLabel('Valor total combinado *', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page).toHaveURL(/financeiro\/despesas\/[a-f\d-]{36}$/);
  await page.goto('/financeiro/despesas');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(2);
  await page.getByRole('searchbox').fill('Primeira despesa');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
});
