import { DatePicker } from '../../shared/components/date-picker';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../core/services/finance';
import { CurrencyInput } from '../../shared/directives/currency-input';
import { AttachmentInput } from '../../shared/components/attachment';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { LocalAttachment, paymentMethods } from '../../core/models/finance';
import {
  cents,
  installmentBeforeEntryMessage,
  localToday,
  shiftMonth,
} from '../../core/utils/finance';
import { isCalendarDate } from '../../core/utils/wedding';
import { SuppliersService } from '../../core/services/suppliers';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

const fieldMessages = {
  supplier: 'Informe quem vai receber este valor.',
  description: 'Informe a descrição do gasto com até 200 caracteres.',
  categoryId: 'Selecione a categoria do gasto.',
  planned: 'Informe um valor estimado válido.',
  contracted: 'Informe um valor total maior que R$ 0,00.',
  dueDate: 'Informe um vencimento válido.',
  entry: 'Informe uma entrada válida, até o valor total do gasto.',
  count: 'Informe de 1 a 120 parcelas, com pelo menos R$ 0,01 cada.',
  firstDueDate: 'Informe uma data válida para a primeira parcela.',
  contractDate: 'Informe uma data de contratação válida.',
  contractReference: 'Informe uma referência com até 200 caracteres.',
  notes: 'As observações devem ter até 4.000 caracteres.',
};
type ExpenseField = keyof typeof fieldMessages;

@Component({
  selector: 'oc-expense-form',
  imports: [
    DatePicker,
    ReactiveFormsModule,
    RouterLink,
    CurrencyInput,
    AttachmentInput,
    MatAutocompleteModule,
  ],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class ExpenseForm {
  finance = inject(FinanceService);
  suppliers = inject(SuppliersService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  id = this.route.snapshot.paramMap.get('id') ?? crypto.randomUUID();
  editing = !!this.route.snapshot.paramMap.get('id');
  paymentSetup = this.editing && this.route.snapshot.queryParamMap.get('etapa') === 'parcelas';
  professionalId = this.route.snapshot.queryParamMap.get('profissional') ?? '';
  contractId = '';
  supplierOptions = computed(() =>
    (this.suppliers.ledger()?.suppliers ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      detail: [s.company, s.category, s.phone].filter(Boolean).join(' · '),
    })),
  );
  weddingId = signal('');
  loading = signal(true);
  error = signal('');
  submitted = signal(false);
  message = signal('');
  attachment = signal<LocalAttachment | undefined>(undefined);
  hasHistory = signal(false);
  missing = signal(false);
  methods = paymentMethods;
  categoryError = signal('');
  changedWedding = computed(
    () => !!this.weddingId() && this.weddingId() !== this.finance.weddings.active()?.id,
  );
  form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    categoryId: ['', Validators.required],
    additionalCategoryIds: this.fb.nonNullable.control<string[]>([]),
    supplier: ['', [Validators.required, Validators.maxLength(180), Validators.pattern(/\S/)]],
    supplierId: [''],
    planned: [0, [Validators.required, Validators.min(0)]],
    contracted: [0, [Validators.required, Validators.min(0)]],
    status: ['contracted'],
    contractDate: [localToday()],
    dueDate: [localToday(), Validators.required],
    method: ['PIX'],
    notes: ['', Validators.maxLength(4000)],
    contractReference: ['', Validators.maxLength(200)],
    entry: [0, [Validators.required, Validators.min(0)]],
    count: [
      1,
      [Validators.required, Validators.min(1), Validators.max(120), Validators.pattern(/^\d+$/)],
    ],
    firstDueDate: [localToday(), Validators.required],
  });
  constructor() {
    if (!this.editing) {
      this.form.controls.dueDate.valueChanges.subscribe(() => this.suggestFirstDueDate());
      this.form.controls.entry.valueChanges.subscribe(() => this.suggestFirstDueDate());
    }
    this.form.controls.supplier.valueChanges.subscribe((name) => {
      const selected = this.suppliers
        .ledger()
        ?.suppliers.find((s) => s.id === this.form.controls.supplierId.value);
      if (selected && selected.name !== name) this.form.controls.supplierId.setValue('');
    });
    void this.load();
    this.form.controls.supplierId.valueChanges.subscribe((id) => {
      const supplier = this.suppliers.ledger()?.suppliers.find((s) => s.id === id);
      if (supplier) this.form.controls.supplier.setValue(supplier.name);
    });
  }
  private suggestFirstDueDate() {
    const { dueDate, entry, firstDueDate } = this.form.controls;
    if (firstDueDate.dirty || !isCalendarDate(dueDate.value)) return;
    const next = entry.value > 0 ? shiftMonth(dueDate.value, 1) : dueDate.value;
    firstDueDate.setValue(isCalendarDate(next) ? next : dueDate.value);
  }
  private firstDueDateBeforeEntry() {
    const { dueDate, entry, contracted, firstDueDate } = this.form.controls;
    return (
      entry.value > 0 &&
      contracted.value > entry.value &&
      isCalendarDate(dueDate.value) &&
      isCalendarDate(firstDueDate.value) &&
      firstDueDate.value < dueDate.value
    );
  }
  fieldError(field: ExpenseField): string {
    const control = this.form.controls[field];
    if (!this.submitted() || control.disabled) return '';
    const v = this.form.getRawValue();
    const paying = v.status === 'contracted' && !this.hasHistory();
    const remaining = v.entry > 0 || Number(v.count) > 1;
    const validMoney = (value: number) =>
      Number.isFinite(value) && value >= 0 && value <= 999999999.99;
    switch (field) {
      case 'planned':
        return (v.status === 'planned' || this.editing) && !validMoney(v.planned)
          ? fieldMessages.planned
          : '';
      case 'contracted':
        return v.status === 'contracted' && (!validMoney(v.contracted) || v.contracted <= 0)
          ? fieldMessages.contracted
          : '';
      case 'dueDate':
        return !isCalendarDate(v.dueDate) ? fieldMessages.dueDate : '';
      case 'entry':
        return paying && (!validMoney(v.entry) || v.entry > v.contracted)
          ? fieldMessages.entry
          : '';
      case 'count':
        return paying &&
          (control.invalid ||
            (validMoney(v.contracted) &&
              validMoney(v.entry) &&
              cents(v.contracted) > cents(v.entry) &&
              cents(v.contracted) - cents(v.entry) < Number(v.count)))
          ? fieldMessages.count
          : '';
      case 'firstDueDate':
        return paying && remaining
          ? !isCalendarDate(v.firstDueDate)
            ? fieldMessages.firstDueDate
            : this.firstDueDateBeforeEntry()
              ? installmentBeforeEntryMessage
              : ''
          : '';
      case 'contractDate':
        return v.status === 'contracted' && !isCalendarDate(v.contractDate)
          ? fieldMessages.contractDate
          : '';
      default:
        return control.invalid ? fieldMessages[field] : '';
    }
  }
  private focusError(id: string) {
    const field = document.getElementById(id);
    if (!field || (field.getClientRects().length === 0 && !field.closest('details:not([open])')))
      return false;
    requestAnimationFrame(() => {
      field.closest('details')?.setAttribute('open', '');
      field.focus({ preventScroll: true });
      (field.closest('.form-field') ?? field).scrollIntoView({ block: 'center' });
    });
    return true;
  }
  matchingSuppliers() {
    if (this.form.controls.supplierId.value) return [];
    const query = this.form.controls.supplier.value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
    return this.supplierOptions()
      .filter((s) =>
        (s.name + ' ' + s.detail)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('pt-BR')
          .includes(query),
      )
      .slice(0, 20);
  }
  chooseSupplier(id: string) {
    this.form.controls.supplierId.setValue(id);
  }
  availableCategories() {
    const { categoryId, additionalCategoryIds } = this.form.controls;
    return (this.finance.ledger()?.categories ?? []).filter(
      (category) =>
        category.id !== categoryId.value && !additionalCategoryIds.value.includes(category.id),
    );
  }
  selectedCategories() {
    const ids = this.form.controls.additionalCategoryIds.value;
    return (this.finance.ledger()?.categories ?? []).filter((category) =>
      ids.includes(category.id),
    );
  }
  addCategory(id: string) {
    if (!this.availableCategories().some((category) => category.id === id)) return;
    const control = this.form.controls.additionalCategoryIds;
    control.setValue([...control.value, id]);
    control.markAsDirty();
  }
  removeCategory(id: string) {
    const control = this.form.controls.additionalCategoryIds;
    if (!control.value.includes(id)) return;
    control.setValue(control.value.filter((categoryId) => categoryId !== id));
    control.markAsDirty();
  }
  async createCategory(input: HTMLInputElement, panel: HTMLDetailsElement) {
    if (this.finance.busy() || this.changedWedding()) return;
    this.categoryError.set('');
    try {
      const id = await this.finance.category(this.weddingId(), null, input.value, 0);
      this.addCategory(id);
      input.value = '';
      panel.open = false;
      panel.querySelector('summary')?.focus();
    } catch (error) {
      this.categoryError.set(
        error instanceof Error ? error.message : 'Não foi possível criar a categoria.',
      );
      this.focusError(input.id);
    }
  }
  private async load() {
    await Promise.all([this.finance.initialized, this.suppliers.initialized]);
    this.weddingId.set(this.finance.weddings.active()?.id ?? '');
    const l = this.finance.ledger();
    this.form.controls.categoryId.setValue(l?.categories[0]?.id ?? '');
    if (!this.editing && !this.professionalId) {
      const supplier = this.suppliers
        .ledger()
        ?.suppliers.find((s) => s.id === this.route.snapshot.queryParamMap.get('fornecedor'));
      if (supplier)
        this.form.patchValue({
          supplierId: supplier.id,
          supplier: supplier.name,
          description: supplier.service || '',
          categoryId:
            l?.categories.find((c) => c.name === supplier.category)?.id ??
            l?.categories[0]?.id ??
            '',
          status: supplier.status === 'contracted' ? 'contracted' : 'planned',
        });
    }
    if (this.editing) {
      const e = l?.expenses.find((e) => e.id === this.id);
      if (!e || e.status === 'cancelled') this.missing.set(true);
      else {
        this.contractId = e.contractId ?? '';
        this.professionalId = e.professionalId ?? '';
        const installments = l!.installments
          .filter((i) => i.expenseId === e.id)
          .sort((a, b) => a.number - b.number);
        const entry = installments.find((i) => i.label === 'Entrada');
        const rest = installments.filter((i) => i.id !== entry?.id);
        this.hasHistory.set(l!.transactions.some((t) => t.expenseId === e.id));
        this.form.patchValue({
          ...e,
          dueDate: entry?.dueDate ?? e.dueDate,
          additionalCategoryIds: e.additionalCategoryIds ?? [],
          planned: e.plannedCents / 100,
          contracted: e.contractedCents / 100,
          entry: (entry?.amountCents ?? 0) / 100,
          count: rest.length || 1,
          firstDueDate: rest[0]?.dueDate ?? e.dueDate,
        });
        this.attachment.set(e.attachment);
        if (e.contractId || e.professionalId) {
          this.form.controls.supplierId.disable();
          this.form.controls.status.disable();
          this.form.controls.contracted.disable();
        }
      }
    } else if (this.professionalId) {
      const p = this.suppliers.ledger()?.professionals.find((p) => p.id === this.professionalId);
      if (!p || p.paymentMode !== 'individual') {
        this.missing.set(true);
        this.error.set('Este profissional não está disponível para pagamento individual.');
      } else if (p.expenseId) {
        this.loading.set(false);
        await this.router.navigate(['/financeiro/despesas', p.expenseId]);
        return;
      } else {
        this.form.patchValue({
          description: 'Trabalho de ' + p.name,
          categoryId:
            l?.categories.find((c) => c.name === 'Equipe')?.id ?? l?.categories[0]?.id ?? '',
          supplierId: p.supplierId,
          supplier: this.suppliers.supplierName(p.supplierId) || p.company,
          planned: p.agreedCents / 100,
          contracted: p.agreedCents / 100,
          status: 'contracted',
        });
        this.form.controls.supplierId.disable();
        this.form.controls.status.disable();
        this.form.controls.contracted.disable();
      }
    }
    this.loading.set(false);
  }
  async save(another = false) {
    if (this.finance.busy() || this.changedWedding()) return;
    if (this.form.controls.status.value === 'planned') {
      this.form.patchValue({
        contracted: 0,
        entry: 0,
        count: 1,
        firstDueDate: this.form.controls.dueDate.value,
      });
    } else if (!this.editing) {
      this.form.controls.planned.setValue(this.form.controls.contracted.value);
    }
    if (
      this.form.controls.status.value === 'contracted' &&
      !this.form.controls.contractDate.value
    ) {
      this.form.controls.contractDate.setValue(localToday());
    }
    this.form.markAllAsTouched();
    this.submitted.set(true);
    this.error.set('');
    for (const field of Object.keys(fieldMessages) as ExpenseField[]) {
      if (!this.fieldError(field)) continue;
      if (!this.focusError(field)) {
        this.error.set(fieldMessages[field]);
        requestAnimationFrame(() => this.focusError('expense-form-error'));
      }
      return;
    }
    const v = this.form.getRawValue();
    try {
      await this.finance.saveExpense(
        this.weddingId(),
        this.id,
        {
          description: v.description,
          categoryId: v.categoryId,
          additionalCategoryIds: v.additionalCategoryIds,
          supplier: v.supplier,
          supplierId: v.supplierId,
          contractId: this.contractId || undefined,
          professionalId: this.professionalId || undefined,
          plannedCents: cents(
            !this.editing && v.status === 'contracted' ? v.contracted : v.planned,
          ),
          contractedCents: v.status === 'planned' ? 0 : cents(v.contracted),
          status: v.status as 'planned' | 'contracted',
          contractDate: v.status === 'planned' && !this.editing ? '' : v.contractDate,
          dueDate: v.dueDate,
          method: v.method,
          notes: v.notes,
          contractReference: v.contractReference,
          attachment: this.attachment(),
        },
        {
          entryCents: cents(v.entry),
          count: Number(v.count),
          firstDueDate: !v.entry && Number(v.count) === 1 ? v.dueDate : v.firstDueDate,
        },
      );
      this.form.markAsPristine();
      this.submitted.set(false);
      if (another && !this.editing && !this.professionalId) {
        this.id = crypto.randomUUID();
        this.form.reset({
          description: '',
          categoryId: v.categoryId,
          supplier: '',
          supplierId: '',
          planned: 0,
          contracted: 0,
          status: 'contracted',
          contractDate: localToday(),
          dueDate: localToday(),
          firstDueDate: localToday(),
          method: v.method,
          notes: '',
          contractReference: '',
          entry: 0,
          count: 1,
        });
        this.attachment.set(undefined);
        this.error.set('');
        this.message.set('Despesa salva. Cadastre a próxima abaixo.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('description')?.focus();
      } else await this.router.navigate(['/financeiro/despesas', this.id]);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar a despesa.');
      requestAnimationFrame(() => this.focusError('expense-form-error'));
    }
  }
  file(value: LocalAttachment | undefined) {
    this.attachment.set(value);
    this.form.markAsDirty();
  }
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.form.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  async canLeave() {
    if (!this.form.dirty) return true;
    if (this.finance.busy()) return false;
    return !!(await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          data: {
            title: 'Descartar alterações?',
            message: 'A despesa ainda não foi salva. Deseja sair?',
          },
          width: '440px',
        })
        .afterClosed(),
    ));
  }
}
