import { emptyLedger, makeInstallments, financeSummary } from './finance';
import { buildFinanceReport, reportCsv } from './finance-reports';
import { Expense } from '../models/finance';
function fixture() {
  const l = emptyLedger('w');
  const e: Expense = {
    id: crypto.randomUUID(),
    weddingId: 'w',
    description: 'Buffet detalhado',
    categoryId: l.categories[0].id,
    supplier: 'Fornecedor completo',
    plannedCents: 1300000,
    contractedCents: 1200000,
    status: 'contracted',
    contractDate: '2020-01-01',
    dueDate: '2020-01-01',
    method: 'PIX',
    notes: 'Montagem às 14h',
    contractReference: 'CONTRATO-001',
    attachment: {
      name: 'contrato.pdf',
      type: 'application/pdf',
      data: 'data:application/pdf;base64,JVBERg==',
    },
    createdAt: '2020-01-01T12:00:00Z',
  };
  l.expenses.push(e);
  l.installments = makeInstallments(e, {
    entryCents: 200000,
    count: 5,
    firstDueDate: '2027-01-01',
  });
  l.transactions.push(
    {
      id: crypto.randomUUID(),
      weddingId: 'w',
      expenseId: e.id,
      installmentId: l.installments[0].id,
      kind: 'payment',
      amountCents: 50000,
      date: '2026-11-13',
      method: 'PIX',
      notes: 'Sinal registrado',
      createdAt: '2026-11-13T12:00:00Z',
    },
    {
      id: crypto.randomUUID(),
      weddingId: 'w',
      expenseId: e.id,
      installmentId: l.installments[0].id,
      kind: 'payment',
      amountCents: 10000,
      date: '2026-11-13',
      method: 'PIX',
      notes: 'Duplicado',
      voidedAt: '2026-11-13T12:10:00Z',
      voidReason: 'Registro na parcela errada',
      createdAt: '2026-11-13T12:01:00Z',
    },
  );
  return { l, e };
}
describe('Detailed financial reports', () => {
  it('includes every installment, operation, correction reason and expense field without counting voided payments', () => {
    const { l, e } = fixture();
    const r = buildFinanceReport(l, 20000, 'complete', {
      from: '',
      to: '',
      categoryId: '',
      status: '',
    });
    const all = reportCsv(r);
    for (const value of [
      'CONTRATO-001',
      'Montagem às 14h',
      'contrato.pdf',
      'Registro na parcela errada',
      'Parcela 5/5',
    ])
      expect(all).toContain(value);
    expect(all).not.toContain(e.id);
    expect(all).not.toContain(l.transactions[0].id);
    for (const i of l.installments) expect(all).not.toContain(i.id);
    expect(r.sections?.find((s) => s.title === 'Parcelas de Buffet detalhado')?.rows).toHaveLength(
      6,
    );
    expect(
      r.summary?.find((s) => s.label === 'Pago líquido acumulado no recorte')?.value,
    ).toContain('500,00');
    expect(financeSummary(l, 20000).paid).toBe(50000);
  });
  it('selects an old expense when it has a payment in the chosen complete-report period', () => {
    const { l } = fixture();
    const filter = { from: '2026-11-01', to: '2026-11-30', categoryId: '', status: '' };
    expect(buildFinanceReport(l, 20000, 'complete', filter).rows).toHaveLength(1);
    expect(buildFinanceReport(l, 20000, 'expenses', filter).rows).toHaveLength(0);
  });
  it('keeps detailed expenses isolated by category and rejects invalid periods', () => {
    const { l } = fixture();
    const f = { from: '', to: '', categoryId: l.categories[1].id, status: '' };
    expect(buildFinanceReport(l, 20000, 'complete', f).rows).toHaveLength(0);
    const invalid = buildFinanceReport(l, 20000, 'complete', {
      ...f,
      from: '2026-12-01',
      to: '2026-01-01',
    });
    expect(invalid.rows).toHaveLength(0);
    expect(invalid.notes).toContain('posterior');
  });
  it('omits unused categories and replaces technical references with readable names', () => {
    const { l, e } = fixture();
    l.categories[1].budgetCents = 10000;
    l.audit.push({
      id: crypto.randomUUID(),
      weddingId: l.weddingId,
      at: '2026-11-13T12:00:00Z',
      entityId: l.transactions[0].id,
      action: 'Pagamento registrado',
      detail: 'Conferido',
    });
    l.transactions.push({
      id: crypto.randomUUID(),
      weddingId: l.weddingId,
      expenseId: e.id,
      installmentId: l.installments[0].id,
      kind: 'refund',
      amountCents: 10000,
      date: '2026-11-13',
      method: 'PIX',
      paymentId: l.transactions[0].id,
      notes: 'Devolução',
      createdAt: '2026-11-13T12:00:00Z',
    });
    const f = { from: '', to: '', categoryId: '', status: '' };
    const report = buildFinanceReport(l, 20000, 'complete', f);
    const categories = report.sections!.find((s) => s.title === 'Orçamento e metas por categoria')!;
    expect(categories.rows.map((r) => r[0])).toEqual([l.categories[0].name, l.categories[1].name]);
    expect(buildFinanceReport(l, 20000, 'budget', f).rows).toHaveLength(2);
    const csv = reportCsv(report);
    for (const record of [
      ...l.expenses,
      ...l.installments,
      ...l.transactions,
      ...l.categories,
      ...l.audit,
    ])
      expect(csv).not.toContain(record.id);
    expect(csv.replace(/\u00a0/g, ' ')).toContain('Pagamento de R$ 500,00 em 13/11/2026');
  });
});
