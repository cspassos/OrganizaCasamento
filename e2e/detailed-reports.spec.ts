import { test, expect } from '@playwright/test';
import { emptyLedger, makeInstallments } from '../src/app/core/utils/finance';
import { Expense, FinanceTransaction } from '../src/app/core/models/finance';
test('complete reports include installments, payments, overdue balances and correction history in every export', async ({
  page,
}) => {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Casamento relatório detalhado');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('João');
  await page.getByLabel('Orçamento inicial (R$)').fill('20000');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  const weddingId = await page.getByLabel('Casamento selecionado').inputValue();
  await page.goto('/financeiro/relatorios');
  await expect(page.locator('.report-preview')).toBeVisible();
  const l = emptyLedger(weddingId),
    e: Expense = {
      id: crypto.randomUUID(),
      weddingId,
      description: 'Buffet detalhado',
      categoryId: l.categories[2].id,
      supplier: 'Sabor e Festa',
      plannedCents: 1300000,
      contractedCents: 1200000,
      status: 'contracted',
      contractDate: '2020-01-01',
      dueDate: '2020-01-01',
      method: 'PIX',
      notes: 'Cardápio aprovado. Montagem às 14h. '.repeat(35),
      contractReference: 'CONTRATO-DETALHADO-001',
      attachment: {
        name: 'contrato-buffet.pdf',
        type: 'application/pdf',
        data: 'data:application/pdf;base64,JVBERg==',
      },
      createdAt: '2026-11-13T12:00:00Z',
    };
  l.expenses.push(e);
  l.installments = makeInstallments(e, {
    entryCents: 200000,
    count: 5,
    firstDueDate: '2027-01-01',
  });
  const entry = (
    kind: FinanceTransaction['kind'],
    amountCents: number,
    index: number,
    extra: Partial<FinanceTransaction> = {},
  ) => {
    const t: FinanceTransaction = {
      id: crypto.randomUUID(),
      weddingId,
      expenseId: e.id,
      installmentId: l.installments[index].id,
      kind,
      amountCents,
      date: '2026-11-13',
      method: 'PIX',
      notes: 'Operação de conferência',
      createdAt: '2026-11-13T12:00:00Z',
      ...extra,
    };
    l.transactions.push(t);
    return t;
  };
  const payment = entry('payment', 200000, 0, {
    attachment: {
      name: 'recibo-entrada.png',
      type: 'image/png',
      data: 'data:image/png;base64,AA==',
    },
  });
  entry('payment', 200000, 1);
  entry('payment', 50000, 2);
  entry('refund', 30000, 0, { paymentId: payment.id, notes: 'Devolução parcial acordada' });
  entry('interest', 5000, 0);
  entry('fine', 2500, 0);
  entry('discount', 10000, 2);
  entry('payment', 5000, 0, {
    voidedAt: '2026-11-13T12:10:00Z',
    voidReason: 'Registro duplicado de conferência',
  });
  l.audit.push({
    id: crypto.randomUUID(),
    weddingId,
    at: '2026-11-13T12:10:00Z',
    action: 'Lançamento desfeito',
    entityId: l.transactions.at(-1)!.id,
    detail: 'Correção registrada com motivo',
  });
  await page.evaluate(async (ledger) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('organiza-casamento');
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction('finance', 'readwrite');
        tx.objectStore('finance').put(ledger);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      r.onerror = () => reject(r.error);
    });
  }, l);
  await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click();
  await expect(page.locator('oc-finance-reports')).toContainText('CONTRATO-DETALHADO-001');
  await page.getByRole('combobox', { name: 'Relatório', exact: true }).selectOption('complete');
  await page.getByRole('button', { name: 'Expandir detalhes', exact: true }).click();
  await expect(page.locator('.report-details-heading')).toBeVisible();
  for (const text of [
    'CONTRATO-DETALHADO-001',
    'recibo-entrada.png',
    'Registro duplicado de conferência',
    'Devolução parcial acordada',
  ])
    await expect(page.locator('oc-finance-reports')).toContainText(text);
  await expect(page.locator('.report-paid')).toHaveCount(1);
  const categoryDetails = page.locator('.report-detail').filter({
    has: page.locator('summary').filter({ hasText: 'Orçamento e metas por categoria' }),
  });
  await expect(categoryDetails.locator('tbody tr')).toHaveCount(1);
  await expect(categoryDetails).not.toContainText('Filmagem');
  await expect(page.locator('oc-finance-reports')).not.toContainText(e.id);
  for (const t of l.transactions)
    await expect(page.locator('oc-finance-reports')).not.toContainText(t.id);
  await expect(page.locator('.report-overdue')).toHaveCount(1);
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar planilha', exact: true }).click();
  await (await csv).saveAs('artifacts/etapa-03-relatorio-completo.csv');
  const pdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PDF', exact: true }).click();
  await (await pdf).saveAs('artifacts/etapa-03-relatorio-completo.pdf');
  await page
    .locator('.report-kpis')
    .screenshot({ path: 'artifacts/etapa-03-relatorio-resumo.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
