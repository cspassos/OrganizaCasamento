import { FinanceLedger, transactionLabels } from '../models/finance';
import {
  expenseBalance,
  expenseCategoryNames,
  expenseDisplay,
  expenseStatus,
  financeSummary,
  installmentBalance,
  localToday,
  money,
  periodError,
} from './finance';
import { formatCalendarDate } from './wedding';
import { enrichFinanceReport } from './finance-report-details';
export type ReportKind =
  'complete' | 'budget' | 'expenses' | 'payments' | 'pending' | 'overdue' | 'suppliers' | 'monthly';
export interface ReportFilter {
  from: string;
  to: string;
  categoryId: string;
  status: string;
}
export interface FinanceReport {
  summary?: { label: string; value: string }[];
  sections?: ReportSection[];
  title: string;
  columns: string[];
  rows: string[][];
  totalLabel: string;
  totalCents: number;
  notes: string;
}
export interface ReportSection {
  title: string;
  columns: string[];
  rows: string[][];
  notes?: string;
  states?: string[];
}
export const reportNames: Record<ReportKind, string> = {
  complete: 'Relatório financeiro completo',
  budget: 'Orçamento por categoria',
  expenses: 'Despesas previstas e contratadas',
  payments: 'Pagamentos e ajustes',
  pending: 'Parcelas pendentes',
  overdue: 'Contas vencidas',
  suppliers: 'Gastos por fornecedor',
  monthly: 'Pagamentos por mês',
};
export function buildFinanceReport(
  l: FinanceLedger,
  initialBudget: number,
  kind: ReportKind,
  f: ReportFilter,
): FinanceReport {
  const base = buildBaseFinanceReport(
    l,
    initialBudget,
    kind === 'complete' ? 'expenses' : kind,
    kind === 'complete' ? { ...f, from: '', to: '' } : f,
  );
  if (kind !== 'budget' && periodError(f.from, f.to))
    return {
      ...base,
      rows: [],
      notes: periodError(f.from, f.to),
      totalLabel: 'Período inválido',
      totalCents: 0,
    };
  return enrichFinanceReport(l, initialBudget, kind, f, base);
}
function buildBaseFinanceReport(
  l: FinanceLedger,
  initialBudget: number,
  kind: Exclude<ReportKind, 'complete'>,
  f: ReportFilter,
): FinanceReport {
  const within = (date: string) => (!f.from || date >= f.from) && (!f.to || date <= f.to);
  const matching = l.expenses.filter(
    (e) =>
      (!f.categoryId || e.categoryId === f.categoryId) &&
      (!f.status || expenseStatus(l, e) === f.status),
  );
  const expenses = matching.filter((e) => within(e.dueDate));
  const report: FinanceReport = {
    title: reportNames[kind],
    columns: [],
    rows: [],
    totalLabel: '',
    totalCents: 0,
    notes: 'Valores em reais. Cancelamentos e operações desfeitas não compõem os totais ativos.',
  };
  if (kind !== 'budget' && periodError(f.from, f.to)) {
    report.notes = periodError(f.from, f.to);
    report.totalLabel = 'Período inválido';
    return report;
  }
  if (kind === 'budget') {
    const summary = financeSummary(l, initialBudget);
    report.columns = ['Categoria', 'Meta', 'Previsto', 'Contratado', 'Pago', 'Em aberto'];
    report.rows = l.categories
      .filter((c) => !f.categoryId || c.id === f.categoryId)
      .filter((c) => c.budgetCents > 0 || l.expenses.some((e) => e.categoryId === c.id))
      .map((c) => {
        const es = l.expenses.filter((e) => e.categoryId === c.id && e.status !== 'cancelled');
        const balances = es
          .filter((e) => e.status === 'contracted')
          .map((e) => expenseBalance(l, e));
        return [
          c.name,
          money(c.budgetCents),
          money(es.reduce((s, e) => s + e.plannedCents, 0)),
          money(balances.reduce((s, b) => s + b.due, 0)),
          money(balances.reduce((s, b) => s + b.paid, 0)),
          money(balances.reduce((s, b) => s + b.open, 0)),
        ];
      });
    report.totalLabel = 'Orçamento geral';
    report.totalCents = summary.budget;
    report.notes = `Visão geral, sem filtro de período ou situação. Reserva: ${money(summary.reserve)}. Disponível após reserva e compromissos: ${money(summary.available)}.`;
  } else if (kind === 'expenses') {
    report.columns = [
      'Despesa',
      'Categoria / fornecedor',
      'Situação',
      'Previsto',
      'Contratado',
      'Pago / aberto',
    ];
    report.rows = expenses.map((e) => {
      const b = expenseDisplay(l, e);
      return [
        e.description,
        `${expenseCategoryNames(l, e) || 'Categoria indisponível'} / ${e.supplier || 'Não informado'}`,
        expenseStatus(l, e),
        money(e.plannedCents),
        money(b.due),
        `${money(b.paid)} / ${money(b.open)}`,
      ];
    });
    report.totalLabel = 'Contratado ativo no filtro';
    report.totalCents = expenses
      .filter((e) => e.status === 'contracted')
      .reduce((s, e) => s + expenseBalance(l, e).due, 0);
    report.notes += ' Período pelo vencimento inicial da despesa.';
  } else if (kind === 'pending' || kind === 'overdue') {
    const rows = l.installments
      .map((i) => ({ ...i, ...installmentBalance(i, l.transactions) }))
      .filter(
        (i) =>
          i.open > 0 &&
          matching.some((e) => e.id === i.expenseId && e.status === 'contracted') &&
          within(i.dueDate) &&
          (kind !== 'overdue' || i.dueDate < localToday()),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    report.columns = ['Despesa', 'Parcela', 'Vencimento', 'Valor', 'Pago', 'Saldo'];
    report.rows = rows.map((i) => [
      l.expenses.find((e) => e.id === i.expenseId)!.description,
      i.label,
      formatCalendarDate(i.dueDate),
      money(i.due),
      money(i.paid),
      money(i.open),
    ]);
    report.totalLabel = 'Saldo das contas no filtro';
    report.totalCents = rows.reduce((s, i) => s + i.open, 0);
  } else if (kind === 'suppliers') {
    const groups = new Map<string, { due: number; paid: number; open: number }>();
    for (const e of expenses.filter((e) => e.status === 'contracted')) {
      const key = e.supplier || 'Fornecedor não informado',
        b = expenseBalance(l, e),
        old = groups.get(key) ?? { due: 0, paid: 0, open: 0 };
      groups.set(key, { due: old.due + b.due, paid: old.paid + b.paid, open: old.open + b.open });
    }
    report.columns = ['Fornecedor', 'Contratado', 'Pago', 'Em aberto'];
    report.rows = [...groups].map(([name, b]) => [
      name,
      money(b.due),
      money(b.paid),
      money(b.open),
    ]);
    report.totalLabel = 'Total contratado no filtro';
    report.totalCents = [...groups.values()].reduce((s, b) => s + b.due, 0);
  } else {
    const ts = l.transactions.filter(
      (t) => !t.voidedAt && within(t.date) && matching.some((e) => e.id === t.expenseId),
    );
    report.totalLabel = 'Pagamentos líquidos no período';
    report.totalCents = ts.reduce(
      (s, t) =>
        s + (t.kind === 'payment' ? t.amountCents : t.kind === 'refund' ? -t.amountCents : 0),
      0,
    );
    if (kind === 'payments') {
      report.columns = ['Data', 'Despesa', 'Operação', 'Forma', 'Valor', 'Observação'];
      report.rows = ts
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((t) => [
          formatCalendarDate(t.date),
          l.expenses.find((e) => e.id === t.expenseId)!.description,
          transactionLabels[t.kind],
          t.method,
          money(t.amountCents),
          t.notes,
        ]);
    } else {
      const months = new Map<string, number>();
      for (const t of ts.filter((t) => t.kind === 'payment' || t.kind === 'refund'))
        months.set(
          t.date.slice(0, 7),
          (months.get(t.date.slice(0, 7)) ?? 0) +
            (t.kind === 'payment' ? t.amountCents : -t.amountCents),
        );
      report.columns = ['Mês', 'Pago líquido'];
      report.rows = [...months]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, value]) => [month.split('-').reverse().join('/'), money(value)]);
    }
    report.notes +=
      ' O total líquido considera pagamentos menos devoluções. Descontos, juros e multas são ajustes da dívida.';
  }
  return report;
}
export function reportCsv(report: FinanceReport, metadata: string[] = []) {
  const cell = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
  return (
    '\uFEFF' +
    (metadata.length
      ? metadata.map((value) => [value].map(cell).join(';')).join('\r\n') + '\r\n'
      : '') +
    [
      [report.title],
      [report.notes],
      ...(report.summary?.map((s) => [s.label, s.value]) ?? []),
      [],
      report.columns,
      ...report.rows,
      [report.totalLabel, money(report.totalCents)],
      ...(report.sections ?? []).flatMap((s) => [
        [],
        [s.title],
        ...(s.notes ? [[s.notes]] : []),
        s.columns,
        ...s.rows,
      ]),
    ]
      .map((row) => row.map(cell).join(';'))
      .join('\r\n')
  );
}
