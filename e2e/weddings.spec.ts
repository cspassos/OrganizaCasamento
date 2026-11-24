import { test, expect, Page } from '@playwright/test';
async function create(page: Page, name = 'Ana & Lucas', budget = '80000') {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill(name);
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByLabel('Orçamento inicial (R$)').fill(budget);
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
async function action(page: Page, name: string) {
  await page
    .locator('oc-collection-table tbody tr')
    .getByRole('button', { name: /Ações de/ })
    .click();
  await page.getByRole('menuitem', { name, exact: true }).click();
}
test('consulta versões do planejamento após recarregar e arquivar o casamento', async ({
  page,
}) => {
  await create(page);
  await page.goto('/casamentos');
  await action(page, 'Editar');
  await page.getByRole('link', { name: 'Histórico do planejamento' }).click();
  await expect(page.getByText('Ainda não há versões anteriores.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Editar casamento' }).click();
  await page.getByLabel('Nome completo da noiva').fill('Ana Ferreira');
  await page.getByLabel('Orçamento inicial (R$)').fill('90000');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);

  await page.goto('/casamentos');
  await action(page, 'Arquivar');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('button', { name: /Ver arquivados/ }).click();
  await action(page, 'Histórico do planejamento');
  await expect(page).toHaveURL(/\/planejamento\/historico$/);
  await page.reload();
  const current = page.locator('details').filter({ hasText: 'Planejamento atual' });
  await expect(current).toContainText('Ana Ferreira');
  await expect(current).toContainText('90.000,00');
  const previous = page.locator('details').filter({ hasText: 'Versão anterior' });
  await expect(previous).toHaveCount(1);
  await previous.locator('summary').click();
  await expect(previous.getByText('Ana', { exact: true })).toBeVisible();
  await expect(previous).toContainText('80.000,00');
});
test('casamentos independentes preservam orçamento, edição e seleção ao recarregar', async ({
  page,
}) => {
  await create(page);
  await page.getByRole('link', { name: 'Dados do casamento', exact: true }).click();
  await page.getByLabel('Nome completo da noiva').fill('Ana Ferreira Santos');
  await page.getByLabel('Orçamento inicial (R$)').fill('90000');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await create(page, 'Beatriz & Lucas', '45000');
  await page.getByLabel('Casamento selecionado').selectOption({ label: 'Ana & Lucas' });
  await expect(page.locator('.stats-grid')).toContainText('90.000,00');
  await page.reload();
  await expect(page.getByLabel('Casamento selecionado').locator('option:checked')).toHaveText(
    'Ana & Lucas',
  );
  await page.getByRole('link', { name: 'Dados do casamento', exact: true }).click();
  await expect(page.getByLabel('Nome completo da noiva')).toHaveValue('Ana Ferreira Santos');
  await page.getByRole('link', { name: 'Cancelar', exact: true }).click();
  await page.goto('/dashboard');
  await page.getByLabel('Casamento selecionado').selectOption({ label: 'Beatriz & Lucas' });
  await expect(page.locator('.stats-grid')).toContainText('45.000,00');
});
test('valida obrigatórios, confirma descarte e arquiva sem apagar o casamento', async ({
  page,
}) => {
  await page.goto('/casamentos/novo');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Revise os campos');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Teste de arquivo');
  await page.getByRole('link', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Descartar');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/casamentos');
  await action(page, 'Arquivar');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('oc-collection-table tbody tr:has(button)')).toHaveCount(0);
  await page.getByRole('button', { name: /Ver arquivados/ }).click();
  await action(page, 'Restaurar');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('button', { name: /Ver ativos/ }).click();
  await expect(page.locator('oc-collection-table tbody tr')).toContainText('Teste de arquivo');
});
test('foto opcional valida arquivo e preserva a imagem na edição em celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/casamentos/novo');
  await page.getByText('Foto dos noivos (opcional)', { exact: true }).click();
  const input = page.getByLabel('Foto dos noivos');
  await input.setInputFiles({
    name: 'invalido.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('inválido'),
  });
  await expect(page.getByRole('alert')).toContainText('JPG, PNG ou WebP');
  await input.setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhWQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByAltText('Prévia da foto dos noivos')).toBeVisible();
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Foto');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.reload();
  await page.getByRole('link', { name: 'Dados do casamento', exact: true }).click();
  await page.getByText('Foto dos noivos (opcional)', { exact: true }).click();
  await expect(page.getByAltText('Prévia da foto dos noivos')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('formulário escuro em 320px descarta mudanças e trata cadastro inexistente', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await create(page, 'Um nome comprido para testar o casamento', '999999999.99');
  await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click();
  await page.getByRole('link', { name: 'Dados do casamento', exact: true }).click();
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Não salvar');
  await page.getByRole('link', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.goto('/dashboard');
  await expect(page.locator('.page-heading')).not.toContainText('Não salvar');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/casamentos/inexistente/editar');
  await expect(page.getByRole('heading', { name: 'Casamento indisponível' })).toBeVisible();
});
test('exclusão definitiva pede confirmação, apaga vínculos e mantém o outro casamento', async ({
  page,
}) => {
  await create(page, 'Manter este casamento');
  await create(page, 'Excluir este casamento');
  await page.goto('/financeiro/despesas/nova');
  await page
    .getByLabel('Fornecedor ou quem vai receber *', { exact: true })
    .fill('Fornecedor do casamento excluído');
  await page.getByLabel('Descrição *', { exact: true }).fill('Gasto que será removido');
  await page.getByLabel('Valor total combinado *', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalhes da despesa', exact: true }),
  ).toBeVisible();
  await page.goto('/pessoas/convidados');
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  await page.getByLabel('Nomes dos convidados').fill('Convidado do casamento excluído');
  await page.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const id = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((r) => {
      const q = indexedDB.open('organiza-casamento');
      q.onsuccess = () => r(q.result);
    });
    const records = await new Promise<any[]>((r) => {
      const q = db.transaction('weddings').objectStore('weddings').getAll();
      q.onsuccess = () => r(q.result);
    });
    db.close();
    return records.find((w) => w.name === 'Excluir este casamento').id as string;
  });
  await page.goto('/casamentos');
  const row = page
    .locator('oc-collection-table tbody tr')
    .filter({ hasText: 'Excluir este casamento' });
  await row.getByRole('button', { name: /Ações de/ }).click();
  await page.getByRole('menuitem', { name: 'Excluir definitivamente', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Não será possível desfazer');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /Ações de/ }).click();
  await page.getByRole('menuitem', { name: 'Excluir definitivamente', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir definitivamente', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('excluídos definitivamente');
  await expect(row).toHaveCount(0);
  await expect(page.getByLabel('Casamento selecionado').locator('option:checked')).toHaveText(
    'Manter este casamento',
  );
  const deleted = await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((r) => {
      const q = indexedDB.open('organiza-casamento');
      q.onsuccess = () => r(q.result);
    });
    const values = await Promise.all(
      ['weddings', 'finance', 'people', 'invitations', 'suppliers'].map(
        (name) =>
          new Promise((r) => {
            const q = db.transaction(name).objectStore(name).get(id);
            q.onsuccess = () => r(q.result ?? null);
          }),
      ),
    );
    db.close();
    return values;
  }, id);
  expect(deleted).toEqual([null, null, null, null, null]);
  await page.reload();
  await expect(page.locator('oc-collection-table')).not.toContainText('Excluir este casamento');
  await action(page, 'Arquivar');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('button', { name: /Ver arquivados/ }).click();
  await page.getByRole('button', { name: 'Cartões com foto', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir definitivamente', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('excluídos definitivamente');
  await page.reload();
  await expect(page.getByLabel('Casamento selecionado')).toHaveCount(0);
});
