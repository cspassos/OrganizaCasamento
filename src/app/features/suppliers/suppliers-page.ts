import { SupplierOverview } from './supplier-overview';
import { MatMenuModule } from '@angular/material/menu';
import { Component, computed, effect, inject, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SuppliersService } from '../../core/services/suppliers';
import {
  Supplier,
  SupplierQuote,
  SupplierContract,
  supplierStatuses,
  quoteStatuses,
  contractStatuses,
} from '../../core/models/suppliers';
import { money, localToday, expenseBalance } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
import { downloadCsv } from '../../core/utils/csv-download';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { NoticeDialog } from '../../shared/components/notice-dialog';
import { ReasonDialog } from '../../shared/components/reason-dialog';
import { downloadAttachment } from '../../shared/components/attachment';
import { SupplierEntityDialog } from './entity-dialog';
import { ContractDialog } from './contract-dialog';
@Component({
  selector: 'oc-suppliers-page',
  imports: [MatMenuModule, FormsModule, RouterLink, CollectionTable],
  templateUrl: './suppliers-page.html',
})
export class SuppliersPage {
  store = inject(SuppliersService);
  dialogs = inject(MatDialog);
  route = inject(ActivatedRoute);
  params = toSignal(this.route.paramMap);
  queries = toSignal(this.route.queryParamMap);
  embedded = input(false);
  section = computed(() =>
    this.embedded() ? 'cadastro' : (this.params()?.get('section') ?? 'cadastro'),
  );
  titles: Record<string, string> = {
    cadastro: 'Contatos dos fornecedores',
    orcamentos: 'Comparar orçamentos',
    contratos: 'Contratos',
    pagamentos: 'Pagamentos por fornecedor',
    avaliacoes: 'Avaliações dos fornecedores',
  };
  query = signal('');
  status = signal('');
  category = signal('');
  message = signal('');
  savedContract = signal<SupplierContract | undefined>(undefined);
  error = signal('');
  selected = signal(new Set<string>());
  supplierStatuses = supplierStatuses;
  quoteStatuses = quoteStatuses;
  contractStatuses = contractStatuses;
  money = money;
  date = formatCalendarDate;
  downloadFile = downloadAttachment;
  supplierName = (id: string) => this.store.supplierName(id);
  toSet = (ids: string[]) => new Set(ids);
  allSuppliers = computed(() => this.store.ledger()?.suppliers ?? []);
  categories = computed(() =>
    [...new Set(this.allSuppliers().map((s) => s.category))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
  );
  suppliers = computed(() =>
    this.allSuppliers()
      .filter(
        (s) =>
          (!this.status() || s.status === this.status()) &&
          (!this.category() || s.category === this.category()) &&
          searchText(
            [
              s.name,
              s.company,
              s.service,
              s.phone,
              s.whatsapp,
              s.email,
              s.document,
              s.responsible,
            ].join(' '),
          ).includes(searchText(this.query())),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  quotes = computed(() =>
    (this.store.ledger()?.quotes ?? []).filter(
      (q) =>
        (!this.status() || q.status === this.status()) &&
        (!this.category() ||
          this.allSuppliers().find((s) => s.id === q.supplierId)?.category === this.category()) &&
        searchText(
          q.service + ' ' + this.supplierName(q.supplierId) + ' ' + q.included + ' ' + q.conditions,
        ).includes(searchText(this.query())),
    ),
  );
  contracts = computed(() =>
    (this.store.ledger()?.contracts ?? []).filter(
      (c) =>
        (!this.queries()?.get('contrato') || c.id === this.queries()?.get('contrato')) &&
        (!this.status() || c.status === this.status()) &&
        searchText(
          c.title + ' ' + this.supplierName(c.supplierId) + ' ' + c.reference + ' ' + c.scope,
        ).includes(searchText(this.query())),
    ),
  );
  expenses = computed(() =>
    this.store.finance
      .expenseRows()
      .filter(
        (e) =>
          e.supplierId &&
          (!this.status() || e.situation === this.status()) &&
          (!this.queries()?.get('fornecedor') ||
            e.supplierId === this.queries()?.get('fornecedor')) &&
          searchText(
            e.description + ' ' + this.supplierName(e.supplierId!) + ' ' + e.method,
          ).includes(searchText(this.query())),
      ),
  );
  statuses = computed(() =>
    Object.entries(
      this.section() === 'orcamentos'
        ? quoteStatuses
        : this.section() === 'contratos'
          ? contractStatuses
          : supplierStatuses,
    ),
  );
  supplierRows = computed(() =>
    this.suppliers().map((s) => ({
      id: s.id,
      record: s,
      cells: [s.name, s.category, s.whatsapp || s.phone, supplierStatuses[s.status]],
    })),
  );
  quoteRows = computed(() =>
    this.quotes().map((q) => ({
      id: q.id,
      record: q,
      tone: q.validUntil && q.validUntil < localToday() && q.status === 'received' ? 'danger' : '',
      cells: [
        q.service,
        this.supplierName(q.supplierId),
        money(q.amountCents),
        quoteStatuses[q.status] +
          (q.validUntil && q.validUntil < localToday() && q.status === 'received'
            ? ' · Validade vencida'
            : ''),
        q.validUntil ? this.date(q.validUntil) : 'A definir',
        q.deliveryDate ? this.date(q.deliveryDate) : 'A definir',
      ],
    })),
  );
  contractRows = computed(() =>
    this.contracts().map((c) => ({
      id: c.id,
      record: c,
      cells: [
        c.title,
        this.supplierName(c.supplierId),
        contractStatuses[c.status],
        money(c.amountCents),
        c.expenseId && c.status !== 'cancelled' ? money(this.balance(c).paid) : '—',
        c.expenseId && c.status !== 'cancelled' ? money(this.balance(c).open) : '—',
      ],
    })),
  );
  paymentRows = computed(() =>
    this.expenses().map((e) => ({
      id: e.id,
      record: e,
      tone: e.situation === 'Vencida' ? 'danger' : e.situation === 'Paga' ? 'paid' : '',
      cells: [
        this.supplierName(e.supplierId!),
        e.description,
        e.situation,
        money(e.status === 'planned' ? e.plannedCents : e.due),
        money(e.paid),
        money(e.status === 'cancelled' ? 0 : e.open),
      ],
    })),
  );
  reviewRows = computed(() =>
    this.suppliers().map((s) => ({
      id: s.id,
      record: s,
      cells: [s.name, s.category, s.rating ? `${s.rating} de 5` : 'Ainda não avaliado', s.review],
    })),
  );
  comparison = computed(() => {
    const quotes = (this.store.ledger()?.quotes ?? []).filter((q) => this.selected().has(q.id));
    const lowest = quotes.length ? Math.min(...quotes.map((q) => q.amountCents)) : 0;
    return quotes.map((q) => ({
      id: q.id,
      record: q,
      cells: [
        this.supplierName(q.supplierId),
        q.service,
        money(q.amountCents),
        money(q.amountCents - lowest),
        q.included,
        q.conditions,
        q.deliveryDate ? this.date(q.deliveryDate) : 'A definir',
        q.validUntil ? this.date(q.validUntil) : 'A definir',
        quoteStatuses[q.status],
      ],
    }));
  });
  rated = computed(() => this.allSuppliers().filter((s) => s.rating > 0));
  average = computed(() =>
    this.rated().length
      ? (this.rated().reduce((n, s) => n + s.rating, 0) / this.rated().length).toLocaleString(
          'pt-BR',
          { maximumFractionDigits: 1 },
        )
      : '—',
  );
  constructor() {
    effect(() => {
      this.section();
      this.store.weddings.active()?.id;
      this.query.set('');
      this.status.set('');
      this.category.set('');
      this.selected.set(new Set());
      this.message.set('');
      this.error.set('');
    });
  }
  quoted(id: string) {
    const values = (this.store.ledger()?.quotes ?? [])
      .filter((q) => q.supplierId === id && !['pending', 'rejected'].includes(q.status))
      .map((q) => q.amountCents);
    return values.length ? money(Math.min(...values)) : 'Sem proposta';
  }
  contracted(id: string) {
    return this.store.finance
      .expenseRows()
      .filter((e) => e.supplierId === id && e.status === 'contracted')
      .reduce((n, e) => n + e.due, 0);
  }
  balance(c: SupplierContract) {
    const f = this.store.finance.ledger(),
      e = f?.expenses.find((e) => e.id === c.expenseId);
    return f && e ? expenseBalance(f, e) : { due: 0, paid: 0, open: 0 };
  }
  async edit(
    kind: 'supplier' | 'quote' | 'review',
    value?: Supplier | SupplierQuote,
    supplierId?: string,
  ) {
    const result = await firstValueFrom(
      this.dialogs
        .open(SupplierEntityDialog, {
          width: '800px',
          maxWidth: '96vw',
          data: { kind, value, supplierId },
        })
        .afterClosed(),
    );
    if (result) this.message.set('Cadastro salvo com sucesso.');
  }
  async contract(value?: SupplierContract, quote?: SupplierQuote, supplierId?: string) {
    const result = await firstValueFrom(
      this.dialogs
        .open(ContractDialog, {
          width: '850px',
          maxWidth: '96vw',
          data: { value, quote, supplierId },
          panelClass: 'contract-editor-panel',
          maxHeight: '90dvh',
        })
        .afterClosed(),
    );
    if (result) {
      this.message.set('Contrato salvo com sucesso.');
      this.savedContract.set(
        this.store.ledger()?.contracts.find((c) => c.id === result.contractId),
      );
    }
  }
  details(s: Supplier) {
    this.dialogs.open(SupplierOverview, {
      width: '760px',
      maxWidth: '96vw',
      maxHeight: '90dvh',
      data: s,
    });
  }
  quoteDetails(q: SupplierQuote) {
    this.dialogs.open(NoticeDialog, {
      width: '650px',
      maxWidth: '96vw',
      data: {
        title: q.service,
        message: `${this.supplierName(q.supplierId)} · ${money(q.amountCents)}\nIncluído: ${q.included || 'Não informado'}\nCondições: ${q.conditions || 'Não informadas'}\nObservações: ${q.notes || 'Nenhuma'}`,
      },
    });
  }
  contractDetails(c: SupplierContract) {
    this.dialogs.open(NoticeDialog, {
      width: '650px',
      maxWidth: '96vw',
      data: {
        title: c.title,
        message: `${this.supplierName(c.supplierId)} · ${contractStatuses[c.status]} · ${money(c.amountCents)}\nReferência: ${c.reference || 'Não informada'}\nServiços: ${c.scope || 'Não informados'}\nCondições: ${c.conditions || 'Não informadas'}\nEntrega: ${c.deliveryDate ? this.date(c.deliveryDate) : 'A definir'}\n${c.cancelReason ? 'Motivo do cancelamento: ' + c.cancelReason : ''}\nObservações: ${c.notes || 'Nenhuma'}`,
      },
    });
  }
  async run(action: () => Promise<unknown>, message: string) {
    this.error.set('');
    this.message.set('');
    try {
      await action();
      this.message.set(message);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível concluir.';
      this.error.set(message);
      this.dialogs.open(NoticeDialog, {
        role: 'alertdialog',
        width: '560px',
        maxWidth: '96vw',
        data: { title: 'Não foi possível concluir', message },
      });
    }
  }
  async remove(kind: 'supplier' | 'quote' | 'contract', id: string, name: string) {
    const weddingId = this.store.weddings.active()!.id;
    const yes = await firstValueFrom(
      this.dialogs
        .open(ConfirmDialog, {
          data: {
            title: 'Excluir cadastro?',
            message: `Excluir ${name}? Registros com vínculos serão preservados e o motivo será informado.`,
          },
        })
        .afterClosed(),
    );
    if (yes)
      await this.run(
        () =>
          kind === 'supplier'
            ? this.store.removeSupplier(id, weddingId)
            : kind === 'quote'
              ? this.store.removeQuote(id, weddingId)
              : this.store.removeContract(id, weddingId),
        'Cadastro excluído.',
      );
  }
  async cancelContract(c: SupplierContract) {
    const reason = await firstValueFrom(
      this.dialogs
        .open(ReasonDialog, {
          width: '600px',
          maxWidth: '96vw',
          data: {
            title: 'Cancelar contrato?',
            message: `${c.title}. A despesa vinculada também será cancelada se não houver valor pago. O histórico será preservado.`,
          },
        })
        .afterClosed(),
    );
    if (reason)
      await this.run(
        () => this.store.cancelContract(c.id, c.weddingId, reason),
        'Contrato e despesa vinculada cancelados. Histórico preservado.',
      );
  }
  async selectQuote(q: SupplierQuote) {
    await this.run(
      () => this.store.saveQuote({ ...q, status: 'selected' }),
      'Proposta selecionada. Isso ainda não cria contrato nem despesa.',
    );
  }
  clear() {
    this.query.set('');
    this.status.set('');
    this.category.set('');
  }
  export() {
    const section = this.section(),
      rows =
        section === 'cadastro'
          ? this.supplierRows()
          : section === 'orcamentos'
            ? this.quoteRows()
            : section === 'contratos'
              ? this.contractRows()
              : section === 'pagamentos'
                ? this.paymentRows()
                : this.reviewRows();
    const headers =
      section === 'cadastro'
        ? ['Nome', 'Categoria', 'Contato', 'Situação', 'Contratado no financeiro']
        : section === 'orcamentos'
          ? ['Serviço', 'Fornecedor', 'Valor', 'Situação', 'Validade', 'Entrega']
          : section === 'contratos'
            ? ['Contrato', 'Fornecedor', 'Situação', 'Valor', 'Pago', 'Em aberto']
            : section === 'pagamentos'
              ? ['Fornecedor', 'Despesa', 'Situação', 'Valor', 'Pago', 'Saldo']
              : ['Fornecedor', 'Categoria', 'Nota', 'Avaliação'];
    downloadCsv(
      headers,
      rows.map((r) => r.cells),
      `fornecedores-${section}.csv`,
    );
  }
  exportComparison() {
    downloadCsv(
      [
        'Fornecedor',
        'Serviço',
        'Valor',
        'Diferença para menor preço',
        'Incluído',
        'Condições',
        'Entrega',
        'Validade',
        'Situação',
      ],
      this.comparison().map((r) => r.cells),
      'comparacao-orcamentos.csv',
    );
  }
}
