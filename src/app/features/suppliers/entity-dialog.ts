import { Component, computed, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SuppliersService } from '../../core/services/suppliers';
import {
  Supplier,
  SupplierQuote,
  Professional,
  supplierCategories,
  supplierStatuses,
  quoteStatuses,
  professionalRoles,
  professionalStatuses,
} from '../../core/models/suppliers';
import { newSupplier, newQuote, newProfessional } from '../../core/utils/suppliers';
import { cents } from '../../core/utils/finance';
import { validEmail, validPhone } from '../../core/utils/contact';
import { LocalEditorDialog } from '../../shared/components/local-editor-dialog';
import { SearchPicker } from '../../shared/components/search-picker';
import { CurrencyInput } from '../../shared/directives/currency-input';
import { PhoneInput } from '../../shared/directives/phone-input';
import { DatePicker } from '../../shared/components/date-picker';
import { AttachmentInput } from '../../shared/components/attachment';
import { LocalAttachment } from '../../core/models/finance';

@Component({
  selector: 'oc-supplier-entity-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    SearchPicker,
    CurrencyInput,
    PhoneInput,
    DatePicker,
    AttachmentInput,
  ],
  templateUrl: './entity-dialog.html',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class SupplierEntityDialog extends LocalEditorDialog {
  store = inject(SuppliersService);
  data = inject<{
    kind: 'supplier' | 'quote' | 'professional' | 'review';
    value?: Supplier | SupplierQuote | Professional;
    supplierId?: string;
  }>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  weddingId = this.store.weddings.active()!.id;
  source = this.data.value;
  id = this.source?.id ?? crypto.randomUUID();
  categories = computed(() => [
    ...new Set([
      ...supplierCategories,
      ...(this.store.ledger()?.suppliers ?? []).map((s) => s.category),
    ]),
  ]);
  categoryChoice = new FormControl('Outros', { nonNullable: true });
  roles = computed(() => [
    ...new Set([
      ...professionalRoles,
      ...(this.store.ledger()?.professionals ?? []).map((p) => p.role),
      ...(this.source && 'role' in this.source ? [this.source.role] : []),
    ]),
  ]);
  roleChoice = new FormControl('Garçom', { nonNullable: true });
  statuses =
    this.data.kind === 'quote'
      ? Object.entries(quoteStatuses)
      : this.data.kind === 'professional'
        ? Object.entries(professionalStatuses)
        : Object.entries(supplierStatuses);
  attachment: LocalAttachment | undefined = (this.source as Supplier | SupplierQuote)?.attachment;
  supplierOptions = computed(() =>
    (this.store.ledger()?.suppliers ?? [])
      .filter((s) => s.status !== 'inactive' || s.id === this.form.controls.supplierId.value)
      .map((s) => ({
        id: s.id,
        name: s.name,
        detail: [s.company, s.category, s.phone || s.whatsapp].filter(Boolean).join(' · '),
      })),
  );
  expenseOptions = computed(() =>
    (this.store.finance.ledger()?.expenses ?? [])
      .filter(
        (e) =>
          e.id === this.form.controls.expenseId.value ||
          (e.status === 'contracted' && !e.contractId && !e.professionalId),
      )
      .map((e) => ({
        id: e.id,
        name: e.description,
        detail: `${(e.contractedCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${e.supplier || 'Sem fornecedor'}`,
      })),
  );
  form = this.fb.nonNullable.group({
    name: [''],
    company: [''],
    document: [''],
    category: ['Outros'],
    service: [''],
    phone: ['', (c: AbstractControl) => (validPhone(c.value) ? null : { phone: true })],
    whatsapp: ['', (c: AbstractControl) => (validPhone(c.value) ? null : { phone: true })],
    email: ['', (c: AbstractControl) => (validEmail(c.value) ? null : { email: true })],
    address: [''],
    responsible: [''],
    status: ['prospecting'],
    notes: [''],
    supplierId: [this.data.supplierId ?? ''],
    amount: [0, [Validators.required, Validators.min(0)]],
    included: [''],
    deliveryDate: [''],
    validUntil: [''],
    conditions: [''],
    role: ['Garçom'],
    paymentMode: ['undecided'],
    expenseId: [''],
    responsibilities: [''],
    rating: [0],
    review: [''],
  });
  get title() {
    return this.data.kind === 'review'
      ? 'Avaliar fornecedor'
      : `${this.source ? 'Editar' : 'Novo'} ${this.data.kind === 'supplier' ? 'fornecedor' : this.data.kind === 'quote' ? 'orçamento' : 'profissional'}`;
  }
  get lockedPayment() {
    return !!(this.source as Professional)?.expenseId;
  }
  constructor() {
    super();
    if (this.data.kind === 'supplier' || this.data.kind === 'professional')
      this.form.controls.name.addValidators([Validators.required, Validators.maxLength(180)]);
    if (this.data.kind === 'supplier')
      this.form.controls.category.addValidators([Validators.required, Validators.maxLength(100)]);
    if (this.data.kind === 'quote') {
      this.form.controls.supplierId.addValidators(Validators.required);
      this.form.controls.service.addValidators(Validators.required);
    }
    if (this.data.kind === 'professional')
      this.form.controls.role.addValidators([
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/\S/),
      ]);
    if (this.source)
      this.form.patchValue({
        ...this.source,
        amount:
          'amountCents' in this.source
            ? this.source.amountCents / 100
            : 'agreedCents' in this.source
              ? this.source.agreedCents / 100
              : 0,
      });
    else
      this.form.controls.status.setValue(
        this.data.kind === 'quote'
          ? 'received'
          : this.data.kind === 'professional'
            ? 'expected'
            : 'prospecting',
      );
    this.categoryChoice.setValue(this.form.controls.category.value);
    this.roleChoice.setValue(this.form.controls.role.value);
  }
  changeRole() {
    this.form.controls.role.setValue(
      this.roleChoice.value === '__custom' ? '' : this.roleChoice.value,
    );
    this.form.controls.role.markAsDirty();
  }
  changeCategory() {
    this.form.controls.category.setValue(
      this.categoryChoice.value === '__custom' ? '' : this.categoryChoice.value,
    );
    this.form.controls.category.markAsDirty();
  }
  dirty() {
    return this.form.dirty;
  }
  file(value: LocalAttachment | undefined) {
    this.attachment = value;
    this.form.markAsDirty();
  }
  async save(another = false) {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Confira os campos obrigatórios, telefone, WhatsApp e e-mail.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue(),
        key = { id: this.id, weddingId: this.weddingId };
      if (this.data.kind === 'supplier')
        await this.store.saveSupplier({
          ...newSupplier(this.weddingId),
          ...(this.source as Supplier),
          ...key,
          name: v.name,
          company: v.company,
          document: v.document,
          category: v.category,
          service: v.service,
          phone: v.phone,
          whatsapp: v.whatsapp,
          email: v.email,
          address: v.address,
          responsible: v.responsible,
          status: v.status as Supplier['status'],
          notes: v.notes,
          attachment: this.attachment,
        });
      else if (this.data.kind === 'quote')
        await this.store.saveQuote({
          ...newQuote(this.weddingId),
          ...(this.source as SupplierQuote),
          ...key,
          supplierId: v.supplierId,
          service: v.service,
          amountCents: cents(v.amount),
          included: v.included,
          deliveryDate: v.deliveryDate,
          validUntil: v.validUntil,
          conditions: v.conditions,
          status: v.status as SupplierQuote['status'],
          notes: v.notes,
          attachment: this.attachment,
        });
      else if (this.data.kind === 'professional')
        await this.store.saveProfessional({
          ...newProfessional(this.weddingId),
          ...(this.source as Professional),
          ...key,
          name: v.name,
          role: v.role,
          company: v.company,
          supplierId: v.supplierId,
          phone: v.phone,
          whatsapp: v.whatsapp,
          email: v.email,
          agreedCents: cents(v.amount),
          paymentMode: v.paymentMode as Professional['paymentMode'],
          expenseId: v.expenseId,
          status: v.status as Professional['status'],
          responsibilities: v.responsibilities,
          notes: v.notes,
        });
      else await this.store.saveReview(this.id, this.weddingId, Number(v.rating), v.review);
      this.savedCount.update((n) => n + 1);
      if (another) {
        this.source = undefined;
        this.id = crypto.randomUUID();
        this.attachment = undefined;
        this.form.reset({
          supplierId: v.supplierId,
          category: v.category,
          role: v.role,
          status:
            this.data.kind === 'quote'
              ? 'received'
              : this.data.kind === 'professional'
                ? 'expected'
                : 'prospecting',
          paymentMode: 'undecided',
        });
        this.categoryChoice.setValue(v.category);
        this.roleChoice.setValue(v.role);
        setTimeout(() => {
          document.querySelector('oc-supplier-entity-dialog mat-dialog-content')?.scrollTo(0, 0);
          (document.querySelector('oc-supplier-entity-dialog input') as HTMLInputElement)?.focus();
        });
      } else this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      this.saving.set(false);
    }
  }
}
