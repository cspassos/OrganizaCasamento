import { Wedding } from '../../core/models/models';
import { Expense, FinanceLedger, FinanceTransaction } from '../../core/models/finance';
import {
  emptyLedger,
  localToday,
  makeInstallments,
  validateLedger,
} from '../../core/utils/finance';

export function testDate(offset: number, today = localToday()) {
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + offset));
  return date.toISOString().slice(0, 10);
}
export function buildTemporarySeed(today = localToday()): {
  wedding: Wedding;
  ledger: FinanceLedger;
} {
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  const wedding: Wedding = {
    id,
    name: '[TESTE] Clara e Lucas — Etapas 01 a 03',
    temporarySeed: true,
    demo: false,
    date: testDate(180, today),
    brideName: 'Clara Oliveira',
    groomName: 'Lucas Santos',
    ceremonyTime: '16:00',
    receptionTime: '18:00',
    ceremonyType: 'Simbólica',
    style: 'Rústico elegante',
    theme: 'Jardim ao entardecer',
    colors: 'Verde-sálvia, marfim e dourado',
    colorPalette: ['#64765b', '#f3ede0', '#b09252'],
    initialBudget: 80000,
    estimatedGuests: 120,
    capacity: 150,
    city: 'São Paulo',
    state: 'SP',
    ceremonyVenue: 'Jardim das Oliveiras (fictício)',
    ceremonyAddress: 'Endereço fictício para testes',
    receptionVenue: 'Salão das Oliveiras (fictício)',
    receptionAddress: 'Endereço fictício para testes',
    notes:
      'Massa temporária. Todos os nomes e lançamentos são fictícios. Pode editar à vontade e remover pelo botão de massa de teste.',
    createdAt: now,
    updatedAt: now,
  };
  const ledger = emptyLedger(id);
  ledger.budgetCents = 8000000;
  ledger.reserveCents = 500000;
  for (const [name, amount] of [
    ['Buffet', 2500000],
    ['Recepção', 1500000],
    ['Decoração', 800000],
    ['Fotografia', 600000],
    ['Música', 400000],
    ['Bebidas', 400000],
    ['Vestido', 400000],
    ['Bolo', 200000],
    ['Convites', 100000],
  ] as const)
    ledger.categories.find((c) => c.name === name)!.budgetCents = amount;
  const audit = (action: string, entityId: string, detail: string) =>
    ledger.audit.push({
      id: crypto.randomUUID(),
      weddingId: id,
      at: now,
      action,
      entityId,
      detail,
    });
  const expense = (
    description: string,
    category: string,
    amount: number,
    dueOffset: number,
    count = 1,
    entry = 0,
    planned = false,
  ) => {
    const e: Expense = {
      id: crypto.randomUUID(),
      weddingId: id,
      description,
      categoryId: ledger.categories.find((c) => c.name === category)!.id,
      supplier: `${category} Exemplo (fictício)`,
      plannedCents: amount,
      contractedCents: planned ? 0 : amount,
      status: planned ? 'planned' : 'contracted',
      contractDate: planned ? '' : testDate(-45, today),
      dueDate: testDate(dueOffset, today),
      method: 'PIX',
      notes: 'Registro fictício da massa temporária.',
      contractReference: `TESTE-${ledger.expenses.length + 1}`,
      createdAt: now,
    };
    ledger.expenses.push(e);
    if (!planned)
      ledger.installments.push(
        ...makeInstallments(e, {
          entryCents: entry,
          count,
          firstDueDate: testDate(dueOffset + (entry ? 30 : 0), today),
        }),
      );
    audit('Despesa salva', e.id, `Cadastro de teste: ${description}`);
    return e;
  };
  const tx = (
    e: Expense,
    index: number,
    kind: FinanceTransaction['kind'],
    amount: number,
    offset: number,
    extra: Partial<FinanceTransaction> = {},
  ) => {
    const installment = ledger.installments.filter((i) => i.expenseId === e.id)[index];
    const t: FinanceTransaction = {
      id: crypto.randomUUID(),
      weddingId: id,
      expenseId: e.id,
      installmentId: installment.id,
      kind,
      amountCents: amount,
      date: testDate(offset, today),
      method: 'PIX',
      notes: 'Operação fictícia para conferir saldos e relatórios.',
      createdAt: now,
      ...extra,
    };
    ledger.transactions.push(t);
    audit('Lançamento: ' + kind, t.id, t.notes);
    return t;
  };
  const buffet = expense('Buffet — entrada paga e parcelas', 'Buffet', 2400000, -40, 5, 400000);
  tx(buffet, 0, 'payment', 400000, -40);
  tx(buffet, 1, 'payment', 150000, -8);
  const venue = expense('Espaço da recepção — quitado', 'Recepção', 1400000, -25);
  tx(venue, 0, 'payment', 1400000, -25);
  const decoration = expense('Decoração — parcela vencida', 'Decoração', 850000, -7, 2);
  tx(decoration, 0, 'fine', 15000, -5);
  tx(decoration, 0, 'interest', 5000, -4);
  const photo = expense('Fotografia — pagamento parcial', 'Fotografia', 600000, 15, 3);
  tx(photo, 0, 'payment', 100000, -2);
  expense('Bebidas — vence em 3 dias', 'Bebidas', 350000, 3);
  const cake = expense('Bolo e doces — com desconto', 'Bolo', 200000, -10);
  tx(cake, 0, 'discount', 20000, -12);
  tx(cake, 0, 'payment', 180000, -10);
  const music = expense('DJ — devolução parcial de sinal', 'DJ', 300000, 30);
  const original = tx(music, 0, 'payment', 100000, -15);
  tx(music, 0, 'refund', 25000, -3, { paymentId: original.id });
  const dress = expense('Vestido — operação corrigida', 'Vestido', 400000, 40, 2);
  const correction = tx(dress, 0, 'payment', 50000, -5, {
    voidedAt: now,
    voidReason: 'Pagamento de teste lançado com valor incorreto.',
  });
  audit('Lançamento desfeito', correction.id, correction.voidReason!);
  tx(dress, 0, 'payment', 75000, -4);
  expense('Convites — somente previsão', 'Convites', 90000, 60, 1, 0, true);
  expense('Flores — aguardando contratação', 'Flores', 150000, 75, 1, 0, true);
  const cancelled = expense('Transporte — reserva cancelada', 'Transporte', 180000, 50);
  cancelled.status = 'cancelled';
  audit('Despesa cancelada', cancelled.id, 'Reserva fictícia cancelada sem pagamento.');
  expense('Maquiagem — pagamento futuro', 'Maquiagem', 120000, 90, 2);
  audit(
    'Orçamento atualizado',
    id,
    'Orçamento fictício de R$ 80.000,00 com reserva de R$ 5.000,00.',
  );
  validateLedger(ledger);
  return { wedding, ledger };
}
