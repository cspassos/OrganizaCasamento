import { test, expect } from '@playwright/test';
test('calendário e data digitada funcionam no cadastro simplificado sem campos de decoração', async ({
  page,
}) => {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Data do casamento');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('João');
  await page.getByLabel('Data do casamento').fill('07082027');
  await page.getByLabel('Horário da cerimônia').focus();
  await expect(page.getByLabel('Data do casamento')).toHaveValue('07/08/2027');
  await page.getByRole('button', { name: 'Abrir calendário', exact: true }).click();
  await expect(page.locator('mat-calendar')).toBeVisible();
  await page.getByRole('button', { name: '08/08/2027', exact: true }).click();
  await expect(page.getByLabel('Estilo do casamento')).toHaveCount(0);
  await expect(page.getByLabel('Paleta de cores')).toHaveCount(0);
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await expect(page.locator('.page-heading')).toContainText('08/08/2027');
  await page.reload();
  await page.getByRole('link', { name: 'Dados do casamento', exact: true }).click();
  await expect(page.getByLabel('Data do casamento')).toHaveValue('08/08/2027');
});
