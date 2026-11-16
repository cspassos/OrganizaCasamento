import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { FINANCE_REPOSITORY } from '../repositories/finance.repository';
import { WeddingsService } from './weddings';
import {
  ExpenseDraft,
  FinanceLedger,
  FinanceTransaction,
  InstallmentPlan,
  LocalAttachment,
  transactionLabels,
} from '../models/finance';
import {
  cents,
  emptyLedger,
  expenseBalance,
  expenseDisplay,
  expenseStatus,
  financeSummary,
  localToday,
  makeInstallments,
  validateAttachment,
  validateLedger,
  installmentBalance,
  money,
} from '../utils/finance';
import { isCalendarDate } from '../utils/wedding';
import { NavigationEnd, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  weddings = inject(WeddingsService);
  private repository = inject(FINANCE_REPOSITORY);
  private records = signal<FinanceLedger[]>([]);
  private empty = new Map<string, FinanceLedger>();
  private revision = 0;
  private loadRequest = 0;
  private channel?: BroadcastChannel;
  private destroyed = false;
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  readonly initialized: Promise<void>;
  today = signal(localToday());
  ledger = computed(() => {
    const id = this.weddings.active()?.id;
    if (!id) return null;
    let record = this.records().find((l) => l.id === id);
    if (!record) {
      if (!this.empty.has(id)) this.empty.set(id, emptyLedger(id));
      record = this.empty.get(id)!;
    }
    return record;
  });
  summary = computed(() => {
    const l = this.ledger();
    return l ? financeSummary(l, this.weddings.active()?.initialBudget ?? 0, this.today()) : null;
  });
  expenseRows = computed(() => {
    const l = this.ledger();
    return l
      ? l.expenses.map((e) => ({
          ...e,
          ...expenseDisplay(l, e),
          situation: expenseStatus(l, e, this.today()),
        }))
      : [];
  });
  constructor() {
    this.initialized = this.load();
    const sync = () => {
      if (!this.loading() && !this.busy()) void this.refresh(true);
    };
    const visible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel('organiza-casamento-finance');
        this.channel.onmessage = () => sync();
      }
    } catch {
      /* Focus and navigation still refresh when channels are unavailable. */
    }
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', visible);
    const subscription = inject(Router, { optional: true })?.events.subscribe((event) => {
      if (
        event instanceof NavigationEnd &&
        (event.urlAfterRedirects.startsWith('/financeiro') ||
          event.urlAfterRedirects.startsWith('/dashboard'))
      )
        sync();
    });
    const timer = setInterval(() => this.today.set(localToday()), 60000);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearInterval(timer);
      this.channel?.close();
      subscription?.unsubscribe();
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', visible);
    });
  }
  private async load() {
    const request = ++this.loadRequest,
      revision = this.revision;
    try {
      await this.weddings.initialized;
      const records = await this.repository.list();
      if (!this.destroyed && request === this.loadRequest && revision === this.revision) {
        this.records.set(records);
        this.error.set('');
      }
    } catch {
      this.error.set(
        'Não foi possível abrir os dados financeiros. Recarregue a página para tentar novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  async refresh(silent = false) {
    if (!silent) this.loading.set(true);
    this.error.set('');
    await this.load();
    this.today.set(localToday());
  }
  private async mutate(
    weddingId: string,
    action: string,
    entityId: string,
    operation: (ledger: FinanceLedger) => void,
    ensureSupplierFor?: string,
  ) {
    await this.initialized;
    if (this.error() || this.weddings.error())
      throw new Error('Os dados não puderam ser carregados. Recarregue antes de gravar.');
    if (this.busy()) throw new Error('Aguarde a operação em andamento.');
    if (this.weddings.active()?.id !== weddingId)
      throw new Error('O casamento selecionado mudou. Abra o cadastro novamente.');
    const fallback = this.ledger()!;
    this.busy.set(true);
    try {
      const updated = await this.repository.update(
        weddingId,
        (existing) => {
          const ledger = structuredClone(existing ?? fallback);
          operation(ledger);
          validateLedger(ledger);
          ledger.audit.push({
            id: crypto.randomUUID(),
            weddingId,
            at: new Date().toISOString(),
            action,
            entityId,
            detail: action,
          });
          return ledger;
        },
        ensureSupplierFor,
      );
      this.records.update((all) => [...all.filter((l) => l.id !== weddingId), updated]);
      this.revision++;
      try {
        if (!this.destroyed) this.channel?.postMessage({ weddingId });
      } catch {
        /* Notification failure must not turn a committed payment into an error. */
      }
    } finally {
      this.busy.set(false);
    }
  }
  async budget(weddingId: string, total: number, reserve: number) {
    const b = cents(total),
      r = cents(reserve);
    if (r > b) throw new Error('A reserva não pode ultrapassar o orçamento geral.');
    await this.mutate(weddingId, 'Orçamento atualizado', weddingId, (l) => {
      l.budgetCents = b;
      l.reserveCents = r;
    });
  }
  async category(weddingId: string, id: string | null, name: string, budget: number) {
    if (!name.trim() || name.trim().length > 100)
      throw new Error('Informe um nome de categoria com até 100 caracteres.');
    const amount = cents(budget),
      key = id ?? crypto.randomUUID();
    await this.mutate(weddingId, 'Categoria salva', key, (l) => {
      if (
        l.categories.some(
          (c) =>
            c.id !== key &&
            c.name.toLocaleLowerCase('pt-BR') === name.trim().toLocaleLowerCase('pt-BR'),
        )
      )
        throw new Error('Já existe uma categoria com esse nome.');
      const c = l.categories.find((c) => c.id === key);
      if (id && !c) throw new Error('Categoria não encontrada.');
      if (c) {
        c.name = name.trim();
        c.budgetCents = amount;
      } else l.categories.push({ id: key, weddingId, name: name.trim(), budgetCents: amount });
    });
  }
  async removeCategory(weddingId: string, id: string) {
    await this.mutate(weddingId, 'Categoria excluída', id, (l) => {
      if (l.expenses.some((e) => e.categoryId === id))
        throw new Error('Esta categoria está vinculada a despesas e não pode ser excluída.');
      l.categories = l.categories.filter((c) => c.id !== id);
    });
  }
  async saveExpense(weddingId: string, id: string, draft: ExpenseDraft, plan: InstallmentPlan) {
    if (!draft.description.trim() || draft.description.trim().length > 200)
      throw new Error('Informe uma descrição com até 200 caracteres.');
    for (const value of [draft.plannedCents, draft.contractedCents])
      if (!Number.isSafeInteger(value) || value < 0 || value > 99999999999)
        throw new Error('Informe valores válidos, sem números negativos.');
    if (
      !isCalendarDate(draft.dueDate) ||
      (draft.contractDate && !isCalendarDate(draft.contractDate))
    )
      throw new Error('Informe datas válidas.');
    if (draft.status === 'contracted' && (draft.contractedCents <= 0 || !draft.contractDate))
      throw new Error('Informe o valor e a data da contratação.');
    validateAttachment(draft.attachment);
    await this.mutate(
      weddingId,
      'Despesa salva',
      id,
      (l) => {
        const previous = l.expenses.find((e) => e.id === id);
        if (previous?.status === 'cancelled')
          throw new Error('Despesas canceladas não podem ser alteradas.');
        const history = l.transactions.some((t) => t.expenseId === id);
        if (
          history &&
          (previous!.contractedCents !== draft.contractedCents || draft.status !== 'contracted')
        )
          throw new Error(
            'O valor contratado e o parcelamento têm histórico. Registre descontos, juros ou devoluções no detalhe da despesa.',
          );
        const value = {
          ...draft,
          supplierId: draft.supplierId ?? previous?.supplierId,
          contractId: draft.contractId ?? previous?.contractId,
          professionalId: draft.professionalId ?? previous?.professionalId,
          id,
          weddingId,
          description: draft.description.trim(),
          contractedCents: draft.status === 'planned' ? 0 : draft.contractedCents,
          createdAt: previous?.createdAt ?? new Date().toISOString(),
        };
        if (!history) {
          l.installments = l.installments.filter((i) => i.expenseId !== id);
          if (value.status === 'contracted') l.installments.push(...makeInstallments(value, plan));
        }
        l.expenses = [...l.expenses.filter((e) => e.id !== id), value];
      },
      id,
    );
  }
  async deletePriceResearch(weddingId: string, id: string) {
    await this.mutate(weddingId, 'Pesquisa de preço excluída', id, (l) => {
      const e = l.expenses.find((e) => e.id === id);
      if (!e) throw new Error('Pesquisa não encontrada.');
      if (
        e.status !== 'planned' ||
        e.contractId ||
        e.professionalId ||
        l.transactions.some((t) => t.expenseId === id) ||
        l.installments.some((i) => i.expenseId === id)
      )
        throw new Error('Só é possível excluir pesquisas de preço sem contratação ou pagamentos.');
      l.expenses = l.expenses.filter((e) => e.id !== id);
    });
  }
  async cancelExpense(weddingId: string, id: string) {
    await this.mutate(weddingId, 'Despesa cancelada', id, (l) => {
      const e = l.expenses.find((e) => e.id === id);
      if (!e) throw new Error('Despesa não encontrada.');
      if (expenseBalance(l, e).paid !== 0)
        throw new Error('Registre a devolução ou desfaça os pagamentos antes de cancelar.');
      e.status = 'cancelled';
    });
  }
  async reschedule(weddingId: string, id: string, date: string) {
    if (!isCalendarDate(date)) throw new Error('Informe um vencimento válido.');
    await this.mutate(weddingId, 'Vencimento alterado', id, (l) => {
      const i = l.installments.find((i) => i.id === id);
      const e = l.expenses.find((e) => e.id === i?.expenseId);
      if (!i || e?.status !== 'contracted') throw new Error('Parcela indisponível.');
      i.dueDate = date;
    });
  }
  async transaction(
    weddingId: string,
    entry: Omit<FinanceTransaction, 'id' | 'weddingId' | 'createdAt' | 'voidedAt' | 'voidReason'>,
  ) {
    if (
      !Number.isSafeInteger(entry.amountCents) ||
      entry.amountCents <= 0 ||
      entry.amountCents > 99999999999
    )
      throw new Error('Informe um valor maior que zero.');
    if (!isCalendarDate(entry.date) || entry.date > localToday())
      throw new Error('A operação deve ter uma data válida, até hoje.');
    validateAttachment(entry.attachment);
    const id = crypto.randomUUID();
    if (!Object.hasOwn(transactionLabels, entry.kind)) throw new Error('Operação inválida.');
    await this.mutate(weddingId, 'Lançamento: ' + transactionLabels[entry.kind], id, (l) => {
      const e = l.expenses.find((e) => e.id === entry.expenseId);
      if (e?.status !== 'contracted')
        throw new Error('Registre operações apenas em despesas contratadas.');
      if (entry.kind === 'payment') {
        const installment = l.installments.find(
          (i) => i.id === entry.installmentId && i.expenseId === entry.expenseId,
        );
        if (!installment) throw new Error('Parcela não encontrada.');
        const balance = installmentBalance(installment, l.transactions);
        if (balance.open === 0)
          throw new Error(`${installment.label} já está paga. Escolha outra parcela em aberto.`);
        if (entry.amountCents > balance.open)
          throw new Error(
            `O pagamento ultrapassa o saldo de ${money(balance.open)} de ${installment.label}. Escolha outra parcela ou informe um valor menor.`,
          );
      }
      l.transactions.push({ ...entry, id, weddingId, createdAt: new Date().toISOString() });
    });
  }
  async voidTransaction(weddingId: string, id: string, reason: string) {
    if (!reason.trim()) throw new Error('Informe o motivo para desfazer a operação.');
    await this.mutate(weddingId, 'Lançamento desfeito', id, (l) => {
      const t = l.transactions.find((t) => t.id === id);
      if (!t || t.voidedAt) throw new Error('Lançamento indisponível.');
      if (
        t.kind === 'payment' &&
        l.transactions.some((r) => r.kind === 'refund' && !r.voidedAt && r.paymentId === t.id)
      )
        throw new Error('Este pagamento possui uma devolução ativa. Desfaça a devolução antes.');
      if (l.expenses.find((e) => e.id === t.expenseId)?.status === 'cancelled')
        throw new Error('O histórico de uma despesa cancelada não pode ser alterado.');
      t.voidedAt = new Date().toISOString();
      t.voidReason = reason.trim();
    });
  }
  async settle(
    weddingId: string,
    expenseId: string,
    expectedCents: number,
    date: string,
    method: string,
    notes: string,
    attachment?: LocalAttachment,
  ) {
    if (!isCalendarDate(date) || date > localToday())
      throw new Error('Informe uma data válida, até hoje.');
    validateAttachment(attachment);
    await this.mutate(weddingId, 'Quitação integral', expenseId, (l) => {
      const e = l.expenses.find((e) => e.id === expenseId);
      if (e?.status !== 'contracted') throw new Error('Despesa indisponível.');
      const open = expenseBalance(l, e).open;
      if (open <= 0 || open !== expectedCents)
        throw new Error('O saldo mudou ou já foi quitado. Atualize e tente novamente.');
      const bills = l.installments.filter((i) => i.expenseId === expenseId);
      let first = true;
      for (const i of bills) {
        const balance = installmentBalance(i, l.transactions);
        if (balance.open > 0) {
          l.transactions.push({
            id: crypto.randomUUID(),
            weddingId,
            expenseId,
            installmentId: i.id,
            kind: 'payment',
            amountCents: balance.open,
            date,
            method,
            notes,
            attachment: first ? attachment : undefined,
            createdAt: new Date().toISOString(),
          });
          first = false;
        }
      }
    });
  }
}
