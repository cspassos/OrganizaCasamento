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
} from './finance';
import { formatCalendarDate } from './wedding';
import type { FinanceReport, ReportFilter, ReportKind, ReportSection } from './finance-reports';
const stamp = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? 'Não informado'
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
};
export function enrichFinanceReport(
  l: FinanceLedger,
  initialBudget: number,
  kind: ReportKind,
  f: ReportFilter,
  report: FinanceReport,
): FinanceReport {
  const within = (date: string) =>
    kind === 'budget' || ((!f.from || date >= f.from) && (!f.to || date <= f.to));
  const today = localToday();
  const selected = l.expenses.filter(
    (e) =>
      (!f.categoryId || e.categoryId === f.categoryId) &&
      (kind === 'budget' || !f.status || expenseStatus(l, e) === f.status) &&
      (kind === 'budget' || kind === 'payments' || kind === 'monthly'
        ? true
        : kind === 'complete'
          ? within(e.dueDate) ||
            within(e.contractDate) ||
            l.installments.some((i) => i.expenseId === e.id && within(i.dueDate)) ||
            l.transactions.some((t) => t.expenseId === e.id && within(t.date))
          : kind === 'pending' || kind === 'overdue'
            ? l.installments.some((i) => i.expenseId === e.id && within(i.dueDate))
            : within(e.dueDate)),
  );
  const ids = new Set(selected.map((e) => e.id));
  const active = selected.filter((e) => e.status === 'contracted');
  const bills = l.installments
    .filter((i) => active.some((e) => e.id === i.expenseId))
    .map((i) => ({ ...i, ...installmentBalance(i, l.transactions) }));
  const sum = (key: 'due' | 'paid' | 'open') =>
    active.reduce((total, e) => total + expenseBalance(l, e)[key], 0);
  const tx = l.transactions.filter((t) => ids.has(t.expenseId));
  const live = tx.filter((t) => !t.voidedAt);
  const total = (type: (typeof tx)[number]['kind']) =>
    live.filter((t) => t.kind === type).reduce((s, t) => s + t.amountCents, 0);
  const summary = financeSummary(l, initialBudget);
  report.summary = [
    { label: 'Orçamento geral do casamento', value: money(summary.budget) },
    { label: 'Reserva para imprevistos', value: money(summary.reserve) },
    { label: 'Despesas no recorte', value: String(selected.length) },
    {
      label: 'Previsto ativo no recorte',
      value: money(
        selected.filter((e) => e.status !== 'cancelled').reduce((s, e) => s + e.plannedCents, 0),
      ),
    },
    { label: 'Contratado ajustado no recorte', value: money(sum('due')) },
    { label: 'Pago líquido acumulado no recorte', value: money(sum('paid')) },
    { label: 'Em aberto no recorte', value: money(sum('open')) },
    {
      label: 'Vencido e em aberto no recorte',
      value: money(
        bills.filter((i) => i.open > 0 && i.dueDate < today).reduce((s, i) => s + i.open, 0),
      ),
    },
    {
      label: 'Parcelas pagas / em aberto / vencidas',
      value: `${bills.filter((i) => i.open === 0).length} / ${bills.filter((i) => i.open > 0).length} / ${bills.filter((i) => i.open > 0 && i.dueDate < today).length}`,
    },
    {
      label: 'Descontos / juros / multas no recorte',
      value: `${money(total('discount'))} / ${money(total('interest'))} / ${money(total('fine'))}`,
    },
  ];
  report.summary.push(
    {
      label: 'Pagamentos efetivados brutos no histórico selecionado',
      value: money(total('payment')),
    },
    { label: 'Devoluções no histórico selecionado', value: money(total('refund')) },
    {
      label: 'A vencer / em dia no recorte',
      value: money(
        bills.filter((i) => i.open > 0 && i.dueDate >= today).reduce((s, i) => s + i.open, 0),
      ),
    },
    { label: 'Saldo disponível geral do casamento', value: money(summary.available) },
  );
  report.sections = [];
  if (kind === 'complete') {
    report.title = 'Relatório financeiro completo';
    report.columns = [
      'Despesa',
      'Categoria',
      'Fornecedor',
      'Situação',
      'Contratado ajustado',
      'Pago líquido',
      'Em aberto',
    ];
    report.rows = selected.map((e) => {
      const b = expenseDisplay(l, e);
      return [
        e.description,
        expenseCategoryNames(l, e),
        e.supplier || 'Não informado',
        expenseStatus(l, e),
        money(b.due),
        money(b.paid),
        money(b.open),
      ];
    });
    report.totalLabel = 'Contratado ativo no recorte';
    report.totalCents = sum('due');
    report.notes =
      'O período seleciona despesas com vencimento, contratação ou operações no intervalo. Para cada despesa selecionada, o detalhamento inclui todo o seu histórico, inclusive fora do período. Despesas canceladas e operações desfeitas são identificadas e excluídas dos totais ativos. Anexos são identificados pelo nome; seus arquivos permanecem no sistema.';
    report.sections.push({
      title: 'Orçamento e metas por categoria',
      columns: [
        'Categoria',
        'Meta',
        'Previsto ativo',
        'Contratado ajustado',
        'Pago líquido',
        'Em aberto',
      ],
      rows: l.categories
        .filter((c) => !f.categoryId || c.id === f.categoryId)
        .filter((c) => c.budgetCents > 0 || selected.some((e) => e.categoryId === c.id))
        .map((c) => {
          const es = selected.filter((e) => e.categoryId === c.id && e.status !== 'cancelled'),
            bs = es.filter((e) => e.status === 'contracted').map((e) => expenseBalance(l, e));
          return [
            c.name,
            money(c.budgetCents),
            money(es.reduce((s, e) => s + e.plannedCents, 0)),
            money(bs.reduce((s, b) => s + b.due, 0)),
            money(bs.reduce((s, b) => s + b.paid, 0)),
            money(bs.reduce((s, b) => s + b.open, 0)),
          ];
        }),
    });
  }
  if (kind === 'complete' || kind === 'expenses') {
    if (kind === 'expenses')
      report.notes +=
        ' O detalhamento mostra o histórico completo das despesas selecionadas, independentemente da data das operações.';
    for (const e of selected) {
      const b = expenseBalance(l, e),
        operations = tx
          .filter((t) => t.expenseId === e.id)
          .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
      const payments = operations
          .filter((t) => !t.voidedAt && t.kind === 'payment')
          .reduce((s, t) => s + t.amountCents, 0),
        refunds = operations
          .filter((t) => !t.voidedAt && t.kind === 'refund')
          .reduce((s, t) => s + t.amountCents, 0);
      const installments = l.installments
        .filter((i) => i.expenseId === e.id)
        .sort((a, b) => a.number - b.number);
      const state = (i: (typeof installments)[number]) => {
        const balance = installmentBalance(i, l.transactions);
        return e.status === 'cancelled'
          ? 'Cancelada'
          : balance.open === 0
            ? 'Pago'
            : i.dueDate < today
              ? 'Vencida'
              : balance.paid > 0
                ? 'Parcialmente paga'
                : 'Em aberto';
      };
      report.sections.push({
        title: `Despesa: ${e.description}`,
        columns: ['Informação', 'Detalhe'],
        rows: [
          ['Categoria', expenseCategoryNames(l, e)],
          ['Fornecedor', e.supplier || 'Não informado'],
          ['Situação', expenseStatus(l, e)],
          ['Valor previsto', money(e.plannedCents)],
          ['Contratado original', money(e.contractedCents)],
          ['Contratado com ajustes', money(b.due)],
          ['Pagamentos registrados (bruto)', money(payments)],
          ['Devoluções de pagamentos', money(refunds)],
          ['Pago líquido', money(b.paid)],
          [
            'Saldo em aberto',
            e.status === 'cancelled' ? 'Cancelada — fora dos totais' : money(b.open),
          ],
          ['Data da contratação', formatCalendarDate(e.contractDate)],
          ['Vencimento inicial / entrada', formatCalendarDate(e.dueDate)],
          ['Forma de pagamento prevista', e.method],
          ['Referência do contrato', e.contractReference || 'Não informada'],
          ['Observações da despesa', e.notes || 'Sem observações'],
          ['Anexo da despesa', e.attachment?.name ?? 'Sem anexo'],
          ['Cadastro em', stamp(e.createdAt)],
        ],
      });
      report.sections.push({
        title: `Parcelas de ${e.description}`,
        columns: [
          'Parcela',
          'Vencimento',
          'Original',
          'Ajustes líquidos',
          'Devido',
          'Pago líquido',
          'Saldo',
          'Situação',
        ],
        rows: installments.map((i) => {
          const ib = installmentBalance(i, l.transactions);
          return [
            i.label,
            formatCalendarDate(i.dueDate),
            money(i.amountCents),
            money(ib.due - i.amountCents),
            money(ib.due),
            money(ib.paid),
            money(e.status === 'cancelled' ? 0 : ib.open),
            state(i),
          ];
        }),
        states: installments.map(state),
        notes:
          'Ajustes líquidos = juros + multas - descontos. Somente parcelas ativas com saldo maior que zero podem estar vencidas.',
      });
      report.sections.push(operationSection(l, operations, `Operações de ${e.description}`));
      const related = new Set([
        e.id,
        ...installments.map((i) => i.id),
        ...operations.map((t) => t.id),
      ]);
      report.sections.push({
        title: `Histórico de alterações de ${e.description}`,
        columns: ['Data e hora', 'Ação', 'Registro relacionado', 'Detalhe'],
        rows: l.audit
          .filter((a) => related.has(a.entityId))
          .sort((a, b) => a.at.localeCompare(b.at))
          .map((a) => [
            stamp(a.at),
            a.action,
            readableReference(l, a.entityId, a.action),
            a.detail,
          ]),
      });
    }
  } else {
    const relevant = tx.filter((t) => within(t.date));
    report.sections.push(
      operationSection(l, relevant, 'Detalhamento das operações no período (inclui desfeitas)'),
    );
    if (kind === 'pending' || kind === 'overdue')
      report.notes +=
        ' As contas refletem o saldo atual; o detalhamento de operações utiliza a data da operação.';
  }
  if (kind === 'complete') {
    const references = new Set(
      selected.flatMap((e) => [
        e.id,
        ...l.installments.filter((i) => i.expenseId === e.id).map((i) => i.id),
        ...tx.filter((t) => t.expenseId === e.id).map((t) => t.id),
      ]),
    );
    report.sections.push({
      title: 'Histórico adicional de orçamento e categorias',
      columns: ['Data e hora', 'Ação', 'Registro relacionado', 'Detalhe registrado'],
      rows: l.audit
        .filter(
          (a) =>
            !references.has(a.entityId) &&
            (!f.categoryId || a.entityId === f.categoryId || a.entityId === l.id),
        )
        .map((a) => [stamp(a.at), a.action, readableReference(l, a.entityId, a.action), a.detail]),
      notes:
        'Complementa o histórico individual das despesas com as demais alterações financeiras registradas.',
    });
  }
  return report;
}
function operationSection(
  l: FinanceLedger,
  operations: FinanceLedger['transactions'],
  title: string,
): ReportSection {
  return {
    title,
    columns: [
      'Data / registro',
      'Operação',
      'Despesa / parcela',
      'Valor / forma',
      'Situação / estorno',
      'Observações / comprovante',
    ],
    rows: operations.map((t) => {
      const installment = l.installments.find((i) => i.id === t.installmentId);
      return [
        `${formatCalendarDate(t.date)}\nRegistrado: ${stamp(t.createdAt)}`,
        transactionLabels[t.kind],
        `${l.expenses.find((e) => e.id === t.expenseId)?.description ?? ''}\n${installment?.label ?? ''}`,
        `${money(t.amountCents)}\n${t.method}`,
        (t.voidedAt
          ? `Desfeita em ${stamp(t.voidedAt)}\nMotivo: ${t.voidReason ?? ''}`
          : 'Efetivada') +
          (t.paymentId ? '\nPagamento original: ' + readableReference(l, t.paymentId) : ''),
        `${t.notes || 'Sem observações'}\nComprovante: ${t.attachment?.name ?? 'Sem anexo'}`,
      ];
    }),
    states: operations.map((t) => (t.voidedAt ? 'Desfeita' : 'Efetivada')),
    notes:
      'Operações desfeitas permanecem visíveis para auditoria, sem entrar nos saldos. Devoluções reduzem o total pago; descontos, juros e multas ajustam a dívida.',
  };
}
function readableReference(l: FinanceLedger, id: string, action = ''): string {
  const expense = l.expenses.find((e) => e.id === id);
  if (expense) return expense.description;
  const installment = l.installments.find((i) => i.id === id);
  if (installment)
    return `${l.expenses.find((e) => e.id === installment.expenseId)?.description ?? 'Despesa'} · ${installment.label}`;
  const operation = l.transactions.find((t) => t.id === id);
  if (operation) {
    const bill = l.installments.find((i) => i.id === operation.installmentId);
    return `${transactionLabels[operation.kind]} de ${money(operation.amountCents)} em ${formatCalendarDate(operation.date)} · ${l.expenses.find((e) => e.id === operation.expenseId)?.description ?? 'Despesa'} · ${bill?.label ?? 'Parcela'}`;
  }
  const category = l.categories.find((c) => c.id === id);
  if (category) return `Categoria: ${category.name}`;
  if (id === l.id) return 'Orçamento geral';
  return action.toLocaleLowerCase('pt-BR').includes('categoria')
    ? 'Categoria removida'
    : 'Registro financeiro';
}
