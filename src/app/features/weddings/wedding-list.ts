import { cloudEnabled } from '../../core/repositories/cloud-backend';
import { MatMenuModule } from '@angular/material/menu';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { WeddingsService } from '../../core/services/weddings';
import { Wedding } from '../../core/models/models';
import { formatCalendarDate } from '../../core/utils/wedding';
import { Icon } from '../../shared/components/icon';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { TemporaryDataPanel } from '../../shared/components/temporary-data-panel';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { ListPager } from '../../shared/components/list-pager';
import { TemporaryDataService } from '../../core/services/temporary-data';

@Component({
  selector: 'oc-weddings',
  imports: [
    MatMenuModule,
    RouterLink,
    CurrencyPipe,
    Icon,
    TemporaryDataPanel,
    CollectionTable,
    ListPager,
  ],
  templateUrl: './wedding-list.html',
})
export class WeddingList {
  cloud = cloudEnabled;
  store = inject(WeddingsService);
  private temporary = inject(TemporaryDataService);
  private dialog = inject(MatDialog);
  query = signal('');
  showArchived = signal(false);
  message = signal('');
  error = signal('');
  view = signal('table');
  page = signal(1);
  pageSize = signal(25);
  cards = computed(() => {
    const page = Math.min(
      this.page(),
      Math.max(1, Math.ceil(this.visible().length / this.pageSize())),
    );
    return this.visible().slice((page - 1) * this.pageSize(), page * this.pageSize());
  });
  tableRows = computed(() =>
    this.visible().map((w) => ({
      id: w.id,
      record: w,
      cells: [
        w.name,
        `${w.brideName ?? ''} & ${w.groomName ?? ''}`,
        this.date(w.date),
        w.city ?? '',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          w.initialBudget ?? 0,
        ),
        String(w.estimatedGuests ?? 0),
        w.archived ? 'Arquivado' : this.store.active()?.id === w.id ? 'Selecionado' : 'Ativo',
      ],
    })),
  );
  date = formatCalendarDate;
  visible = computed(() =>
    (this.showArchived() ? this.store.archived() : this.store.weddings()).filter((w) =>
      searchText(`${w.name} ${w.brideName ?? ''} ${w.groomName ?? ''} ${w.city ?? ''}`).includes(
        searchText(this.query()),
      ),
    ),
  );
  async select(w: Wedding) {
    try {
      await this.store.select(w.id);
      this.message.set(`${w.name} selecionado.`);
      this.error.set('');
    } catch {
      this.error.set('Não foi possível selecionar o casamento. Tente novamente.');
    }
  }
  async archive(w: Wedding) {
    const archived = !w.archived;
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          width: '440px',
          data: {
            title: archived ? 'Arquivar casamento?' : 'Restaurar casamento?',
            message: archived
              ? 'Os dados serão preservados. Você poderá restaurar este casamento na lista de arquivados.'
              : 'O casamento voltará a aparecer na lista de casamentos ativos.',
          },
        })
        .afterClosed(),
    );
    if (!confirmed) return;
    try {
      await this.store.setArchived(w.id, archived);
      this.message.set(
        archived ? 'Casamento arquivado. Dados preservados.' : 'Casamento restaurado.',
      );
      this.error.set('');
    } catch {
      this.error.set('Não foi possível concluir a operação. Tente novamente.');
    }
  }
  async remove(w: Wedding) {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          width: '520px',
          maxWidth: '96vw',
          data: {
            title: 'Excluir casamento definitivamente?',
            message: `Isso apagará “${w.name}” e todos os seus gastos, parcelas, pagamentos, fornecedores, contratos, convidados, convites e anexos deste navegador. Não será possível desfazer. Para guardar os dados e recuperar depois, use Arquivar. Os outros casamentos serão mantidos.`,
            confirmLabel: 'Excluir definitivamente',
            danger: true,
          },
        })
        .afterClosed(),
    );
    if (!confirmed) return;
    this.error.set('');
    try {
      await this.store.deletePermanently(w.id);
      await this.temporary.refresh();
      this.message.set('Casamento e dados vinculados excluídos definitivamente.');
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Não foi possível excluir o casamento.',
      );
    }
  }
}
