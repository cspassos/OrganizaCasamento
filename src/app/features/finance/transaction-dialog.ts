import { DatePicker } from '../../shared/components/date-picker';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CurrencyInput } from '../../shared/directives/currency-input';
import { AttachmentInput } from '../../shared/components/attachment';
import { FinanceService } from '../../core/services/finance';
import {
  LocalAttachment,
  paymentMethods,
  transactionLabels,
  TransactionKind,
} from '../../core/models/finance';
import { cents, installmentBalance, localToday, money } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Component({
  selector: 'oc-transaction-dialog',
  imports: [DatePicker, ReactiveFormsModule, MatDialogModule, CurrencyInput, AttachmentInput],
  template: `<h2 mat-dialog-title>
      {{ data.settle ? 'Pagar saldo restante' : 'Registrar pagamento' }}
    </h2>
    <mat-dialog-content
      ><p>{{ data.description }}</p>
      <form id="transaction-form" [formGroup]="form" (ngSubmit)="save()" class="dialog-form">
        @if (error()) {
          <p class="feedback error" role="alert">{{ error() }}</p>
        }
        @if (!data.settle) {
          <details class="optional-details">
            <summary>Desconto, juros ou devolução (opcional)</summary>
            <div class="form-field">
              <label for="operationKind">Operação</label
              ><select id="operationKind" formControlName="kind">
                @for (kind of kinds; track kind) {
                  <option [value]="kind">{{ labels[kind] }}</option>
                }
              </select>
            </div>
          </details>
          @if (installments.length > 1 || form.controls.kind.value !== 'payment') {
            <div class="form-field">
              <label for="operationInstallment">Parcela</label
              ><select id="operationInstallment" formControlName="installmentId">
                @for (i of installments; track i.id) {
                  <option
                    [value]="i.id"
                    [disabled]="form.controls.kind.value === 'payment' && balance(i).open === 0"
                  >
                    {{ i.label }} · {{ date(i.dueDate) }} · saldo {{ money(balance(i).open) }}
                    {{ balance(i).open === 0 ? ' · Pago' : '' }}
                  </option>
                }
              </select>
            </div>
          }
        } @else {
          <p class="muted">
            O saldo será distribuído automaticamente entre as parcelas em aberto. Esta operação
            também permite antecipar a quitação.
          </p>
        }
        @if (form.controls.kind.value === 'payment' && !installments.some(hasOpenBalance)) {
          <p class="feedback success">
            Todas as parcelas estão pagas. Para devolver ou ajustar um valor, escolha outra
            operação.
          </p>
        }
        @if (form.controls.kind.value === 'refund') {
          <div class="form-field">
            <label for="originalPayment">Pagamento original</label
            ><select id="originalPayment" formControlName="paymentId">
              <option value="">Selecione</option>
              @for (p of payments(); track p.id) {
                <option [value]="p.id">{{ date(p.date) }} · {{ money(p.amountCents) }}</option>
              }
            </select>
          </div>
        }
        <div class="form-field">
          <label for="operationAmount">Valor *</label
          ><input
            id="operationAmount"
            type="text"
            ocCurrency
            formControlName="amount"
            required
            [readOnly]="!!data.settle"
          />
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label for="operationDate">Data *</label
            ><oc-date-picker
              [iso]="true"
              label="Data *"
              inputId="operationDate"
              formControlName="date"
              required
            />
          </div>
          <div class="form-field">
            <label for="operationMethod">Forma de pagamento</label
            ><select id="operationMethod" formControlName="method">
              @for (method of methods; track method) {
                <option [value]="method">{{ method }}</option>
              }
            </select>
          </div>
        </div>
        <details class="optional-details">
          <summary>Observação e comprovante (opcional)</summary>
          <div class="form-field">
            <label for="operationNotes">Observação</label
            ><textarea id="operationNotes" formControlName="notes" maxlength="2000"></textarea>
          </div>
          <oc-attachment [value]="attachment()" (changed)="attachment.set($event)" />
        </details>
        <p class="muted">
          Descontos reduzem a dívida; juros e multas a aumentam. Devoluções reduzem o total pago.
          Nenhuma operação pode ultrapassar seu saldo permitido.
        </p>
      </form></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button type="button" class="button secondary" [disabled]="finance.busy()" (click)="close()">
        Cancelar</button
      ><button
        class="button primary"
        form="transaction-form"
        type="submit"
        [disabled]="finance.busy() || !form.controls.installmentId.value"
      >
        {{ finance.busy() ? 'Salvando…' : 'Registrar' }}
      </button></mat-dialog-actions
    >`,
})
export class TransactionDialog {
  data = inject<{
    weddingId: string;
    expenseId: string;
    description: string;
    installmentId?: string;
    settle?: boolean;
  }>(MAT_DIALOG_DATA);
  finance = inject(FinanceService);
  private ref = inject(MatDialogRef<TransactionDialog>);
  private fb = inject(FormBuilder);
  private ledger = this.finance.ledger()!;
  installments = this.ledger.installments
    .filter((i) => i.expenseId === this.data.expenseId)
    .sort((a, b) => a.number - b.number);
  balance = (i: (typeof this.installments)[number]) =>
    installmentBalance(i, this.finance.ledger()?.transactions ?? this.ledger.transactions);
  hasOpenBalance = (i: (typeof this.installments)[number]) => this.balance(i).open > 0;
  labels = transactionLabels;
  kinds = Object.keys(transactionLabels) as TransactionKind[];
  methods = paymentMethods;
  money = money;
  date = formatCalendarDate;
  today = localToday();
  error = signal('');
  attachment = signal<LocalAttachment | undefined>(undefined);
  form = this.fb.nonNullable.group({
    kind: ['payment'],
    installmentId: [
      this.installments.find((i) => i.id === this.data.installmentId && this.balance(i).open > 0)
        ?.id ??
        this.installments.find((i) => this.balance(i).open > 0)?.id ??
        '',
      Validators.required,
    ],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [localToday(), Validators.required],
    method: ['PIX'],
    notes: [''],
    paymentId: [''],
  });
  payments() {
    return this.ledger.transactions.filter(
      (t) =>
        t.kind === 'payment' &&
        !t.voidedAt &&
        t.installmentId === this.form.controls.installmentId.value,
    );
  }
  constructor() {
    this.ref.disableClose = true;
    this.form.controls.kind.valueChanges.pipe(takeUntilDestroyed()).subscribe((kind) => {
      this.error.set('');
      this.form.controls.paymentId.setValue('');
      const selected = this.installments.find(
        (i) => i.id === this.form.controls.installmentId.value,
      );
      if (kind === 'payment' && (!selected || this.balance(selected).open === 0))
        this.form.controls.installmentId.setValue(
          this.installments.find(this.hasOpenBalance)?.id ?? '',
        );
      else if (!selected) this.form.controls.installmentId.setValue(this.installments[0]?.id ?? '');
    });
    if (this.data.settle)
      this.form.controls.amount.setValue(
        this.installments.reduce((s, i) => s + this.balance(i).open, 0) / 100,
      );
    else {
      const installment = this.installments.find(
        (i) => i.id === this.form.controls.installmentId.value,
      );
      if (installment) this.form.controls.amount.setValue(this.balance(installment).open / 100);
    }
    this.form.controls.installmentId.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      const installment = this.installments.find((i) => i.id === id);
      if (installment && this.form.controls.kind.value === 'payment')
        this.form.controls.amount.setValue(this.balance(installment).open / 100);
    });
  }
  close() {
    if (!this.finance.busy()) this.ref.close();
  }
  async save() {
    if (this.form.invalid) {
      this.error.set('Informe valor e data válidos.');
      return;
    }
    const v = this.form.getRawValue();
    try {
      if (this.data.settle)
        await this.finance.settle(
          this.data.weddingId,
          this.data.expenseId,
          cents(v.amount),
          v.date,
          v.method,
          v.notes,
          this.attachment(),
        );
      else
        await this.finance.transaction(this.data.weddingId, {
          expenseId: this.data.expenseId,
          installmentId: v.installmentId,
          kind: v.kind as TransactionKind,
          amountCents: cents(v.amount),
          date: v.date,
          method: v.method,
          notes: v.notes,
          paymentId: v.kind === 'refund' ? v.paymentId : undefined,
          attachment: this.attachment(),
        });
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível registrar a operação.');
    }
  }
}
