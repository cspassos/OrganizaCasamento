import { Injectable, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SUPPLIERS_REPOSITORY } from '../repositories/suppliers.repository';
import {
  Supplier,
  SupplierQuote,
  SupplierContract,
  Professional,
  WorkShift,
  SuppliersLedger,
  ContractFinancePlan,
} from '../models/suppliers';
import { FinanceLedger } from '../models/finance';
import { emptySuppliers, localDateTime, validDateTime, taskLines } from '../utils/suppliers';
import { expenseBalance, expenseStatus, localToday, makeInstallments } from '../utils/finance';
import { formatPhone, validPhone, validEmail } from '../utils/contact';
import { WeddingsService } from './weddings';
import { FinanceService } from './finance';

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  weddings = inject(WeddingsService);
  finance = inject(FinanceService);
  private repository = inject(SUPPLIERS_REPOSITORY);
  private records = signal<SuppliersLedger[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  ledger = computed(() => {
    const id = this.weddings.active()?.id;
    return id ? (this.records().find((l) => l.id === id) ?? emptySuppliers(id)) : null;
  });
  summary = computed(() => {
    const l = this.ledger();
    return {
      total: l?.suppliers.filter((s) => s.status !== 'inactive').length ?? 0,
      contracted: l?.suppliers.filter((s) => s.status === 'contracted').length ?? 0,
      pendingContracts: l?.contracts.filter((c) => c.status === 'draft').length ?? 0,
      professionals: l?.professionals.length ?? 0,
      unconfirmed: l?.professionals.filter((p) => p.status === 'expected').length ?? 0,
      today:
        l?.shifts.filter(
          (s) =>
            s.status !== 'cancelled' &&
            s.start.slice(0, 10) <= this.finance.today() &&
            s.end.slice(0, 10) >= this.finance.today(),
        ).length ?? 0,
    };
  });
  roleCounts = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.ledger()?.professionals ?? []) map.set(p.role, (map.get(p.role) ?? 0) + 1);
    return [...map].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  });
  private revision = 0;
  private channel?: BroadcastChannel;
  private financeChannel?: BroadcastChannel;
  initialized = this.refresh();
  constructor() {
    const reload = () => {
      if (!this.loading() && !this.busy()) {
        void this.refresh(false);
        void this.finance.refresh(true);
      }
    };
    window.addEventListener('focus', reload);
    const sub = inject(Router).events.subscribe((e) => {
      if (e instanceof NavigationEnd) reload();
    });
    try {
      this.channel = new BroadcastChannel('organiza-casamento-suppliers');
      this.channel.onmessage = reload;
      this.financeChannel = new BroadcastChannel('organiza-casamento-finance');
      this.financeChannel.onmessage = () => {
        if (!this.busy()) void this.refresh(false);
      };
    } catch {
      /* Navigation and focus also refresh. */
    }
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      window.removeEventListener('focus', reload);
      this.channel?.close();
      this.financeChannel?.close();
    });
  }
  async refresh(show = true) {
    const revision = ++this.revision;
    if (show) this.loading.set(true);
    try {
      await this.weddings.initialized;
      const rows = await this.repository.list();
      if (revision === this.revision) {
        this.records.set(rows);
        this.error.set('');
      }
    } catch {
      if (revision === this.revision)
        this.error.set(
          'Não foi possível carregar fornecedores e equipe. Atualize os dados antes de continuar.',
        );
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }
  private async mutate(weddingId: string, action: (l: SuppliersLedger, f: FinanceLedger) => void) {
    await Promise.all([this.initialized, this.finance.initialized]);
    if (this.weddings.active()?.id !== weddingId)
      throw new Error('O casamento mudou. Abra o cadastro novamente.');
    if (this.error() || this.finance.error())
      throw new Error('Os dados não puderam ser carregados. Atualize antes de salvar.');
    if (this.busy() || this.finance.busy()) throw new Error('Aguarde a operação em andamento.');
    const fallback = this.finance.ledger()!;
    this.busy.set(true);
    try {
      const result = await this.repository.update(weddingId, action, fallback);
      this.revision++;
      this.records.update((rows) => [...rows.filter((r) => r.id !== weddingId), result.suppliers]);
      this.loading.set(false);
      await this.finance.refresh(true);
      try {
        this.channel?.postMessage(weddingId);
        this.financeChannel?.postMessage(weddingId);
      } catch {
        /* Persisted data remains saved. */
      }
    } finally {
      this.busy.set(false);
    }
  }
  supplierName(id: string) {
    return this.ledger()?.suppliers.find((s) => s.id === id)?.name ?? '';
  }
  paymentStatus(expenseId: string) {
    const l = this.finance.ledger(),
      e = l?.expenses.find((e) => e.id === expenseId);
    return l && e ? expenseStatus(l, e, this.finance.today()) : 'Sem despesa vinculada';
  }
  saveSupplier(value: Supplier) {
    if (!validPhone(value.phone) || !validPhone(value.whatsapp) || !validEmail(value.email))
      return Promise.reject(new Error('Confira telefone, WhatsApp e e-mail.'));
    return this.mutate(value.weddingId, (l, f) => {
      const s = {
        ...value,
        name: value.name.trim(),
        phone: formatPhone(value.phone),
        whatsapp: formatPhone(value.whatsapp),
        email: value.email.trim(),
      };
      l.suppliers = [...l.suppliers.filter((x) => x.id !== s.id), s];
      for (const e of f.expenses) if (e.supplierId === s.id) e.supplier = s.name;
    });
  }
  removeSupplier(id: string, weddingId: string) {
    return this.mutate(weddingId, (l, f) => {
      if (
        l.quotes.some((q) => q.supplierId === id) ||
        l.contracts.some((c) => c.supplierId === id) ||
        l.professionals.some((p) => p.supplierId === id) ||
        f.expenses.some((e) => e.supplierId === id)
      )
        throw new Error(
          'Este fornecedor possui propostas, contratos, profissionais ou despesas vinculadas. Remova os vínculos permitidos ou marque o fornecedor como inativo para preservar o histórico.',
        );
      l.suppliers = l.suppliers.filter((s) => s.id !== id);
    });
  }
  saveReview(id: string, weddingId: string, rating: number, review: string) {
    return this.mutate(weddingId, (l) => {
      const s = l.suppliers.find((s) => s.id === id);
      if (!s) throw new Error('Fornecedor não encontrado.');
      s.rating = rating;
      s.review = review.trim();
    });
  }
  saveQuote(value: SupplierQuote) {
    return this.mutate(value.weddingId, (l) => {
      const previous = l.quotes.find((q) => q.id === value.id);
      if (
        previous &&
        l.contracts.some((c) => c.quoteId === value.id) &&
        (value.supplierId !== previous.supplierId ||
          value.amountCents !== previous.amountCents ||
          value.service !== previous.service)
      )
        throw new Error(
          'Esta proposta já foi usada em um contrato. Crie uma nova proposta para alterar fornecedor, serviço ou valor.',
        );
      l.quotes = [...l.quotes.filter((q) => q.id !== value.id), value];
      const s = l.suppliers.find((s) => s.id === value.supplierId);
      if (s?.status === 'prospecting' && value.status !== 'pending') s.status = 'quoted';
    });
  }
  removeQuote(id: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      if (l.contracts.some((c) => c.quoteId === id))
        throw new Error('A proposta possui um contrato vinculado e deve ser mantida no histórico.');
      l.quotes = l.quotes.filter((q) => q.id !== id);
    });
  }
  saveContract(value: SupplierContract, plan: ContractFinancePlan) {
    return this.mutate(value.weddingId, (l, f) => {
      const previous = l.contracts.find((c) => c.id === value.id);
      if (previous?.status === 'cancelled')
        throw new Error('Contratos cancelados são históricos. Cadastre um novo contrato.');
      if (
        previous?.expenseId &&
        (value.supplierId !== previous.supplierId ||
          value.amountCents !== previous.amountCents ||
          value.status !== 'signed')
      )
        throw new Error(
          'O contrato já está vinculado ao financeiro. Preserve fornecedor e valor; para ajustes use descontos, juros ou cancelamento no fluxo correspondente.',
        );
      const contract = { ...value, expenseId: previous?.expenseId ?? '' };
      const supplier = l.suppliers.find((s) => s.id === contract.supplierId);
      if (!supplier || supplier.status === 'inactive')
        throw new Error('Escolha um fornecedor ativo.');
      if (contract.status === 'signed' && !contract.expenseId) {
        if (plan.mode === 'create') {
          const expense = {
            id: crypto.randomUUID(),
            weddingId: value.weddingId,
            description: contract.title,
            categoryId: plan.categoryId,
            supplier: supplier.name,
            supplierId: supplier.id,
            contractId: contract.id,
            plannedCents: contract.amountCents,
            contractedCents: contract.amountCents,
            status: 'contracted' as const,
            contractDate: contract.signedDate,
            dueDate: plan.dueDate,
            method: plan.method,
            notes: 'Gerada a partir do contrato: ' + contract.title,
            contractReference: contract.reference,
            createdAt: new Date().toISOString(),
          };
          f.installments.push(...makeInstallments(expense, plan));
          f.expenses.push(expense);
          contract.expenseId = expense.id;
        } else if (plan.mode === 'link') {
          const expense = f.expenses.find((e) => e.id === plan.expenseId);
          if (
            !expense ||
            expense.status !== 'contracted' ||
            expense.contractId ||
            expense.professionalId ||
            (expense.supplierId && expense.supplierId !== supplier.id) ||
            expense.contractedCents !== contract.amountCents
          )
            throw new Error(
              'Escolha uma despesa contratada, ainda sem contrato/profissional, do mesmo valor e fornecedor. Nenhuma nova despesa foi criada.',
            );
          expense.contractId = contract.id;
          expense.supplierId = supplier.id;
          expense.supplier = supplier.name;
          expense.contractReference = contract.reference || expense.contractReference;
          contract.expenseId = expense.id;
        } else
          throw new Error(
            'Escolha criar uma despesa ou vincular uma existente para o contrato assinado.',
          );
        f.audit.push({
          id: crypto.randomUUID(),
          weddingId: value.weddingId,
          at: new Date().toISOString(),
          action: 'Contrato vinculado',
          entityId: contract.expenseId,
          detail: `Contrato: ${contract.title}. ${plan.mode === 'create' ? 'Despesa criada sem registrar pagamento.' : 'Despesa existente mantida, sem duplicação.'}`,
        });
      }
      if (contract.status === 'signed') {
        supplier.status = 'contracted';
        const q = l.quotes.find((q) => q.id === contract.quoteId);
        if (q) q.status = 'selected';
      }
      const linked = f.expenses.find((e) => e.id === contract.expenseId);
      if (linked) {
        linked.contractReference = contract.reference || linked.contractReference;
        linked.contractDate = contract.signedDate;
      }
      l.contracts = [...l.contracts.filter((c) => c.id !== contract.id), contract];
    });
  }
  cancelContract(id: string, weddingId: string, reason: string) {
    if (!reason.trim()) return Promise.reject(new Error('Informe o motivo do cancelamento.'));
    return this.mutate(weddingId, (l, f) => {
      const c = l.contracts.find((c) => c.id === id);
      if (!c || c.status === 'cancelled') throw new Error('Contrato indisponível.');
      const e = f.expenses.find((e) => e.id === c.expenseId);
      if (e && expenseBalance(f, e).paid !== 0)
        throw new Error(
          'O contrato possui pagamento. Registre a devolução ou desfaça os pagamentos no financeiro antes de cancelar. Nenhum registro foi alterado.',
        );
      c.status = 'cancelled';
      c.cancelReason = reason.trim();
      c.cancelledAt = new Date().toISOString();
      if (e) {
        e.status = 'cancelled';
        f.audit.push({
          id: crypto.randomUUID(),
          weddingId,
          at: new Date().toISOString(),
          action: 'Contrato cancelado',
          entityId: e.id,
          detail: reason.trim(),
        });
      }
      const s = l.suppliers.find((s) => s.id === c.supplierId);
      if (s && !l.contracts.some((other) => other.supplierId === s.id && other.status === 'signed'))
        s.status = l.quotes.some((q) => q.supplierId === s.id) ? 'quoted' : 'prospecting';
    });
  }
  removeContract(id: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      const c = l.contracts.find((c) => c.id === id);
      if (c?.status !== 'draft' || c.expenseId)
        throw new Error(
          'Apenas rascunhos sem despesa podem ser excluídos. Cancele contratos assinados para preservar o histórico.',
        );
      l.contracts = l.contracts.filter((c) => c.id !== id);
    });
  }
  saveProfessional(value: Professional) {
    if (!validPhone(value.phone) || !validPhone(value.whatsapp) || !validEmail(value.email))
      return Promise.reject(new Error('Confira telefone, WhatsApp e e-mail.'));
    return this.mutate(value.weddingId, (l, f) => {
      const previous = l.professionals.find((p) => p.id === value.id);
      if (
        previous?.expenseId &&
        (previous.expenseId !== value.expenseId ||
          previous.agreedCents !== value.agreedCents ||
          previous.paymentMode !== value.paymentMode ||
          previous.supplierId !== value.supplierId)
      )
        throw new Error(
          'Este profissional já possui uma despesa. Preserve o vínculo e o valor; trate ajustes e pagamentos no Financeiro.',
        );
      if (
        value.status === 'unavailable' &&
        l.shifts.some(
          (s) => s.professionalId === value.id && !['cancelled', 'completed'].includes(s.status),
        )
      )
        throw new Error(
          'Realoque ou cancele as escalas pendentes antes de marcar o profissional como indisponível.',
        );
      const p = {
        ...value,
        name: value.name.trim(),
        phone: formatPhone(value.phone),
        whatsapp: formatPhone(value.whatsapp),
        email: value.email.trim(),
      };
      if (p.expenseId) {
        const e = f.expenses.find((e) => e.id === p.expenseId);
        if (
          !e ||
          e.contractId ||
          (e.professionalId && e.professionalId !== p.id) ||
          e.contractedCents !== p.agreedCents ||
          (e.status !== 'contracted' && !previous?.expenseId) ||
          (e.supplierId && e.supplierId !== p.supplierId)
        )
          throw new Error(
            'Escolha uma despesa individual contratada, do mesmo valor, sem outro profissional ou contrato vinculado.',
          );
        e.professionalId = p.id;
        e.supplierId = p.supplierId;
        if (p.supplierId) e.supplier = l.suppliers.find((s) => s.id === p.supplierId)?.name ?? '';
      }
      l.professionals = [...l.professionals.filter((x) => x.id !== p.id), p];
    });
  }
  removeProfessional(id: string, weddingId: string) {
    return this.mutate(weddingId, (l, f) => {
      if (
        l.shifts.some((s) => s.professionalId === id) ||
        f.expenses.some((e) => e.professionalId === id)
      )
        throw new Error(
          'Este profissional possui escalas ou despesa vinculada. Preserve o histórico; cancele as escalas pendentes e marque como indisponível.',
        );
      l.professionals = l.professionals.filter((p) => p.id !== id);
    });
  }
  saveShift(value: WorkShift) {
    return this.saveShifts([value], value.weddingId);
  }
  saveShifts(values: WorkShift[], weddingId: string) {
    return this.mutate(weddingId, (l) => {
      if (!values.length) throw new Error('Selecione ao menos um profissional.');
      for (const value of values) {
        const p = l.professionals.find((p) => p.id === value.professionalId),
          previous = l.shifts.find((s) => s.id === value.id);
        if (!p || p.status === 'unavailable')
          throw new Error(
            `${p?.name ?? 'Profissional removido'} não está disponível. Confira os profissionais selecionados.`,
          );
        if (
          previous &&
          (previous.arrivedAt || previous.leftAt) &&
          (previous.professionalId !== value.professionalId ||
            previous.start !== value.start ||
            previous.end !== value.end ||
            previous.status !== value.status)
        )
          throw new Error(
            'Esta escala já tem presença registrada. Preserve profissional e horários; edite apenas local, tarefas e observações.',
          );
        l.shifts = [
          ...l.shifts.filter((s) => s.id !== value.id),
          {
            ...value,
            completedTasks: value.completedTasks.filter((t) => taskLines(value.tasks).includes(t)),
          },
        ];
      }
    });
  }
  removeShift(id: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      const shift = l.shifts.find((s) => s.id === id);
      if (shift?.arrivedAt || shift?.leftAt)
        throw new Error('Escalas com presença registrada ficam no histórico.');
      l.shifts = l.shifts.filter((s) => s.id !== id);
    });
  }
  presence(id: string, weddingId: string, kind: 'arrival' | 'departure', at = localDateTime()) {
    if (!validDateTime(at) || at > localDateTime())
      return Promise.reject(new Error('Informe uma data e horário válidos, até agora.'));
    return this.mutate(weddingId, (l) => {
      const s = l.shifts.find((s) => s.id === id);
      if (!s || s.status === 'cancelled') throw new Error('Escala indisponível.');
      if (kind === 'arrival') {
        if (s.arrivedAt) throw new Error('A chegada já foi registrada.');
        s.arrivedAt = at;
        s.status = 'working';
      } else {
        if (!s.arrivedAt || s.leftAt || at < s.arrivedAt)
          throw new Error('Registre a chegada antes da saída e confira os horários.');
        s.leftAt = at;
        s.status = 'completed';
      }
    });
  }
  task(id: string, weddingId: string, task: string, done: boolean) {
    return this.mutate(weddingId, (l) => {
      const shift = l.shifts.find((s) => s.id === id);
      if (!shift || shift.status === 'cancelled' || !taskLines(shift.tasks).includes(task))
        throw new Error('Tarefa indisponível nesta escala.');
      shift.completedTasks = done
        ? [...new Set([...shift.completedTasks, task])]
        : shift.completedTasks.filter((t) => t !== task);
    });
  }
}
