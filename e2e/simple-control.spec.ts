import { test, expect, Page } from '@playwright/test';

async function wedding(page: Page, name = 'Controle simples') {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill(name);
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByLabel('Orçamento inicial (R$)').fill('20000');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}

test('simula gastos contratados e planejados nas duas abas em tela de celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await wedding(page);
  for (const [name, status, amount] of [
    ['Buffet', 'contracted', '14500'],
    ['Decoração', 'planned', '5000'],
  ]) {
    await page.goto('/financeiro/despesas/nova');
    await page.locator('#supplier').fill('Fornecedor ' + name);
    await page.getByLabel('Descrição *', { exact: true }).fill(name);
    await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption(status);
    await page
      .getByLabel(status === 'planned' ? 'Valor estimado *' : 'Valor total combinado *', {
        exact: true,
      })
      .fill(amount);
    await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
    await expect(page).toHaveURL(/\/financeiro\/despesas\/[a-f0-9-]{36}$/);
  }
  await page.goto('/financeiro/despesas');
  const table = page.getByRole('table', { name: 'Despesas' });
  const buffet = table.getByRole('row', { name: /Buffet/ });
  await expect(table.getByRole('columnheader').nth(1)).toContainText('Valor');
  await expect(table.getByRole('columnheader').nth(2)).toContainText('Já pago');
  await expect(buffet.getByRole('cell').nth(1)).toContainText('14.500,00');
  await expect(buffet.getByRole('cell').nth(1).locator('.collection-cell')).toHaveCSS(
    'white-space',
    'nowrap',
  );
  await expect(buffet.getByRole('cell').nth(2)).toContainText('0,00');
  expect(
    await buffet.evaluate((row) => {
      const text = row.children[2].querySelector('.collection-cell')!.getBoundingClientRect();
      const actions = row.querySelector('.collection-action-column')!.getBoundingClientRect();
      return text.right <= actions.left;
    }),
  ).toBe(true);
  await expect(buffet.getByRole('button', { name: 'Ações de Buffet' })).toBeVisible();
  const forecast = page.getByRole('region', { name: 'Previsão de gastos' });
  await expect(forecast).toContainText('19.500,00');
  await forecast.getByRole('button', { name: 'Escolher gastos' }).click();
  await forecast.getByRole('checkbox', { name: /Decoração/ }).uncheck();
  await expect(forecast.getByText('Total selecionado').locator('..')).toContainText('14.500,00');
  await expect(forecast).toContainText('19.500,00');
  await expect(
    forecast.evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).resolves.toBe(true);
  await page
    .getByRole('navigation', { name: 'Módulos financeiros' })
    .getByRole('link', { name: 'Orçamento', exact: true })
    .click();
  await expect(forecast.getByText('Total selecionado').locator('..')).toContainText('14.500,00');
  await forecast.getByRole('button', { name: 'Limpar seleção' }).click();
  await expect(forecast.getByText('Total selecionado').locator('..')).toContainText('R$ 0,00');
  await forecast.getByRole('button', { name: 'Selecionar todos' }).click();
  await expect(forecast.getByText('Total selecionado').locator('..')).toContainText('19.500,00');
});

test('exclui uma despesa cancelada pela lista', async ({ page }) => {
  await wedding(page);
  await page.goto('/financeiro/despesas/nova');
  await page.locator('#supplier').fill('Fornecedor do buffet');
  await page.getByLabel('Descrição *', { exact: true }).fill('Buffet cancelado');
  await page.getByLabel('Valor total combinado *', { exact: true }).fill('14500');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar despesa', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('button', { name: 'Excluir despesa', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar às despesas', exact: true }).click();
  await page.getByRole('button', { name: 'Ações de Buffet cancelado', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Excluir despesa', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir despesa', exact: true })
    .click();
  await expect(page.getByRole('status').filter({ hasText: 'Despesa excluída.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('table', { name: 'Despesas' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Buffet cancelado/ })).toHaveCount(0);
});

test('sugere parcela após a entrada e rejeita vencimentos invertidos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await wedding(page);
  await page.goto('/financeiro/despesas/nova');
  await page.locator('#supplier').fill('Fornecedor do buffet');
  await page.getByLabel('Descrição *', { exact: true }).fill('Buffet');
  const total = page.getByLabel('Valor total combinado *', { exact: true });
  await page.getByLabel('Entrada / sinal', { exact: true }).fill('2500');
  await page.getByLabel('Parcelas do restante', { exact: true }).fill('8');
  await page.getByLabel('Vencimento / data da entrada *', { exact: true }).fill('10/12/2026');

  const first = page.getByLabel('Primeiro vencimento do restante', { exact: true });
  await expect(first).toHaveValue('10/01/2027');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(total).toBeFocused();
  await expect(total).toBeInViewport();
  await expect(page.getByText('Informe um valor total maior que R$ 0,00.')).toBeInViewport();
  await total.fill('14500');
  await first.fill('24/11/2026');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('na data da entrada ou depois');
  await expect(first).toBeFocused();
  await first.fill('10/01/2027');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page).toHaveURL(/\/financeiro\/despesas\/[a-f0-9-]{36}$/);

  const bills = page.locator('.bill-row');
  await expect(bills).toHaveCount(9);
  const entry = bills.filter({ hasText: 'Entrada' });
  const firstBill = bills.filter({ hasText: 'Parcela 1/8' });
  await expect(entry.getByLabel('Vencimento')).toHaveValue('10/12/2026');
  await expect(firstBill.getByLabel('Vencimento')).toHaveValue('10/01/2027');
  await firstBill.getByLabel('Vencimento').fill('24/11/2026');
  await firstBill.getByRole('button', { name: 'Salvar vencimento' }).click();
  await expect(page.getByRole('alert')).toContainText('na data da entrada ou depois');
  await entry.getByLabel('Vencimento').fill('11/01/2027');
  await entry.getByRole('button', { name: 'Salvar vencimento' }).click();
  await expect(page.getByRole('alert')).toContainText('na data da primeira parcela ou antes');
  await page.reload();
  await expect(firstBill.getByLabel('Vencimento')).toHaveValue('10/01/2027');
  await expect(entry.getByLabel('Vencimento')).toHaveValue('10/12/2026');
});

test('controle simples: gasto direto, parcelas, pagamento e totais no painel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await wedding(page);
  const menu = page.getByRole('navigation', { name: 'Seções do casamento' });
  await expect(menu.getByRole('link')).toHaveCount(8);
  await expect(menu.getByRole('link', { name: 'Equipe' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Adicionar gasto', exact: true }).click();
  await page.getByLabel('Descrição *', { exact: true }).fill('Buffet da festa');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');
  await page
    .getByRole('combobox', { name: 'Categoria *', exact: true })
    .selectOption({ label: 'Buffet' });
  await page.getByLabel('Valor total combinado *', { exact: true }).fill('5000');
  await page.getByLabel('Vencimento / data da entrada *', { exact: true }).fill('01/01/2020');
  await page.getByLabel('Entrada / sinal', { exact: true }).fill('1000');
  await page.getByLabel('Parcelas do restante', { exact: true }).fill('4');
  await page.getByLabel('Primeiro vencimento do restante', { exact: true }).fill('01/01/2027');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page.getByText('Parcela 4/4', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Valor *', { exact: true })).toHaveValue(/1.000,00/);
  await expect(dialog.getByLabel('Operação', { exact: true })).not.toBeVisible();
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto('/dashboard');
  await expect(page.locator('oc-stat').filter({ hasText: 'JÁ PAGAMOS' })).toContainText('1.000,00');
  await expect(page.locator('oc-stat').filter({ hasText: 'FALTA PAGAR' })).toContainText(
    '4.000,00',
  );
  await page.reload();
  await expect(page.locator('oc-stat').filter({ hasText: 'JÁ COMBINADO' })).toContainText(
    '5.000,00',
  );
  await page.screenshot({
    path: 'artifacts/controle-simples-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'artifacts/controle-simples-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});

test('convidados podem ser adicionados em lista sem formulário individual e ficam separados por casamento', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/pessoas/convidados');
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Nomes dos convidados', { exact: true })
    .fill(Array.from({ length: 101 }, (_, i) => `Pessoa ${i + 1}`).join('\n'));
  await dialog.getByRole('button', { name: 'Adicionar à lista', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: '101 convidados adicionados' }),
  ).toBeVisible();
  await page.getByRole('searchbox', { name: 'Pesquisar por nome' }).fill('Pessoa 101');
  const row = page.locator('oc-collection-table tbody tr').filter({ hasText: 'Pessoa 101' });
  await row.getByRole('button', { name: 'Ações de Pessoa 101', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Editar Pessoa 101', exact: true }).click();
  await expect(dialog.getByLabel('Nome completo *', { exact: true })).toHaveValue('Pessoa 101');
  await expect(dialog.getByLabel('Telefone', { exact: true })).not.toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.reload();
  await page.getByRole('searchbox', { name: 'Pesquisar por nome' }).fill('Pessoa 101');
  await expect(row).toBeVisible();
  await wedding(page, 'Outro casamento');
  await page.goto('/pessoas/convidados');
  await expect(
    page.locator('oc-collection-table tbody tr').filter({ hasText: 'Pessoa 101' }),
  ).toHaveCount(0);
});

test('equipe antiga só permite consulta e dados continuam preservados', async ({ page }) => {
  await wedding(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('organiza-casamento', 6);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const weddings = await new Promise<any[]>((resolve, reject) => {
      const request = db.transaction('weddings').objectStore('weddings').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const weddingId = weddings[0].id;
    const professional = {
      id: 'previous-professional',
      weddingId,
      createdAt: new Date().toISOString(),
      name: 'Carlos antigo',
      role: 'Garçom',
      company: '',
      supplierId: '',
      phone: '',
      whatsapp: '',
      email: '',
      agreedCents: 0,
      paymentMode: 'undecided',
      expenseId: '',
      status: 'expected',
      responsibilities: '',
      notes: '',
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('suppliers', 'readwrite');
      tx.objectStore('suppliers').put({
        id: weddingId,
        weddingId,
        schemaVersion: 1,
        suppliers: [],
        quotes: [],
        contracts: [],
        professionals: [professional],
        shifts: [],
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/equipe/profissionais');
  await expect(page.getByRole('heading', { name: 'Cadastros anteriores de equipe' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo profissional' })).toHaveCount(0);
  await expect(page.locator('oc-collection-table')).toContainText('Carlos antigo');
  await page.goto('/equipe/escalas');
  await expect(page.getByRole('button', { name: 'Nova escala' })).toHaveCount(0);
  await expect(page.locator('oc-collection-table')).toContainText('Carlos antigo');
  await page.goto('/modulo/6/0');
  await expect(page).toHaveURL(/dashboard$/);
});

test('fornecedor básico e contrato opcional criam as parcelas sem exigir equipe ou contatos extras', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/fornecedores/cadastro');
  await page.getByRole('button', { name: 'Novo fornecedor', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome do fornecedor', { exact: false }).fill('Jardim Fotos');
  await dialog
    .getByRole('combobox', { name: 'Categoria *', exact: true })
    .selectOption('Fotografia');
  await expect(dialog.getByLabel('Telefone', { exact: true })).not.toBeVisible();
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto('/fornecedores/contratos');
  await page.getByRole('button', { name: 'Novo contrato', exact: true }).click();
  await dialog.getByLabel('Fornecedor do contrato *', { exact: true }).fill('Jardim Fotos');
  await page.locator('mat-option').filter({ hasText: 'Jardim Fotos' }).click();
  await dialog.getByLabel('Título do contrato', { exact: false }).fill('Fotografia simples');
  await dialog.getByLabel('Valor contratado (R$)', { exact: false }).fill('5000');
  await dialog.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('signed');
  await dialog
    .getByRole('combobox', { name: 'Como será o pagamento? *', exact: true })
    .selectOption('installments');
  await dialog.getByLabel('Entrada (R$)', { exact: false }).fill('1000');
  await dialog.getByLabel('Quantidade de parcelas restantes', { exact: false }).fill('4');
  await dialog.getByRole('button', { name: 'Salvar contrato', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole('link', { name: 'Conferir parcelas e registrar pagamentos', exact: true })
    .click();
  await expect(page.getByText('Parcela 4/4', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Entrada', { exact: true })).toBeVisible();
});

test('preço pesquisado não vira dívida e relatórios continuam disponíveis', async ({ page }) => {
  await wedding(page);
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Descrição *', { exact: true }).fill('Decoração em pesquisa');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('planned');
  await page.getByLabel('Valor estimado *', { exact: true }).fill('1500');
  await page.getByText('Contrato, comprovante e observações (opcional)', { exact: true }).click();
  await expect(page.getByLabel('Data da contratação', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Referência do contrato', { exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('contracted');
  await expect(page.getByLabel('Data da contratação', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('planned');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalhes da despesa', exact: true }),
  ).toBeVisible();
  await expect(page.locator('oc-expense-detail')).not.toContainText('Contratação:');
  await expect(page.getByRole('button', { name: 'Registrar pagamento', exact: true })).toHaveCount(
    0,
  );
  await page.goto('/dashboard');
  await expect(page.locator('oc-stat').filter({ hasText: 'FALTA PAGAR' })).toContainText('0,00');
  await page.goto('/financeiro/relatorios');
  await expect(page.getByRole('combobox', { name: 'Relatório', exact: true })).toHaveValue(
    'expenses',
  );
  const pdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PDF', exact: true }).click();
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar planilha', exact: true }).click();
  expect((await csv).suggestedFilename()).toMatch(/\.csv$/);
});
