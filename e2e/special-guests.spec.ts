import { test, expect } from '@playwright/test';

test('participações especiais usam o mesmo convidado sem duplicar pessoas e permitem buscar e remover só a participação', async ({
  page,
}) => {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Participações simples');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/pessoas/convidados');
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  await page.getByLabel('Nomes dos convidados').fill('Maria Souza\nPedro Souza\nClara Silva');
  await page.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Participações especiais', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Participações especiais', exact: true }),
  ).toBeVisible();
  for (const [name, role] of [
    ['Maria Souza', 'Madrinha'],
    ['Pedro Souza', 'Noivinho'],
    ['Clara Silva', 'Debutante'],
  ]) {
    await page.getByRole('button', { name: 'Adicionar participação', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Pessoa da lista de convidados *', { exact: true }).fill(name);
    await page.locator('mat-option').filter({ hasText: name }).click();
    const type = dialog.getByRole('combobox', { name: 'Tipo de participação *', exact: true });
    await expect(type.locator('option')).toContainText([
      'Padrinho',
      'Madrinha',
      'Debutante',
      'Noivinho',
      'Noivinha',
      'Daminha',
      'Pajem',
    ]);
    await type.selectOption(role);
    await expect(dialog.getByLabel('Modelo do traje', { exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(3);
  await page.getByRole('searchbox', { name: 'Pesquisar por nome' }).fill('Noivinho');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
  await expect(page.locator('oc-collection-table')).toContainText('Pedro Souza');
  await page.getByRole('searchbox', { name: 'Pesquisar por nome' }).fill('');
  const maria = page.locator('oc-collection-table tbody tr').filter({ hasText: 'Maria Souza' });
  await maria.getByRole('button', { name: 'Ações de Maria Souza', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Editar pessoa e confirmação', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Confirmação', exact: true })
    .selectOption('Confirmado');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(maria).toContainText('Confirmado');
  await page.reload();
  await expect(maria).toContainText('Madrinha');
  await maria.getByRole('button', { name: 'Ações de Maria Souza', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Remover participação', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(2);
  await page.getByRole('link', { name: 'Convidados', exact: true }).last().click();
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(3);
  await expect(
    page.locator('oc-collection-table tbody tr').filter({ hasText: 'Maria Souza' }),
  ).toContainText('Confirmado');
});
