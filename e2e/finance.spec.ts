import { test, expect, Page } from '@playwright/test';
async function wedding(page: Page, name = 'Ana & Lucas') {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill(name);
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByLabel('Orçamento inicial (R$)').fill('20000');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function expense(page: Page, status = 'contracted') {
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Descrição *', { exact: true }).fill('Buffet completo');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');
  await page
    .getByRole('combobox', { name: 'Categoria *', exact: true })
    .selectOption({ label: 'Buffet' });
  await page.getByText('Contrato, comprovante e observações (opcional)', { exact: true }).click();
  await page.getByLabel('Fornecedor ou quem vai receber *', { exact: true }).fill('Sabor & Festa');
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption(status);
  if (status === 'planned')
    await page.getByLabel('Valor estimado *', { exact: true }).fill('13000');
  if (status === 'contracted') {
    await page.getByLabel('Valor total combinado *', { exact: true }).fill('12000');
    await page.getByLabel('Entrada / sinal', { exact: true }).fill('2000');
    await page.getByLabel('Parcelas do restante').fill('5');
    await page.getByLabel('Primeiro vencimento do restante').fill('31/01/2027');
  }
  if (status === 'contracted')
    await page.getByLabel('Vencimento / data da entrada *', { exact: true }).fill('01/01/2020');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalhes da despesa', exact: true }),
  ).toBeVisible();
}
async function operation(page: Page, amount: string, kind = 'payment') {
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Desconto, juros ou devolução (opcional)', { exact: true }).click();
  await dialog.getByLabel('Operação', { exact: true }).selectOption(kind);
  if (kind === 'refund')
    await dialog.getByLabel('Pagamento original', { exact: true }).selectOption({ index: 1 });
  await dialog.getByLabel('Valor *', { exact: true }).fill(amount);
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  return dialog;
}
test('contracts, installments, partial payment, overpayment, refund, reversal and persistence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await wedding(page);
  await expense(page);
  const expenseUrl = page.url();
  await expect(page.locator('.bill-row.overdue-row')).toHaveCount(1);
  await expect(page.locator('.bill-row.overdue-row .danger-pill')).toHaveText('Vencida');
  await expect(page.locator('.bill-row')).toHaveCount(6);
  await expect(page.locator('.finance-metrics')).toContainText('12.000,00');
  await operation(page, '500');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.finance-metrics')).toContainText('11.500,00');
  const invalid = await operation(page, '2000');
  await expect(invalid.getByRole('alert')).toContainText('saldo');
  await invalid.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await operation(page, '100', 'discount');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await operation(page, '200', 'refund');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.finance-metrics')).toContainText('11.600,00');
  const refund = page.locator('.transaction-row').filter({ hasText: 'Devolução de pagamento' });
  await refund.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await page.getByLabel('Motivo *', { exact: true }).fill('Registro duplicado');
  await expect(page.getByLabel('Motivo *', { exact: true })).toHaveCSS('min-height', '165px');
  await page.getByRole('dialog').evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  await page.getByRole('dialog').screenshot({ path: 'artifacts/etapa-03-motivo-destacado.png' });
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(refund).toHaveClass(/voided/);
  await expect(page.locator('.finance-metrics')).toContainText('11.400,00');
  await page.reload();
  await expect(page.locator('.bill-row')).toHaveCount(6);
  await expect(page.locator('.finance-metrics')).toContainText('11.400,00');
  await page.goto('/financeiro/orcamento');
  await expect(page.locator('.finance-summary')).toContainText('11.900,00');
  await expect(page.locator('.finance-summary')).toContainText('500,00');
  await page.goto('/dashboard');
  await expect(page.locator('.stats-grid')).toContainText('11.400,00');
  await page.goto('/financeiro/contas');
  await page.getByLabel('Filtrar contas').selectOption('overdue');
  await expect(page.locator('.collection-table tbody tr:has(button)')).toContainText('Entrada');
  await page.screenshot({ path: 'artifacts/etapa-03-contas-desktop.png', fullPage: true });
  await page.goto('/financeiro/pagamentos');
  await expect(page.locator('canvas')).toHaveCount(2);
  await page.screenshot({ path: 'artifacts/etapa-03-pagamentos-desktop.png', fullPage: true });
  await wedding(page, 'Outro casamento');
  await page.goto('/financeiro/despesas');
  await expect(page.locator('.collection-table tbody tr:has(button)')).toHaveCount(0);
  await page.getByLabel('Casamento selecionado').selectOption({ label: 'Ana & Lucas' });
  await expect(page.locator('.collection-table tbody tr:has(button)')).toContainText(
    'Buffet completo',
  );
  await page.goto(expenseUrl);
  await expect(page.locator('.finance-metrics')).toContainText('11.400,00');
  expect(errors).toEqual([]);
});
test('budget categories, planned expense, cancelled expense and report exports', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/financeiro/orcamento');
  await page.getByLabel('Orçamento geral *', { exact: true }).fill('22000');
  await page.getByLabel('Reserva para imprevistos', { exact: true }).fill('2000');
  await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Orçamento geral atualizado');
  await page.getByText('Organizar o orçamento por categoria (opcional)', { exact: true }).click();
  await page.getByLabel('Nome da categoria *', { exact: true }).fill('Lua de mel');
  await page.getByLabel('Orçamento da categoria *', { exact: true }).fill('3000');
  await page.getByRole('button', { name: 'Salvar categoria', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Categoria salva');
  await expense(page, 'planned');
  await expect(page.locator('.bill-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancelar despesa', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('.pill').filter({ hasText: 'Cancelada' })).toBeVisible();
  await expense(page);
  await operation(page, '2000');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/financeiro/relatorios');
  await page.getByLabel('Relatório', { exact: true }).selectOption('payments');
  await expect(page.locator('.report-preview')).toContainText('2.000,00');
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar planilha', exact: true }).click();
  await (await csv).saveAs('artifacts/etapa-03-relatorio.csv');
  const pdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PDF', exact: true }).click();
  await (await pdf).saveAs('artifacts/etapa-03-relatorio.pdf');
  await page.screenshot({ path: 'artifacts/etapa-03-relatorios-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/etapa-03-relatorios-mobile.png', fullPage: true });
});
test('mobile finance forms and accounts remain within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await wedding(page);
  await expense(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/etapa-03-despesa-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Pagar saldo restante', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Valor *', { exact: true })).toHaveValue(
    /12\.000,00/,
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.pill').filter({ hasText: 'Paga' })).toBeVisible();
});

test('two payments update budget and history in other open tabs', async ({ page, context }) => {
  await wedding(page);
  await expense(page);
  const detail = page.url();
  const budget = await context.newPage();
  await budget.goto('/financeiro/orcamento');
  await expect(budget.locator('.finance-summary')).toContainText('R$ 0,00');
  const history = await context.newPage();
  await history.goto('/financeiro/pagamentos');
  await expect(history.locator('.collection-table tbody tr:has(button)')).toHaveCount(0);
  await page.bringToFront();
  await operation(page, '2000');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await operation(page, '2000');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.finance-metrics')).toContainText('4.000,00');
  await expect(budget.locator('.finance-summary')).toContainText('4.000,00');
  await expect(history.locator('.collection-table tbody tr:has(button)')).toHaveCount(2);
  await page.goto('/financeiro/orcamento');
  await expect(page.locator('.finance-summary')).toContainText('4.000,00');
  await page.goto('/financeiro/pagamentos');
  await expect(page.locator('.collection-table tbody tr:has(button)')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.collection-table tbody tr:has(button)')).toHaveCount(2);
  await page.goto(detail);
  await expect(page.locator('.bill-row.overdue-row')).toHaveCount(0);
  await budget.close();
  await history.close();
});

test('attachment picker validates and persists files in expenses and payments', async ({
  page,
}) => {
  await wedding(page);
  await expense(page);
  await page.getByRole('link', { name: 'Editar despesa', exact: true }).click();
  const file = page.getByLabel('Anexar PDF ou imagem (até 1 MB)', { exact: true });
  await page.getByText('Contrato, comprovante e observações (opcional)', { exact: true }).click();
  await expect(page.getByText('Adicionar documento', { exact: true })).toBeVisible();
  await file.setInputFiles({
    name: 'contrato.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhWQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('.attachment-file')).toContainText('contrato.png');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Baixar contrato.png' })).toBeVisible();
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Observação e comprovante (opcional)', { exact: true }).click();
  await dialog.getByLabel('Anexar PDF ou imagem (até 1 MB)', { exact: true }).setInputFiles({
    name: 'arquivo.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Inválido'),
  });
  await expect(dialog.getByRole('alert')).toContainText('PDF ou imagem');
  await dialog.getByLabel('Anexar PDF ou imagem (até 1 MB)', { exact: true }).setInputFiles({
    name: 'recibo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhWQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await dialog.getByLabel('Valor *', { exact: true }).fill('500');
  await dialog.locator('.attachment-picker').scrollIntoViewIfNeeded();
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  await dialog.screenshot({ path: 'artifacts/etapa-03-anexo-dialogo.png' });
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Comprovante', exact: true })).toBeVisible();
});
