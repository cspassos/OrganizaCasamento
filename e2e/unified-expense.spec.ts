import { test, expect, Page } from '@playwright/test';
async function createWedding(page: Page) {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Fluxo único');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
test('gasto exige destinatário, cria contato, guarda documento e reutiliza contato sem duplicar', async ({
  page,
}) => {
  await createWedding(page);
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Descrição *', { exact: true }).fill('Fotografia da festa');
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('planned');
  await page.getByLabel('Valor estimado *', { exact: true }).fill('2500');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Informe quem vai receber' }),
  ).toBeVisible();
  await page
    .getByLabel('Fornecedor ou quem vai receber *', { exact: true })
    .fill('Jardim Fotografia');
  await page.getByText('Contrato, comprovante e observações (opcional)', { exact: true }).click();
  await page.getByLabel('Anexar PDF ou imagem (até 1 MB)', { exact: true }).setInputFiles({
    name: 'contrato-fotos.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhWQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalhes da despesa', exact: true }),
  ).toBeVisible();
  await page.goto('/fornecedores/cadastro');
  await expect(page).toHaveURL(/financeiro\/fornecedores$/);
  const tabs = page.getByRole('navigation', { name: 'Módulos financeiros' });
  await expect(tabs.getByRole('link', { name: 'Fornecedores', exact: true })).toHaveClass('active');
  const menu = page.getByRole('navigation', { name: 'Seções do casamento' });
  await expect(menu.getByRole('link', { name: 'Fornecedores', exact: true })).toHaveCount(0);
  await expect(
    menu.getByRole('link', { name: 'Gastos e pagamentos', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ações de Jardim Fotografia', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Ver dados', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Fotografia da festa');
  await expect(
    dialog.getByRole('button', { name: 'Baixar contrato-fotos.png', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Fornecedor ou quem vai receber *', { exact: true }).fill('Jardim');
  await page.getByRole('option').filter({ hasText: 'Jardim Fotografia' }).click();
  await page.getByLabel('Descrição *', { exact: true }).fill('Ensaio do casal');
  await page.getByLabel('Valor total combinado *', { exact: true }).fill('500');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalhes da despesa', exact: true }),
  ).toBeVisible();
  await page.goto('/fornecedores/cadastro');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ações de Jardim Fotografia', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Ver gastos deste fornecedor', exact: true }).click();
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(2);
});
