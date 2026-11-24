import { test, expect, Page, Locator } from '@playwright/test';

async function wedding(page: Page, name = 'Casamento da etapa 06') {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill(name);
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Lucas');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
async function choose(page: Page, container: Locator, label: string, term: string) {
  await container.getByLabel(label, { exact: true }).fill(term);
  await page.locator('mat-option').filter({ hasText: term }).first().click({ timeout: 8000 });
}
async function supplier(page: Page, name = 'Jardim Fotografia') {
  await page.goto('/fornecedores/cadastro');
  await page.getByRole('button', { name: 'Novo fornecedor', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome do fornecedor').fill(name);
  await dialog
    .getByRole('combobox', { name: 'Categoria *', exact: true })
    .selectOption('Fotografia');
  await dialog.getByText('Outros contatos (opcional)', { exact: true }).click();
  await dialog.getByLabel('Telefone', { exact: true }).fill('11999998888');
  await dialog.getByLabel('E-mail', { exact: true }).fill('contato@jardim.com');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
async function sign(page: Page, title = 'Fotografia completa', installments = true) {
  await page.goto('/fornecedores/contratos');
  await page.getByRole('button', { name: 'Novo contrato', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await choose(page, dialog, 'Fornecedor do contrato *', 'Jardim Fotografia');
  await dialog.getByLabel('Título do contrato').fill(title);
  await dialog.getByLabel('Valor contratado (R$)').fill('12000');
  await dialog.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('signed');
  await dialog
    .getByRole('combobox', { name: 'Como será o pagamento? *', exact: true })
    .selectOption(installments ? 'installments' : 'integral');
  if (installments) {
    await dialog.getByLabel('Entrada (R$)').fill('2000');
    await dialog.getByLabel('Quantidade de parcelas restantes').fill('5');
  }
  await dialog.getByRole('button', { name: 'Salvar contrato', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test('contrato orienta próximos passos e mantém somente uma rolagem ao expandir detalhes', async ({
  page,
}) => {
  await wedding(page);
  await supplier(page);
  await sign(page);
  await expect(page.getByRole('region', { name: 'Próximos passos do contrato' })).toContainText(
    'vencimentos',
  );
  const row = page
    .locator('oc-collection-table tbody tr')
    .filter({ hasText: 'Fotografia completa' });
  await row.getByRole('button', { name: 'Ações de Fotografia completa', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Editar contrato', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .locator('summary')
    .filter({ hasText: 'Proposta, referência, serviços e documentos' })
    .click();
  await page.setViewportSize({ width: 1280, height: 720 });
  const scrollAreas = await dialog.evaluate(
    (el) =>
      [...el.querySelectorAll('*'), el].filter((node) => {
        const style = getComputedStyle(node);
        return /auto|scroll/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 2;
      }).length,
  );
  expect(scrollAreas).toBe(1);
  await dialog
    .getByRole('button', { name: 'Salvar e ver parcelas e pagamentos', exact: true })
    .click();
  await expect(page).toHaveURL(/financeiro\/despesas\/[a-f0-9-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Parcelas e vencimentos' })).toBeVisible();
});

test('assinatura exige definir pagamento e cria entrada e parcelas no mesmo salvamento', async ({
  page,
}) => {
  await wedding(page);
  await supplier(page);
  await page.goto('/fornecedores/contratos');
  await page.getByRole('button', { name: 'Novo contrato', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await choose(page, dialog, 'Fornecedor do contrato *', 'Jardim Fotografia');
  await dialog.getByLabel('Título do contrato').fill('Contrato parcelado');
  await dialog.getByLabel('Valor contratado (R$)').fill('12000');
  await dialog.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('signed');
  await dialog.getByRole('button', { name: 'Salvar contrato', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('escolha como');
  await dialog
    .getByRole('combobox', { name: 'Como será o pagamento? *', exact: true })
    .selectOption('installments');
  await dialog.getByLabel('Entrada (R$)').fill('2000');
  await dialog.getByRole('button', { name: 'Salvar contrato', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Quantidade de parcelas restantes');
  await expect(dialog.getByRole('alert')).not.toContainText('fornecedor, título');
  await dialog.getByLabel('Quantidade de parcelas restantes').fill('5');
  await dialog.getByRole('button', { name: 'Salvar contrato', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole('link', { name: 'Conferir parcelas e registrar pagamentos', exact: true })
    .click();
  await expect(page.getByText('Entrada', { exact: true })).toBeVisible();
  await expect(page.getByText('Parcela 5/5', { exact: true })).toBeVisible();
  await expect(page.getByText('Pagamento integral', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Parcela 5/5', { exact: true })).toBeVisible();
});

test('pagamento integral precisa ser escolhido e é criado ao salvar o contrato', async ({
  page,
}) => {
  await wedding(page);
  await supplier(page);
  await sign(page, 'Contrato integral', false);
  await page
    .getByRole('link', { name: 'Conferir parcelas e registrar pagamentos', exact: true })
    .click();
  await expect(page.getByText('Pagamento integral', { exact: true })).toBeVisible();
  await expect(page.getByText('Entrada', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Pagamento integral', { exact: true })).toBeVisible();
});

test('ações compactas não expandem a linha e funcionam por teclado e no celular', async ({
  page,
}) => {
  await wedding(page);
  await supplier(page);
  await sign(page);
  const row = page
    .locator('oc-collection-table tbody tr')
    .filter({ hasText: 'Fotografia completa' });
  const height = (await row.boundingBox())!.height;
  const trigger = row.getByRole('button', { name: 'Ações de Fotografia completa', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(
    menu.getByRole('menuitem', { name: 'Abrir despesa e pagamentos', exact: true }),
  ).toBeVisible();
  expect((await row.boundingBox())!.height).toBe(height);
  await page.screenshot({ path: 'artifacts/acoes-tabela-desktop.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  const bounds = (await menu.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/acoes-tabela-mobile.png', animations: 'disabled' });
  await menu.getByRole('menuitem', { name: 'Abrir despesa e pagamentos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Parcelas e vencimentos' })).toBeVisible();
  await page.goto('/financeiro/despesas');
  await page.getByRole('button', { name: 'Ações de Fotografia completa', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Abrir despesa', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Parcelas e vencimentos' })).toBeVisible();
});

test('cadastro de fornecedor simples não exige outros contatos', async ({ page }) => {
  await wedding(page);
  await page.goto('/fornecedores/cadastro');
  await page.getByRole('button', { name: 'Novo fornecedor', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome do fornecedor').fill('Fornecedor sem telefone');
  await expect(dialog.getByLabel('Telefone', { exact: true })).not.toBeVisible();
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('oc-collection-table')).toContainText('Fornecedor sem telefone');
});

test('categoria abre todas as opções e permite salvar uma categoria personalizada', async ({
  page,
}) => {
  await wedding(page);
  await page.goto('/fornecedores/cadastro');
  await page.getByRole('button', { name: 'Novo fornecedor', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const category = dialog.getByRole('combobox', { name: 'Categoria *', exact: true });
  await expect(category).toHaveValue('Outros');
  await expect(category.locator('option')).toHaveCount(19);
  await expect(category.locator('option')).toContainText([
    'Buffet',
    'Decoração',
    'Fotografia',
    'Filmagem',
    'DJ',
    'Banda',
    'Cerimonial',
    'Garçons',
    'Segurança',
    'Limpeza',
    'Bolo',
    'Doces',
    'Bebidas',
    'Floricultura',
    'Transporte',
    'Aluguel de equipamentos',
    'Beleza',
    'Outros',
    'Adicionar outra categoria…',
  ]);
  await category.selectOption('Fotografia');
  await dialog.getByLabel('Nome do fornecedor').fill('Fornecedor de fotografia');
  await dialog.getByRole('button', { name: 'Salvar e adicionar outro', exact: true }).click();
  await expect(dialog.getByLabel('Nome do fornecedor')).toHaveValue('');
  await expect(category).toHaveValue('Fotografia');
  await category.selectOption('__custom');
  await dialog.getByLabel('Nome da nova categoria').fill('Iluminação cênica');
  await dialog.getByLabel('Nome do fornecedor').fill('Fornecedor de iluminação');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  const row = page
    .locator('oc-collection-table tbody tr')
    .filter({ hasText: 'Fornecedor de iluminação' });
  await expect(row).toContainText('Iluminação cênica');
  await row.getByRole('button', { name: /Ações de/ }).click();
  await page.getByRole('menuitem', { name: 'Editar fornecedor', exact: true }).click();
  await expect(category).toHaveValue('Iluminação cênica');
  await expect(category.locator('option')).toHaveCount(20);
});

test('fornecedores, comparação, anexos, contrato financeiro, pagamento único e cancelamento protegido', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await wedding(page);
  await supplier(page);
  await page.getByRole('link', { name: 'Consultar orçamentos' }).click();
  await expect(page.locator('.breadcrumb')).toContainText('Comparar orçamentos');
  for (const [service, value] of [
    ['Fotografia 8 horas', '12000'],
    ['Fotografia com álbum', '15000'],
  ]) {
    await page.getByRole('button', { name: 'Novo orçamento', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await choose(page, dialog, 'Fornecedor *', 'Jardim Fotografia');
    await dialog.getByLabel('Serviço orçado').fill(service);
    await dialog.getByLabel('Valor da proposta (R$)').fill(value);
    await dialog.getByLabel('Serviços e itens incluídos').fill('Dois fotógrafos e fotos digitais');
    await dialog.getByLabel('Condições da proposta').fill('Entrada e cinco parcelas');
    if (value === '12000') {
      await dialog.getByLabel('Anexar PDF ou imagem (até 1 MB)').setInputFiles({
        name: 'proposta.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\nproposta de teste'),
      });
    }
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  const table = page.getByRole('table', { name: 'Orçamentos dos fornecedores' });
  await expect(table.getByRole('row', { name: /Fotografia 8 horas/ })).toContainText('12.000,00');
  await expect(table.getByRole('row', { name: /Fotografia com álbum/ })).toContainText('15.000,00');
  const totals = page.getByRole('region', { name: 'Valores dos orçamentos' });
  const search = page.getByRole('searchbox', { name: /Buscar/ });
  await expect(totals).toContainText('27.000,00');
  await search.fill('álbum');
  await expect(totals).toContainText('27.000,00');
  await expect(totals).toContainText('15.000,00');
  await search.clear();
  await page.getByRole('button', { name: 'Selecionar todos os 2 do filtro', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Comparação dos selecionados', exact: true }),
  ).toBeVisible();
  await expect(page.locator('oc-collection-table').last()).toContainText('3.000,00');
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar comparação', exact: true }).click();
  expect((await csv).suggestedFilename()).toBe('comparacao-orcamentos.csv');
  await page.screenshot({
    path: 'artifacts/etapa-06-comparacao.png',
    fullPage: true,
    animations: 'disabled',
  });
  await sign(page);
  const contract = page
    .locator('oc-collection-table tbody tr')
    .filter({ hasText: 'Fotografia completa' });
  await expect(contract).toContainText('R$ 12.000,00');
  await contract.getByRole('button', { name: /Ações de/ }).click();
  await page.getByRole('menuitem', { name: 'Abrir despesa e pagamentos', exact: true }).click();
  await expect(page.locator('.finance-metrics')).toContainText('12.000,00');
  await expect(page.locator('.bill-row')).toHaveCount(6);
  await page
    .locator('.bill-row')
    .first()
    .getByRole('button', { name: 'Registrar', exact: true })
    .click();
  await page.getByRole('dialog').getByLabel('Valor *', { exact: true }).fill('2000');
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/fornecedores/pagamentos');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
  await expect(page.locator('oc-collection-table')).toContainText('2.000,00');
  await page.goto('/fornecedores/contratos');
  await page
    .locator('oc-collection-table')
    .first()
    .getByRole('button', { name: /Ações de/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Editar contrato', exact: true }).click();
  const edit = page.getByRole('dialog');
  await edit.getByLabel('Título do contrato').fill('Fotografia revisada');
  await edit.getByRole('button', { name: 'Salvar contrato', exact: true }).click();
  await expect(edit).toHaveCount(0);
  if (!(await page.getByRole('menuitem', { name: 'Cancelar contrato', exact: true }).isVisible()))
    await page
      .locator('oc-collection-table')
      .first()
      .getByRole('button', { name: /Ações de/ })
      .first()
      .click();
  await page.getByRole('menuitem', { name: 'Cancelar contrato', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Motivo').fill('Teste do bloqueio');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar cancelamento', exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toContainText('possui pagamento');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Entendi', exact: true }).click();
  await page.goto('/financeiro/despesas');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
  await page.goto('/fornecedores/avaliacoes');
  await page
    .locator('oc-collection-table')
    .getByRole('button', { name: /Ações de/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Avaliar fornecedor', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nota').selectOption({ label: '5 — Muito satisfeito' });
  await page.getByRole('dialog').getByLabel('Sua avaliação').fill('Atendimento excelente');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.locator('oc-collection-table')).toContainText('5 de 5');
  await page.reload();
  await expect(page.locator('oc-collection-table')).toContainText('Atendimento excelente');
  await page.goto('/dashboard');
  await expect(page.locator('.stats-grid')).toContainText('12.000,00');
  expect(errors).toEqual([]);
});

test('cancelamento sem pagamento preserva contrato e despesa cancelados sem dívida', async ({
  page,
}) => {
  await wedding(page);
  await supplier(page);
  await sign(page);
  await page.getByRole('button', { name: 'Ações de Fotografia completa', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Cancelar contrato', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Motivo').fill('Contrato de teste cancelado');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar cancelamento', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('oc-collection-table')).toContainText('Cancelado');
  await page.goto('/financeiro/despesas');
  await expect(page.locator('oc-collection-table')).toContainText('Cancelada');
  await expect(page.locator('.finance-summary')).toContainText('0,00');
});

test('vincular contrato a despesa existente preserva lançamento e troca de casamento isola fornecedores', async ({
  page,
}) => {
  await wedding(page);
  await supplier(page);
  await page.goto('/financeiro/despesas/nova');
  await page.getByLabel('Descrição *', { exact: true }).fill('Despesa já cadastrada');
  await page.locator('#supplier').fill('Jardim Fotografia');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');
  await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('contracted');

  await page.getByLabel('Valor total combinado *', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page).toHaveURL(/financeiro\/despesas\/[a-f\d-]{36}$/);
  await page.goto('/fornecedores/contratos');
  await page.getByRole('button', { name: 'Novo contrato', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await choose(page, dialog, 'Fornecedor do contrato *', 'Jardim Fotografia');
  await dialog.getByLabel('Título do contrato').fill('Contrato da despesa antiga');
  await dialog.getByLabel('Valor contratado (R$)').fill('1000');
  await dialog.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('signed');
  await expect(dialog.getByText('Esse gasto já está na sua lista?', { exact: true })).toBeVisible();
  await dialog.getByLabel('Como acompanhar no financeiro?').selectOption('link');
  await choose(page, dialog, 'Despesa contratada existente *', 'Despesa já cadastrada');
  await dialog.getByRole('button', { name: 'Salvar contrato', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto('/financeiro/despesas');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
  await page.goto('/fornecedores/cadastro');
  await page
    .locator('oc-collection-table')
    .first()
    .getByRole('button', { name: /Ações de/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Excluir fornecedor', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('vinculad');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Entendi', exact: true }).click();
  await wedding(page, 'Outro casamento');
  await page.goto('/fornecedores/cadastro');
  await expect(page.locator('oc-collection-table tbody')).not.toContainText('Jardim Fotografia');
  await page
    .getByLabel('Casamento selecionado', { exact: true })
    .selectOption({ label: 'Casamento da etapa 06' });
  await expect(page.locator('oc-collection-table tbody')).toContainText('Jardim Fotografia');
});

test('tabela e busca de fornecedor funcionam com 512 cadastros sem carregar uma lista enorme na seleção', async ({
  page,
}) => {
  await wedding(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('organiza-casamento');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const weddings = await new Promise<{ id: string }[]>((resolve, reject) => {
      const r = db.transaction('weddings').objectStore('weddings').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const weddingId = weddings[0].id;
    const suppliers = Array.from({ length: 512 }, (_, i) => ({
      id: crypto.randomUUID(),
      weddingId,
      name: `Fornecedor ${String(i).padStart(3, '0')}`,
      company: 'Empresa de teste',
      document: '',
      category: 'Fotografia',
      service: 'Fotografia',
      phone: `119${String(i).padStart(8, '0')}`,
      whatsapp: '',
      email: '',
      address: '',
      responsible: '',
      status: 'prospecting',
      notes: '',
      rating: 0,
      review: '',
      createdAt: new Date().toISOString(),
    }));
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('suppliers', 'readwrite');
      tx.objectStore('suppliers').put({
        id: weddingId,
        weddingId,
        schemaVersion: 1,
        suppliers,
        quotes: [],
        contracts: [],
        professionals: [],
        shifts: [],
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/fornecedores/cadastro');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(25);
  await expect(page.locator('oc-collection-table')).toContainText('512 registros');
  await page.getByRole('searchbox').fill('Fornecedor 511');
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
  await expect(page.locator('oc-collection-table')).toContainText('Fornecedor 511');
  await page.goto('/fornecedores/orcamentos');
  await page.getByRole('button', { name: 'Novo orçamento', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const picker = dialog.getByLabel('Fornecedor *', { exact: true });
  await picker.fill('Fornecedor');
  await expect(page.getByRole('option').filter({ hasText: 'Mostrando 30 de 512' })).toBeVisible();
  await picker.fill('11900000511');
  await page.getByRole('option').filter({ hasText: 'Fornecedor 511' }).click();
  await dialog.getByLabel('Serviço orçado').fill('Proposta da última pessoa');
  await dialog.getByLabel('Valor da proposta (R$)').fill('3000');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('oc-collection-table')).toContainText('Fornecedor 511');
});
test('contato e gasto têm caminhos separados, com cadastro preenchido e filtro do fornecedor', async ({
  page,
}) => {
  await wedding(page);
  await supplier(page);
  await expect(
    page.getByRole('heading', { name: 'Contatos dos fornecedores', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Para que servem os fornecedores' })).toContainText(
    'contatos',
  );
  const row = page.locator('oc-collection-table tbody tr').filter({ hasText: 'Jardim Fotografia' });
  await row.getByRole('button', { name: /^Ações de/ }).click();
  await page.getByRole('menuitem', { name: 'Adicionar gasto', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Situação', exact: true })).toHaveValue(
    'planned',
  );
  await page.getByLabel('Descrição *', { exact: true }).fill('Fotos para comparar');
  if (!(await page.locator('#supplier').inputValue()))
    await page.locator('#supplier').fill('Fornecedor de teste');
  await page.getByLabel('Valor estimado *', { exact: true }).fill('2500');
  await page.getByText('Contrato, comprovante e observações (opcional)', { exact: true }).click();
  await expect(page.getByLabel('Fornecedor ou quem vai receber *', { exact: true })).toHaveValue(
    'Jardim Fotografia',
  );
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalhes da despesa', exact: true }),
  ).toBeVisible();
  await page.goto('/fornecedores/cadastro');
  await row.getByRole('button', { name: /^Ações de/ }).click();
  await page.getByRole('menuitem', { name: 'Ver gastos deste fornecedor', exact: true }).click();
  await expect(page).toHaveURL(/financeiro\/despesas\?fornecedor=/);
  await expect(page.locator('oc-collection-table tbody tr')).toHaveCount(1);
  await expect(page.locator('oc-collection-table')).toContainText('Fotos para comparar');
  await page.getByRole('link', { name: 'Ver todos os gastos', exact: true }).click();
  await expect(page).toHaveURL(/financeiro\/despesas$/);
});
