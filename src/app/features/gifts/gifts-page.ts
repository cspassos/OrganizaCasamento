import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { GiftsService } from '../../core/services/gifts';
import { GiftItem, GiftSite, giftQuantities } from '../../core/models/gifts';
import { money } from '../../core/utils/finance';
import { searchText } from '../../shared/components/collection-table';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { GiftDialog } from './gift-dialog';
import { ListPager } from '../../shared/components/list-pager';
import { giftDescription } from '../../core/utils/gift-description';

@Component({
  imports: [FormsModule, RouterLink, ListPager],
  templateUrl: './gifts-page.html',
  styleUrl: './gifts-page.scss',
})
export class GiftsPage {
  store = inject(GiftsService);
  private dialogs = inject(MatDialog);
  query = signal('');
  view = signal<'remaining' | 'received' | 'all'>('remaining');
  counts = giftQuantities;
  message = signal('');
  error = signal('');
  exporting = signal(false);
  money = money;
  description = giftDescription;
  page = signal(1);
  pageSize = signal(12);
  items = computed(() =>
    (this.store.list()?.items ?? []).filter(
      (i) =>
        (this.view() === 'all' ||
          (this.view() === 'remaining'
            ? giftQuantities(i).remaining > 0
            : giftQuantities(i).received > 0)) &&
        searchText(i.name + ' ' + i.description).includes(searchText(this.query())),
    ),
  );
  available = computed(
    () => this.store.list()?.items.filter((i) => giftQuantities(i).remaining > 0).length ?? 0,
  );
  totals = computed(() =>
    (this.store.list()?.items ?? []).reduce(
      (sum, item) => {
        const c = giftQuantities(item);
        return { received: sum.received + c.received, remaining: sum.remaining + c.remaining };
      },
      { received: 0, remaining: 0 },
    ),
  );
  visibleItems = computed(() => {
    const page = Math.min(
      this.page(),
      Math.max(1, Math.ceil(this.items().length / this.pageSize())),
    );
    return this.items().slice((page - 1) * this.pageSize(), page * this.pageSize());
  });
  shareable = computed(() => this.available() > 0 || !!this.store.list()?.sites.length);
  async edit(kind: 'item' | 'site' | 'settings', item?: GiftItem, site?: GiftSite) {
    const saved = await firstValueFrom(
      this.dialogs
        .open(GiftDialog, {
          width: '680px',
          maxWidth: '96vw',
          maxHeight: '90dvh',
          autoFocus: 'first-heading',
          data: { kind, item, site },
        })
        .afterClosed(),
    );
    if (saved) {
      this.message.set('Lista de presentes atualizada.');
      this.error.set('');
    }
  }
  async remove(kind: 'item' | 'site', id: string, name: string) {
    const weddingId = this.store.weddings.active()!.id;
    if (
      !(await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Remover da lista?',
              message: `Remover “${name}” da lista de presentes?`,
            },
          })
          .afterClosed(),
      ))
    )
      return;
    await this.run(() => this.store.remove(weddingId, kind, id), 'Item removido da lista.');
  }
  async received(item: GiftItem) {
    await this.run(
      () => this.store.receiveOne(this.store.weddings.active()!.id, item.id),
      'Uma unidade recebida foi registrada. Para corrigir a quantidade, use Editar presente.',
    );
  }
  private async run(action: () => Promise<unknown>, success: string) {
    this.error.set('');
    try {
      await action();
      this.message.set(success);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível concluir.');
    }
  }
  private download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async export(share = false) {
    const wedding = this.store.weddings.active(),
      list = this.store.list();
    if (!wedding || !list || !this.shareable() || this.exporting()) return;
    this.exporting.set(true);
    this.error.set('');
    const snapshot = structuredClone(list);
    try {
      const { giftsPdf } = await import('../../core/utils/gifts-pdf');
      const blob = await giftsPdf(snapshot, wedding.name);
      if (this.store.weddings.active()?.id !== wedding.id)
        throw new Error('O casamento mudou. Gere a lista novamente.');
      const file = new File([blob], 'lista-de-presentes.pdf', { type: 'application/pdf' });
      if (share && navigator.canShare?.({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: snapshot.title,
            text: `Lista de presentes de ${wedding.name}`,
          });
          this.message.set('Lista preparada para compartilhar.');
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          this.download(blob, 'lista-de-presentes.pdf');
          this.message.set('PDF baixado. Envie esse arquivo pelo WhatsApp ou e-mail.');
        }
      } else {
        this.download(blob, 'lista-de-presentes.pdf');
        this.message.set(
          share
            ? 'PDF baixado. Envie esse arquivo pelo WhatsApp ou e-mail.'
            : 'Lista em PDF baixada.',
        );
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        this.error.set(e instanceof Error ? e.message : 'Não foi possível preparar a lista.');
    } finally {
      this.exporting.set(false);
    }
  }
  async copyMessage() {
    const wedding = this.store.weddings.active(),
      list = this.store.list();
    if (!wedding || !list) return;
    const text = [
      `${list.title} - ${wedding.name}`,
      list.message,
      ...list.sites.map((s) => `${s.name}: ${s.url}`),
      ...list.items
        .filter((i) => giftQuantities(i).remaining > 0)
        .map(
          (i) =>
            `${i.name} - falta receber: ${giftQuantities(i).remaining}${i.priceCents !== null ? ' - ' + money(i.priceCents) + ' por unidade' : ''}${i.url ? '\n' + i.url : ''}`,
        ),
    ].join('\n\n');
    await this.run(
      () => navigator.clipboard.writeText(text),
      'Mensagem copiada. Cole na conversa para enviar.',
    );
  }
}
