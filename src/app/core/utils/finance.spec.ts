import { Expense, FinanceLedger } from '../models/finance';
import {
  cents,
  emptyLedger,
  expenseBalance,
  expenseDisplay,
  financeSummary,
  makeInstallments,
  validateLedger,
} from './finance';
import { buildFinanceReport, reportCsv } from './finance-reports';

function setup() {
  const l = emptyLedger('w');
  const e: Expense = {
    id: crypto.randomUUID(),
    weddingId: 'w',
    description: 'Buffet',
    categoryId: l.categories[0].id,
    supplier: 'Sabor',
    plannedCents: 1200000,
    contractedCents: 1200000,
    status: 'contracted',
    contractDate: '2026-01-01',
    dueDate: '2026-02-01',
    method: 'PIX',
    notes: '',
    contractReference: '',
    createdAt: '',
  };
  l.expenses.push(e);
  l.installments = makeInstallments(e, {
    entryCents: 200000,
    count: 5,
    firstDueDate: '2026-03-01',
  });
  return { l, e };
}
describe('Financial calculations', () => {
  it('apresenta gasto cancelado sem dívida preservando valores e parcelas históricas', () => {
    const { l, e } = setup(); e.status = 'cancelled';
    const before = structuredClone(l.installments);
    expect(expenseDisplay(l, e)).toMatchObject({ open: 0, nextDueDate: null, due: 1200000 });
    expect(expenseBalance(l, e).open).toBe(1200000);
    expect(l.installments).toEqual(before);
    for (const kind of ['expenses', 'complete'] as const) {
      const report = buildFinanceReport(l, 20000, kind, { from: '', to: '', categoryId: '', status: '' });
      expect(report.rows[0].at(-1)).toContain('0,00');
    }
  });
  it('próximo vencimento acompanha pagamento, devolução e mudança de data', () => {
    const { l, e } = setup();
    expect(expenseDisplay(l, e).nextDueDate).toBe('2026-02-01');
    l.transactions.push({ id: 'payment', weddingId: 'w', expenseId: e.id, installmentId: l.installments[0].id, kind: 'payment', amountCents: 200000, date: '2026-02-01', method: 'PIX', notes: '', createdAt: '' });
    expect(expenseDisplay(l, e).nextDueDate).toBe('2026-03-01');
    l.transactions.push({ ...l.transactions[0], id: 'refund', kind: 'refund', amountCents: 50000, paymentId: 'payment' });
    expect(expenseDisplay(l, e).nextDueDate).toBe('2026-02-01');
    l.installments[0].dueDate = '2028-01-01';
    expect(expenseDisplay(l, e).nextDueDate).toBe('2026-03-01');
  });
  it('splits entry and remaining balance without double counting', () => {
    const { l, e } = setup();
    expect(l.installments.map((i) => i.amountCents)).toEqual(Array(6).fill(200000));
    expect(expenseBalance(l, e)).toEqual({ due: 1200000, paid: 0, open: 1200000 });
    expect(financeSummary(l, 20000, '2026-02-15').overdue).toBe(200000);
  });
  it('distributes cent remainders and clamps monthly due dates without drifting', () => {
    const { e } = setup();
    e.contractedCents = 10000;
    e.dueDate = '2027-01-31';
    const result = makeInstallments(e, { entryCents: 0, count: 3, firstDueDate: '2027-01-31' });
    expect(result.map((i) => i.amountCents)).toEqual([3333, 3333, 3334]);
    expect(result.map((i) => i.dueDate)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
    expect(cents(0.1 + 0.2)).toBe(30);
  });
  it('rejects invalid plans, values and inconsistent relationships', () => {
    const { l, e } = setup();
    expect(() =>
      makeInstallments(e, { entryCents: 1200001, count: 5, firstDueDate: e.dueDate }),
    ).toThrow();
    expect(() =>
      makeInstallments(e, { entryCents: 0, count: 0, firstDueDate: e.dueDate }),
    ).toThrow();
    expect(() => cents(-1)).toThrow();
    l.installments[0].amountCents++;
    expect(() => validateLedger(l)).toThrow('somar');
  });
  it('keeps forecast, cancellation, commitments and reserve separate', () => {
    const { l, e } = setup();
    l.budgetCents = 2000000;
    l.reserveCents = 100000;
    l.expenses.push({
      ...e,
      id: crypto.randomUUID(),
      status: 'planned',
      contractedCents: 0,
      plannedCents: 50000,
    });
    expect(financeSummary(l, 1000).planned).toBe(1250000);
    expect(financeSummary(l, 1000).available).toBe(700000);
    e.status = 'cancelled';
    expect(financeSummary(l, 1000).contracted).toBe(0);
    expect(financeSummary(l, 1000).planned).toBe(50000);
  });
  it('reports use the same balances and escape spreadsheet formulas', () => {
    const { l, e } = setup();
    l.transactions.push({
      id: crypto.randomUUID(),
      weddingId: 'w',
      expenseId: e.id,
      installmentId: l.installments[0].id,
      kind: 'payment',
      amountCents: 50000,
      date: '2026-02-01',
      method: 'PIX',
      notes: '=HYPERLINK("bad")',
      createdAt: '',
    });
    const filter = { from: '', to: '', categoryId: '', status: '' };
    const payments = buildFinanceReport(l, 20000, 'payments', filter);
    expect(payments.totalCents).toBe(financeSummary(l, 20000).paid);
    expect(reportCsv(payments)).toContain("'=HYPERLINK");
    expect(buildFinanceReport(l, 20000, 'pending', filter).totalCents).toBe(
      financeSummary(l, 20000).open,
    );
    expect(
      buildFinanceReport(l, 20000, 'payments', { ...filter, from: '2026-03-01' }).totalCents,
    ).toBe(0);
  });
});
