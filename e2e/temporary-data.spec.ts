import { test, expect } from '@playwright/test';
test('massa temporária pode ser criada, editada e removida sem apagar casamento real', async ({
  page,
}) => {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Meu casamento real');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('João');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.getByText('Dados de teste (temporário)', { exact: true }).click();
  await page.getByRole('button', { name: 'Criar massa de teste', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remover massa de teste', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.page-heading')).toContainText('Clara e Lucas');
  await page.goto('/financeiro/despesas');
  await expect(page.getByText('Buffet — entrada paga e parcelas', { exact: true })).toBeVisible();
  await page.goto('/financeiro/contas');
  await expect(page.locator('main')).toContainText('Vencida');
  await page.goto('/pessoas/convidados');
  await expect(page.locator('.people-person')).toHaveCount(0);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Dados do casamento' }).click();
  await page.getByLabel('Nome do casamento', { exact: true }).fill('[TESTE] Nome alterado');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.reload();
  await page.getByText('Dados de teste (temporário)', { exact: true }).click();
  await page.getByRole('button', { name: 'Remover massa de teste', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Criar massa de teste', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.page-heading')).toContainText('Meu casamento real');
  await page.goto('/casamentos');
  await expect(page.locator('oc-collection-table tbody tr:has(button)')).toHaveCount(1);
  await expect(page.locator('oc-collection-table tbody tr:has(button)')).toContainText(
    'Meu casamento real',
  );
  await page.getByRole('button', { name: 'Criar massa de teste', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remover massa de teste', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/massa-temporaria.png', fullPage: true });
});
