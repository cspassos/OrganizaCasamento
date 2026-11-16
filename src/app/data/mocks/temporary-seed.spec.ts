import { buildTemporarySeed } from './temporary-seed';
import { expenseStatus, financeSummary, validateLedger } from '../../core/utils/finance';
describe('Massa temporária', () => {
  it('gera cenários financeiros coerentes com datas relativas e UUIDs independentes', () => {
    const { wedding, ledger } = buildTemporarySeed('2026-11-13');
    validateLedger(ledger);
    expect(wedding.temporarySeed).toBe(true);
    expect(ledger.expenses).toHaveLength(12);
    expect(new Set(ledger.expenses.map((e) => expenseStatus(ledger, e, '2026-11-13')))).toEqual(
      new Set(['Planejada', 'Contratada', 'Parcialmente paga', 'Paga', 'Vencida', 'Cancelada']),
    );
    const summary = financeSummary(ledger, 80000, '2026-11-13');
    expect(summary.paid).toBeGreaterThan(0);
    expect(summary.overdue).toBeGreaterThan(0);
    expect(summary.open).toBeGreaterThan(summary.overdue);
    expect(ledger.transactions.some((t) => t.kind === 'refund')).toBe(true);
    expect(ledger.transactions.some((t) => t.voidedAt)).toBe(true);
    expect(buildTemporarySeed('2026-11-13').wedding.id).not.toBe(wedding.id);
  });
});
