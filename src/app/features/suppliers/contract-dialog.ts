import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { SuppliersService } from '../../core/services/suppliers';
import { SupplierContract, SupplierQuote } from '../../core/models/suppliers';
import { LocalAttachment, paymentMethods } from '../../core/models/finance';
import { newContract } from '../../core/utils/suppliers';
import { cents, localToday, money } from '../../core/utils/finance';
import { LocalEditorDialog } from '../../shared/components/local-editor-dialog';
import { SearchPicker } from '../../shared/components/search-picker';
import { CurrencyInput } from '../../shared/directives/currency-input';
import { DatePicker } from '../../shared/components/date-picker';
import { AttachmentInput } from '../../shared/components/attachment';
import { Router } from '@angular/router';
import { isCalendarDate } from '../../core/utils/wedding';
@Component({
  selector: 'oc-contract-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    SearchPicker,
    CurrencyInput,
    DatePicker,
    AttachmentInput,
  ],
  templateUrl: './contract-dialog.html',
  styles: [
    ':host { display: flex; flex-direction: column; min-height: 0; overflow: hidden; } mat-dialog-content { min-height: 0; } mat-dialog-actions { flex-shrink: 0; }',
  ],
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class ContractDialog extends LocalEditorDialog {
  element = inject<ElementRef<HTMLElement>>(ElementRef);
  issues = signal<{ field: string; message: string }[]>([]);
  router = inject(Router);
  store = inject(SuppliersService);
  data = inject<{ value?: SupplierContract; quote?: SupplierQuote; supplierId?: string }>(
    MAT_DIALOG_DATA,
  );
  fb = inject(FormBuilder);
  weddingId = this.store.weddings.active()!.id;
  source = this.data.value;
  id = this.source?.id ?? crypto.randomUUID();
  methods = paymentMethods;
  attachment: LocalAttachment | undefined = this.source?.attachment;
  form = this.fb.nonNullable.group({
    supplierId: [
      this.source?.supplierId ?? this.data.quote?.supplierId ?? this.data.supplierId ?? '',
      Validators.required,
    ],
    quoteId: [this.source?.quoteId ?? this.data.quote?.id ?? ''],
    title: [this.source?.title ?? this.data.quote?.service ?? '', Validators.required],
    reference: [this.source?.reference ?? ''],
    amount: [
      (this.source?.amountCents ?? this.data.quote?.amountCents ?? 0) / 100,
      [Validators.required, Validators.min(0)],
    ],
    status: [this.source?.status ?? 'draft'],
    signedDate: [this.source?.signedDate ?? ''],
    deliveryDate: [this.source?.deliveryDate ?? this.data.quote?.deliveryDate ?? ''],
    scope: [this.source?.scope ?? this.data.quote?.included ?? ''],
    conditions: [this.source?.conditions ?? this.data.quote?.conditions ?? ''],
    notes: [this.source?.notes ?? ''],
    mode: ['create'],
    paymentChoice: [''],
    expenseId: [''],
    categoryId: [this.store.finance.ledger()?.categories[0]?.id ?? '', Validators.required],
    dueDate: [localToday()],
    entry: [0, [Validators.min(0)]],
    count: [1, [Validators.min(1), Validators.max(120), Validators.pattern(/^\d+$/)]],
    firstDueDate: [localToday()],
    method: ['PIX'],
  });
  value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  supplierOptions = computed(() =>
    (this.store.ledger()?.suppliers ?? [])
      .filter((s) => s.status !== 'inactive' || s.id === this.value().supplierId)
      .map((s) => ({ id: s.id, name: s.name, detail: s.company + ' · ' + s.category })),
  );
  quoteOptions = computed(() =>
    (this.store.ledger()?.quotes ?? [])
      .filter((q) => q.supplierId === this.value().supplierId && q.status !== 'rejected')
      .map((q) => ({ id: q.id, name: q.service, detail: money(q.amountCents) })),
  );
  expenseOptions = computed(() =>
    this.store.finance
      .expenseRows()
      .filter(
        (e) =>
          e.status === 'contracted' &&
          !e.contractId &&
          !e.professionalId &&
          (!e.supplierId || e.supplierId === this.value().supplierId),
      )
      .map((e) => ({
        id: e.id,
        name: e.description,
        detail: `${money(e.contractedCents)} · ${e.supplier || 'Sem fornecedor'} · ${e.situation}`,
      })),
  );
  get locked() {
    return !!this.source?.expenseId;
  }
  installments = computed(() =>
    (this.store.finance.ledger()?.installments ?? []).filter(
      (i) => i.expenseId === this.source?.expenseId,
    ),
  );
  money = money;
  constructor() {
    super();
    if (this.locked) this.form.controls.supplierId.disable();
    this.form.controls.status.valueChanges.subscribe((status) => {
      if (status === 'signed' && !this.form.controls.signedDate.value)
        this.form.controls.signedDate.setValue(localToday());
      if (status === 'draft') this.form.patchValue({ count: 1, paymentChoice: '' });
    });
    this.form.controls.mode.valueChanges.subscribe((mode) => {
      if (mode === 'link') this.form.patchValue({ count: 1, paymentChoice: '' });
    });
    this.form.controls.paymentChoice.valueChanges.subscribe((choice) => {
      if (choice === 'integral') this.form.patchValue({ entry: 0, count: 1 });
      if (choice === 'installments') this.form.controls.count.setValue(0);
    });
  }
  dirty() {
    return this.form.dirty;
  }
  file(value: LocalAttachment | undefined) {
    this.attachment = value;
    this.form.markAsDirty();
  }
  async openPayments() {
    const expenseId = this.source?.expenseId;
    if (!expenseId || this.saving()) return;
    await this.save();
    if (!this.error()) await this.router.navigate(['/financeiro/despesas', expenseId]);
  }
  async save(another = false) {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    this.issues.set([]);
    this.error.set('');
    const v = this.form.getRawValue();
    const problems: { field: string; message: string }[] = [];
    const add = (field: string, message: string) => problems.push({ field, message });
    if (!v.supplierId)
      add(
        'supplierId',
        'Fornecedor: selecione um resultado da lista; apenas digitar o nome não conclui a escolha.',
      );
    if (!v.title.trim()) add('title', 'Título do contrato: informe o nome desta contratação.');
    if (this.form.controls.amount.invalid || (v.status === 'signed' && !(v.amount > 0)))
      add('amount', 'Valor contratado: informe um valor válido, maior que zero para assinar.');
    if (v.status === 'signed' && !isCalendarDate(v.signedDate))
      add('signedDate', 'Data da assinatura: informe uma data válida.');
    if (v.deliveryDate && !isCalendarDate(v.deliveryDate))
      add('deliveryDate', 'Prazo de entrega: informe uma data válida ou deixe vazio.');
    if (v.status === 'signed' && !this.locked && v.mode === 'create') {
      if (!v.paymentChoice)
        add(
          'paymentChoice',
          'Como será o pagamento: escolha como vai pagar, integral ou entrada e parcelas.',
        );
      if (!v.categoryId)
        add('categoryId', 'Categoria financeira: escolha a categoria desta contratação.');
      if (!isCalendarDate(v.dueDate))
        add('dueDate', 'Vencimento da entrada / integral: informe uma data válida.');
      if (v.paymentChoice === 'installments') {
        if (
          this.form.controls.entry.invalid ||
          v.entry == null ||
          !Number.isFinite(v.entry) ||
          v.entry < 0 ||
          v.entry > v.amount
        )
          add(
            'entry',
            'Entrada: informe R$ 0,00 se não houver sinal, ou um valor até o total do contrato.',
          );
        if (this.form.controls.count.invalid)
          add(
            'count',
            'Quantidade de parcelas restantes: informe um número inteiro entre 1 e 120.',
          );
        if (!isCalendarDate(v.firstDueDate))
          add('firstDueDate', 'Primeira parcela restante: informe uma data válida.');
        if (v.entry === 0 && Number(v.count) === 1)
          add(
            'count',
            'Para pagar tudo de uma vez, escolha pagamento integral. Para parcelar, informe uma entrada ou mais de uma parcela.',
          );
      }
    }
    if (v.status === 'signed' && !this.locked && v.mode === 'link' && !v.expenseId)
      add(
        'expenseId',
        'Despesa contratada existente: busque e selecione a despesa que será vinculada.',
      );
    if (problems.length) {
      this.issues.set(problems);
      this.focusField(problems[0].field);
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.store.saveContract(
        {
          ...newContract(this.weddingId),
          ...this.source,
          id: this.id,
          supplierId: v.supplierId,
          quoteId: v.quoteId,
          title: v.title,
          reference: v.reference,
          amountCents: cents(v.amount),
          status: v.status as SupplierContract['status'],
          signedDate: v.signedDate,
          deliveryDate: v.deliveryDate,
          scope: v.scope,
          conditions: v.conditions,
          notes: v.notes,
          attachment: this.attachment,
        },
        {
          mode: v.mode as 'create' | 'link' | 'none',
          expenseId: v.expenseId,
          categoryId: v.categoryId,
          dueDate: v.dueDate,
          entryCents: v.paymentChoice === 'integral' ? 0 : cents(v.entry),
          count: v.paymentChoice === 'integral' ? 1 : Number(v.count),
          firstDueDate: v.paymentChoice === 'integral' ? v.dueDate : v.firstDueDate,
          method: v.method,
        },
      );
      this.savedCount.update((n) => n + 1);
      if (another) {
        this.source = undefined;
        this.id = crypto.randomUUID();
        this.attachment = undefined;
        this.form.reset({
          supplierId: v.supplierId,
          title: '',
          quoteId: '',
          reference: '',
          amount: 0,
          signedDate: '',
          deliveryDate: '',
          scope: '',
          conditions: '',
          notes: '',
          entry: 0,
          count: 1,
          expenseId: '',
          status: 'draft',
          categoryId: v.categoryId,
          mode: 'create',
          paymentChoice: '',
          dueDate: localToday(),
          firstDueDate: localToday(),
          method: v.method,
        });
        document.querySelector('oc-contract-dialog mat-dialog-content')?.scrollTo(0, 0);
      } else this.ref.close({ contractId: this.id });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar o contrato.');
    } finally {
      this.saving.set(false);
    }
  }
  focusField(field: string) {
    const control = this.element.nativeElement.querySelector<HTMLElement>(
      `[formControlName="${field}"]`,
    );
    const target = control?.matches('input,select,textarea')
      ? control
      : control?.querySelector<HTMLElement>('input,select,textarea');
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target?.focus({ preventScroll: true });
  }
}
