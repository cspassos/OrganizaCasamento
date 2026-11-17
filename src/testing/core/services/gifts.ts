import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { AppRepository, LOCAL_DB_VERSION } from '../../../app/core/repositories/app.repository';
import { WeddingsService } from '../../../app/core/services/weddings';
import { cloudEnabled } from '../../../app/core/repositories/cloud-backend';
import {
  GiftItem,
  GiftList,
  GiftSite,
  emptyGifts,
  giftUrl,
  validateGifts,
  giftQuantities,
} from '../../../app/core/models/gifts';

@Injectable({ providedIn: 'root' })
export class GiftsService {
  weddings = inject(WeddingsService);
  private repository = new AppRepository<GiftList>('gifts');
  private records = signal<GiftList[]>([]);
  list = computed(() => {
    const id = this.weddings.active()?.id;
    return id ? (this.records().find((l) => l.id === id) ?? emptyGifts(id)) : null;
  });
  busy = signal(false);
  loading = signal(true);
  error = signal('');
  private revision = 0;
  private channel?: BroadcastChannel;
  initialized = this.refresh();
  constructor() {
    const reload = () => {
      if (!this.busy()) void this.refresh();
    };
    window.addEventListener('focus', reload);
    try {
      this.channel = new BroadcastChannel('organiza-casamento-gifts');
      this.channel.onmessage = reload;
    } catch {}
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('focus', reload);
      this.channel?.close();
    });
  }
  async refresh() {
    const revision = ++this.revision;
    try {
      await this.weddings.initialized;
      const lists = await this.repository.list();
      if (revision === this.revision) {
        this.records.set(lists);
        this.error.set('');
      }
    } catch {
      this.error.set(
        'Não foi possível carregar os presentes. Atualize a página para tentar novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  private async mutate(weddingId: string, change: (list: GiftList) => void) {
    await this.initialized;
    if (this.weddings.active()?.id !== weddingId)
      throw new Error('O casamento mudou. Abra a lista novamente.');
    if (this.busy()) throw new Error('Aguarde a operação em andamento.');
    if (this.error() || this.weddings.error())
      throw new Error('Atualize os dados antes de salvar.');
    this.busy.set(true);
    try {
      const list = cloudEnabled
        ? await this.repository.update(weddingId, (current) => {
            const result = structuredClone(current ?? emptyGifts(weddingId));
            change(result);
            result.items = result.items.map((item) => {
              const counts = giftQuantities(item);
              return {
                ...item,
                quantity: counts.quantity,
                receivedQuantity: counts.received,
                received: counts.remaining === 0,
              };
            });
            validateGifts(result);
            return result;
          })
        : await new Promise<GiftList>((resolve, reject) => {
            const request = indexedDB.open('organiza-casamento', LOCAL_DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction(['gifts', 'weddings', 'preferences'], 'readwrite');
              const gifts = tx.objectStore('gifts').get(weddingId);
              const wedding = tx.objectStore('weddings').get(weddingId);
              const deleted = tx.objectStore('preferences').get(`deleted-wedding:${weddingId}`);
              let pending = 3,
                result: GiftList,
                failure: unknown;
              const ready = () => {
                if (--pending) return;
                try {
                  if (!wedding.result || wedding.result.archived || deleted.result)
                    throw new Error(
                      'Este casamento foi arquivado ou excluído. Volte à lista de casamentos.',
                    );
                  result = structuredClone(gifts.result ?? emptyGifts(weddingId));
                  change(result);
                  result.items = result.items.map((item) => {
                    const counts = giftQuantities(item);
                    return {
                      ...item,
                      quantity: counts.quantity,
                      receivedQuantity: counts.received,
                      received: counts.remaining === 0,
                    };
                  });
                  validateGifts(result);
                  tx.objectStore('gifts').put(result);
                } catch (error) {
                  failure = error;
                  tx.abort();
                }
              };
              gifts.onsuccess = wedding.onsuccess = deleted.onsuccess = ready;
              tx.oncomplete = () => {
                db.close();
                resolve(result);
              };
              tx.onabort = tx.onerror = () => {
                db.close();
                reject(failure ?? tx.error);
              };
            };
          });
      this.revision++;
      this.records.update((rows) => [...rows.filter((r) => r.id !== weddingId), list]);
      try {
        this.channel?.postMessage(weddingId);
      } catch {
        /* Data is already persisted. */
      }
    } finally {
      this.busy.set(false);
    }
  }
  saveItem(weddingId: string, item: GiftItem) {
    return this.mutate(weddingId, (l) => {
      l.items = [
        ...l.items.filter((i) => i.id !== item.id),
        {
          ...item,
          name: item.name.trim(),
          description: item.description.trim(),
          url: giftUrl(item.url),
        },
      ];
    });
  }
  saveSite(weddingId: string, site: GiftSite) {
    return this.mutate(weddingId, (l) => {
      l.sites = [
        ...l.sites.filter((s) => s.id !== site.id),
        { ...site, name: site.name.trim(), url: giftUrl(site.url) },
      ];
    });
  }
  configure(weddingId: string, title: string, message: string) {
    return this.mutate(weddingId, (l) => {
      l.title = title.trim();
      l.message = message.trim();
    });
  }
  remove(weddingId: string, kind: 'item' | 'site', id: string) {
    return this.mutate(weddingId, (l) => {
      if (kind === 'item') l.items = l.items.filter((i) => i.id !== id);
      else l.sites = l.sites.filter((s) => s.id !== id);
    });
  }
  received(weddingId: string, id: string, received: boolean) {
    return this.mutate(weddingId, (l) => {
      const item = l.items.find((i) => i.id === id);
      if (!item) throw new Error('Presente não encontrado.');
      item.receivedQuantity = received ? giftQuantities(item).quantity : 0;
    });
  }
  receiveOne(weddingId: string, id: string) {
    return this.mutate(weddingId, (list) => {
      const item = list.items.find((item) => item.id === id);
      if (!item) throw new Error('Presente não encontrado.');
      item.receivedQuantity = giftQuantities(item).received + 1;
    });
  }
}
