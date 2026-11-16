import { test, expect } from '@playwright/test';
test('paid installments show Pago and remain available for refunds', async ({ page }) => {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Teste de parcela paga');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('João');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Descrição *', { exact: true }).fill('Buffet');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('contracted');
  await page.getByLabel('Valor total combinado *', { exact: true }).fill('12000');
  await page.getByLabel('Entrada / sinal').fill('2000');
  await page.getByLabel('Parcelas do restante').fill('5');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalhes da despesa', exact: true }),
  ).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Valor *', { exact: true }).fill('2000');
    await page.getByRole('dialog').getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  const paid = page.locator('.bill-row').filter({ has: page.locator('.paid-pill') });
  await expect(paid).toHaveCount(2);
  await expect(paid.getByRole('button', { name: 'Registrar', exact: true })).toHaveCount(0);
  await expect(page.locator('.finance-metrics')).toContainText('8.000,00');
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  const dialog = page.getByRole('dialog'),
    select = dialog.getByLabel('Parcela', { exact: true });
  await expect(select.locator('option:disabled')).toHaveCount(2);
  await expect(select.locator('option:checked')).toContainText('Parcela 2/5');
  await dialog.getByText('Desconto, juros ou devolução (opcional)', { exact: true }).click();
  await dialog.getByLabel('Operação', { exact: true }).selectOption('refund');
  await expect(select.locator('option:disabled')).toHaveCount(0);
  const entryId = await select.locator('option').first().getAttribute('value');
  await select.selectOption(entryId!);
  await expect(dialog.getByLabel('Pagamento original').locator('option')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page
    .locator('.bill-row')
    .first()
    .screenshot({ path: 'artifacts/etapa-03-parcela-paga.png' });
});
