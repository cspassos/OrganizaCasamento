import { DatePicker } from '../../shared/components/date-picker';
import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../core/services/finance';
import { money, installmentBalance } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
import { transactionLabels } from '../../core/models/finance';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { downloadAttachment } from '../../shared/components/attachment';
import { TransactionDialog } from './transaction-dialog';
import { confirmExpenseDeletion } from './confirm-expense-deletion';

@Component({
  selector: 'oc-expense-detail',
  imports: [DatePicker, FormsModule, RouterLink],
  templateUrl: './expense-detail.html',
})
export class ExpenseDetail {
  finance = inject(FinanceService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  async remove() {
    const e = this.expense();
    if (!e || !(await confirmExpenseDeletion(this.dialog, e))) return;
    try {
      if (e.status === 'cancelled') await this.finance.deleteCancelledExpense(e.weddingId, e.id);
      else await this.finance.deletePriceResearch(e.weddingId, e.id);
      await this.router.navigateByUrl('/financeiro/despesas');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível excluir.');
    }
  }
  id = this.route.snapshot.paramMap.get('id');
  expense = computed(() => this.finance.expenseRows().find((e) => e.id === this.id));
  installments = computed(
    () =>
      this.finance
        .ledger()
        ?.installments.filter((i) => i.expenseId === this.id)
        .sort((a, b) => a.number - b.number) ?? [],
  );
  installmentBeforeEntry = computed(() => {
    const installments = this.installments();
    const entry = installments.find((item) => item.label === 'Entrada');
    return !!entry && installments.some((item) => item.dueDate < entry.dueDate);
  });
  transactions = computed(
    () =>
      this.finance
        .ledger()
        ?.transactions.filter((t) => t.expenseId === this.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) ?? [],
  );
  audit = computed(
    () =>
      this.finance
        .ledger()
        ?.audit.filter(
          (a) =>
            a.entityId === this.id ||
            this.installments().some((i) => i.id === a.entityId) ||
            this.transactions().some((t) => t.id === a.entityId),
        ) ?? [],
  );
  error = signal('');
  message = signal('');
  money = money;
  date = formatCalendarDate;
  timestamp = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(value),
    );
  labels = transactionLabels;
  download = downloadAttachment;
  balance(i: ReturnType<typeof this.installments>[number]) {
    const balance = installmentBalance(i, this.finance.ledger()!.transactions);
    return this.expense()?.status === 'cancelled' ? { ...balance, open: 0 } : balance;
  }
  isOverdue(i: ReturnType<typeof this.installments>[number]) {
    return (
      this.expense()?.status === 'contracted' &&
      i.dueDate < this.finance.today() &&
      this.balance(i).open > 0
    );
  }
  async operation(installmentId?: string, settle = false) {
    const e = this.expense();
    if (!e) return;
    const result = await firstValueFrom(
      this.dialog
        .open(TransactionDialog, {
          width: '600px',
          maxWidth: '95vw',
          data: {
            weddingId: e.weddingId,
            expenseId: e.id,
            description: e.description,
            installmentId,
            settle,
          },
        })
        .afterClosed(),
    );
    if (result) this.message.set('Operação registrada. Indicadores atualizados.');
  }
  async cancel() {
    const e = this.expense();
    if (!e) return;
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          width: '440px',
          data: {
            title: 'Cancelar despesa?',
            message:
              'O histórico será preservado. A despesa deixará de compor os valores previstos e contratados. Pagamentos existentes devem ser devolvidos ou desfeitos antes.',
          },
        })
        .afterClosed(),
    );
    if (ok)
      try {
        await this.finance.cancelExpense(e.weddingId, e.id);
        this.message.set('Despesa cancelada. Histórico preservado.');
      } catch (error) {
        this.error.set(error instanceof Error ? error.message : 'Não foi possível cancelar.');
      }
  }
  async due(id: string, date: string) {
    try {
      await this.finance.reschedule(this.expense()!.weddingId, id, date);
      this.message.set('Vencimento atualizado.');
      this.error.set('');
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Não foi possível atualizar o vencimento.',
      );
    }
  }
  async undo(id: string) {
    const reason = await firstValueFrom(
      this.dialog.open(VoidReasonDialog, { width: '440px' }).afterClosed(),
    );
    if (!reason) return;
    try {
      await this.finance.voidTransaction(this.expense()!.weddingId, id, reason);
      this.message.set('Operação desfeita. Histórico preservado.');
      this.error.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível desfazer.');
    }
  }
}
import { MatDialogModule } from '@angular/material/dialog';
@Component({
  imports: [MatDialogModule],
  template: `<h2 mat-dialog-title>Desfazer operação?</h2>
    <mat-dialog-content class="undo-dialog-content"
      ><p>
        Os saldos serão recalculados e o histórico será mantido. Para devolver um pagamento
        efetivamente realizado, utilize Devolução de pagamento.
      </p>
      <div class="form-field">
        <label for="voidReason" class="undo-reason-label">Descreva o motivo para desfazer *</label
        ><textarea
          id="voidReason"
          class="undo-reason-input"
          aria-label="Motivo *"
          aria-describedby="voidReasonHelp"
          placeholder="Ex.: registrei o pagamento na parcela errada e preciso corrigir."
          rows="5"
          [value]="reason()"
          (input)="reason.set($any($event.target).value)"
          maxlength="1000"
        ></textarea
        ><small id="voidReasonHelp" class="muted"
          >Este motivo ficará registrado no histórico. {{ reason().length }}/1.000
          caracteres.</small
        >
      </div></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button class="button secondary" [mat-dialog-close]="''">Cancelar</button
      ><button class="button primary" [disabled]="!reason().trim()" [mat-dialog-close]="reason()">
        Confirmar
      </button></mat-dialog-actions
    >`,
})
class VoidReasonDialog {
  reason = signal('');
}
