import { test, expect } from '@playwright/test';

test('começa sem dados fictícios e permite cadastrar o próprio casamento', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(
    page.getByRole('link', { name: 'Cadastrar meu casamento', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/massa de teste|Dados de teste|Modo demonstração/i)).toHaveCount(0);
  await page.getByRole('link', { name: 'Cadastrar meu casamento', exact: true }).click();
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Ana e João');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('João');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/casamentos');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Ana e João');
  await expect(page.getByText(/massa de teste|Dados de teste|Modo demonstração/i)).toHaveCount(0);
});
