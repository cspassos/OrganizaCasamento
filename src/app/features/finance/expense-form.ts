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
import { cents, localToday } from '../../core/utils/finance';
import { SuppliersService } from '../../core/services/suppliers';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

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
  message = signal('');
  attachment = signal<LocalAttachment | undefined>(undefined);
  hasHistory = signal(false);
  missing = signal(false);
  methods = paymentMethods;
  changedWedding = computed(
    () => !!this.weddingId() && this.weddingId() !== this.finance.weddings.active()?.id,
  );
  form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    categoryId: ['', Validators.required],
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
  matchingSuppliers() {
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
    if (this.form.invalid) {
      this.error.set('Revise os campos obrigatórios e os valores.');
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
