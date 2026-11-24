import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Expense } from '../../core/models/finance';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';

export function confirmExpenseDeletion(dialog: MatDialog, expense: Expense) {
  const cancelled = expense.status === 'cancelled';
  return firstValueFrom(
    dialog
      .open(ConfirmDialog, {
        data: cancelled
          ? {
              title: 'Excluir despesa definitivamente?',
              message: `A despesa “${expense.description}” e suas parcelas serão excluídas. Essa ação é irreversível.`,
              danger: true,
              confirmLabel: 'Excluir despesa',
            }
          : {
              title: 'Excluir pesquisa de preço?',
              message: `Excluir “${expense.description}”? Esse valor guardado para comparação será removido da lista.`,
            },
      })
      .afterClosed(),
  );
}
