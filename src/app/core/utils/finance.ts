import {
  Expense,
  FinanceLedger,
  FinanceTransaction,
  Installment,
  InstallmentPlan,
  initialCategories,
  LocalAttachment,
} from '../models/finance';
import { isCalendarDate } from './wedding';
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export function periodError(from: string, to: string) {
  if ((from && !isCalendarDate(from)) || (to && !isCalendarDate(to)))
    return 'Informe datas válidas para o período.';
  return from && to && from > to ? 'A data inicial não pode ser posterior à data final.' : '';
}
export function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 999999999.99)
    throw new Error('Informe um valor entre zero e R$ 999.999.999,99.');
  return Math.round((value + Number.EPSILON) * 100);
}
export function localToday(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function emptyLedger(weddingId: string): FinanceLedger {
  return {
    id: weddingId,
    weddingId,
    schemaVersion: 1,
    budgetCents: null,
    reserveCents: 0,
    categories: initialCategories.map((name) => ({
      id: crypto.randomUUID(),
      weddingId,
      name,
      budgetCents: 0,
    })),
    expenses: [],
    installments: [],
    transactions: [],
    audit: [],
  };
}
export function shiftMonth(date: string, offset: number) {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + offset, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}
export function makeInstallments(expense: Expense, plan: InstallmentPlan): Installment[] {
  if (!isCalendarDate(plan.firstDueDate) || !isCalendarDate(expense.dueDate))
    throw new Error('Informe vencimentos válidos.');
  if (
    !Number.isSafeInteger(plan.entryCents) ||
    plan.entryCents < 0 ||
    plan.entryCents > expense.contractedCents
  )
    throw new Error('A entrada não pode ultrapassar o valor contratado.');
  const rest = expense.contractedCents - plan.entryCents;
  if (
    !Number.isInteger(plan.count) ||
    plan.count < 1 ||
    plan.count > 120 ||
    (rest > 0 && rest < plan.count)
  )
    throw new Error('Informe entre 1 e 120 parcelas, com valor mínimo de um centavo.');
  const result: Installment[] = [];
  const add = (amountCents: number, dueDate: string, label: string) =>
    result.push({
      id: crypto.randomUUID(),
      weddingId: expense.weddingId,
      expenseId: expense.id,
      number: result.length + 1,
      label,
      amountCents,
      dueDate,
    });
  if (plan.entryCents > 0) add(plan.entryCents, expense.dueDate, 'Entrada');
  if (rest > 0) {
    const base = Math.floor(rest / plan.count);
    for (let i = 0; i < plan.count; i++)
      add(
        base + (i === plan.count - 1 ? rest % plan.count : 0),
        shiftMonth(plan.firstDueDate, i),
        plan.count === 1 ? 'Pagamento integral' : `Parcela ${i + 1}/${plan.count}`,
      );
  }
  if (result.some((i) => !isCalendarDate(i.dueDate)))
    throw new Error('Os vencimentos gerados estão fora do intervalo permitido.');
  return result;
}
export function installmentBalance(installment: Installment, transactions: FinanceTransaction[]) {
  const entries = transactions.filter((t) => t.installmentId === installment.id && !t.voidedAt);
  const sum = (kind: FinanceTransaction['kind']) =>
    entries.filter((t) => t.kind === kind).reduce((s, t) => s + t.amountCents, 0);
  const paid = sum('payment') - sum('refund');
  const due = installment.amountCents + sum('interest') + sum('fine') - sum('discount');
  return { due, paid, open: due - paid };
}
export function expenseBalance(ledger: FinanceLedger, expense: Expense) {
  return ledger.installments
    .filter((i) => i.expenseId === expense.id)
    .reduce(
      (s, i) => {
        const b = installmentBalance(i, ledger.transactions);
        return { due: s.due + b.due, paid: s.paid + b.paid, open: s.open + b.open };
      },
      { due: 0, paid: 0, open: 0 },
    );
}
export function expenseStatus(ledger: FinanceLedger, e: Expense, today = localToday()) {
  if (e.status === 'cancelled') return 'Cancelada';
  if (e.status === 'planned') return 'Planejada';
  const b = expenseBalance(ledger, e);
  if (b.open === 0) return 'Paga';
  if (
    ledger.installments.some(
      (i) =>
        i.expenseId === e.id &&
        i.dueDate < today &&
        installmentBalance(i, ledger.transactions).open > 0,
    )
  )
    return 'Vencida';
  return b.paid > 0 ? 'Parcialmente paga' : 'Contratada';
}
// Presentation only: never rewrite cancelled installments or their audit history.
export function expenseDisplay(ledger: FinanceLedger, expense: Expense) {
  const balance = expenseBalance(ledger, expense);
  const nextDueDate =
    expense.status === 'contracted'
      ? (ledger.installments
          .filter(
            (i) =>
              i.expenseId === expense.id && installmentBalance(i, ledger.transactions).open > 0,
          )
          .map((i) => i.dueDate)
          .sort()[0] ?? null)
      : null;
  return { ...balance, open: expense.status === 'cancelled' ? 0 : balance.open, nextDueDate };
}
export function financeSummary(ledger: FinanceLedger, initialBudget: number, today = localToday()) {
  const expenses = ledger.expenses.filter((e) => e.status !== 'cancelled');
  const contracted = expenses.filter((e) => e.status === 'contracted');
  const totals = contracted.reduce(
    (s, e) => {
      const b = expenseBalance(ledger, e);
      return { due: s.due + b.due, paid: s.paid + b.paid, open: s.open + b.open };
    },
    { due: 0, paid: 0, open: 0 },
  );
  const bills = ledger.installments
    .filter((i) => contracted.some((e) => e.id === i.expenseId))
    .map((i) => ({ ...i, ...installmentBalance(i, ledger.transactions) }));
  const budget = ledger.budgetCents ?? cents(initialBudget);
  return {
    budget,
    reserve: ledger.reserveCents,
    planned: expenses.reduce((s, e) => s + e.plannedCents, 0),
    contracted: totals.due,
    paid: totals.paid,
    open: totals.open,
    available: budget - ledger.reserveCents - totals.due,
    overdue: bills.filter((i) => i.dueDate < today).reduce((s, i) => s + i.open, 0),
    bills,
    used: budget > 0 ? (totals.due / budget) * 100 : 0,
  };
}
export function validateAttachment(file?: LocalAttachment) {
  if (
    file &&
    (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.data.length > 1400000 ||
      !file.data.startsWith(`data:${file.type};base64,`))
  )
    throw new Error('Anexe PDF ou imagem de até 1 MB.');
}
export function validateLedger(ledger: FinanceLedger) {
  const ids = [
    ...ledger.categories,
    ...ledger.expenses,
    ...ledger.installments,
    ...ledger.transactions,
    ...ledger.audit,
  ];
  if (
    ids.some((e) => e.weddingId !== ledger.weddingId) ||
    new Set(ids.map((e) => e.id)).size !== ids.length
  )
    throw new Error('Relacionamentos financeiros inválidos.');
  for (const e of ledger.expenses) {
    if (!ledger.categories.some((c) => c.id === e.categoryId))
      throw new Error('Categoria não encontrada.');
    if (
      e.status !== 'planned' &&
      ledger.installments
        .filter((i) => i.expenseId === e.id)
        .reduce((s, i) => s + i.amountCents, 0) !== e.contractedCents
    )
      throw new Error('As parcelas devem somar o valor contratado.');
  }
  for (const i of ledger.installments) {
    const expense = ledger.expenses.find((e) => e.id === i.expenseId);
    if (!expense || expense.status === 'planned' || !isCalendarDate(i.dueDate))
      throw new Error('Parcela inválida.');
    const b = installmentBalance(i, ledger.transactions);
    if (b.due < 0 || b.paid < 0 || b.open < 0)
      throw new Error('A operação ultrapassa o saldo disponível da parcela.');
  }
  for (const t of ledger.transactions) {
    const i = ledger.installments.find((i) => i.id === t.installmentId);
    if (!i || i.expenseId !== t.expenseId) throw new Error('Lançamento sem parcela válida.');
    if (t.kind === 'refund' && !t.voidedAt) {
      const p = ledger.transactions.find(
        (p) =>
          p.id === t.paymentId &&
          p.kind === 'payment' &&
          !p.voidedAt &&
          p.installmentId === t.installmentId,
      );
      if (
        !p ||
        ledger.transactions
          .filter((r) => r.kind === 'refund' && !r.voidedAt && r.paymentId === p.id)
          .reduce((s, r) => s + r.amountCents, 0) > p.amountCents
      )
        throw new Error('A devolução ultrapassa o pagamento original.');
    }
  }
}
