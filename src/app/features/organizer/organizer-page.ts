import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { OrganizerService } from '../../core/services/organizer';
import { OrganizerItem } from '../../core/models/models';
import { OrganizerDialog } from './organizer-dialog';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { Icon } from '../../shared/components/icon';
import { formatCalendarDate } from '../../core/utils/wedding';
import { money } from '../../core/utils/finance';

@Component({
  selector: 'oc-organizer-page',
  imports: [FormsModule, RouterLink, Icon],
  templateUrl: './organizer-page.html',
  styleUrl: './organizer-page.scss',
})
export class OrganizerPage {
  store = inject(OrganizerService);
  dialogs = inject(MatDialog);
  query = signal('');
  page = signal(1);
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / 12)));
  currentPage = computed(() => Math.min(this.page(), this.pages()));
  visible = computed(() =>
    this.filtered().slice((this.currentPage() - 1) * 12, this.currentPage() * 12),
  );
  constructor() {
    effect(() => {
      this.query();
      this.filter();
      this.page.set(1);
    });
  }
  filter = signal('all');
  message = signal('');
  error = signal('');
  date = formatCalendarDate;
  money = money;
  filtered = computed(() => {
    const q = this.query()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return this.store
      .items()
      .filter((i) =>
        this.filter() === 'completed'
          ? i.completed
          : !i.completed && (this.filter() === 'all' || i.kind === this.filter()),
      )
      .filter((i) =>
        (i.title + ' ' + i.text)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(q),
      )
      .sort(
        (a, b) =>
          Number(b.important) - Number(a.important) ||
          (a.kind === 'reminder' ? a.date + a.time : '9999').localeCompare(
            b.kind === 'reminder' ? b.date + b.time : '9999',
          ),
      );
  });
  async edit(kind: 'note' | 'reminder', item?: OrganizerItem) {
    const weddingId = this.store.weddings.active()?.id;
    if (!weddingId) return;
    const saved = await firstValueFrom(
      this.dialogs
        .open(OrganizerDialog, {
          width: '620px',
          maxWidth: '96vw',
          data: { weddingId, kind, item },
        })
        .afterClosed(),
    );
    if (saved) {
      this.error.set('');
      this.message.set('Salvo. Um detalhe a menos para guardar na cabeça.');
    }
  }
  async toggle(item: OrganizerItem) {
    try {
      await this.store.toggle(item);
      this.message.set(item.completed ? 'Lembrete reaberto.' : 'Lembrete concluído.');
      this.error.set('');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    }
  }
  async remove(item: OrganizerItem) {
    if (
      !(await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Excluir este item?',
              message: `Excluir “${item.title}”?`,
              danger: true,
              confirmLabel: 'Excluir',
            },
          })
          .afterClosed(),
      ))
    )
      return;
    try {
      await this.store.remove(item);
      this.error.set('');
      this.message.set('Item excluído.');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  }
}
