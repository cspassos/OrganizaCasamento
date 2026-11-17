import { Injectable, inject, signal } from '@angular/core';
import { AppRepository, LOCAL_DB_VERSION } from '../../../app/core/repositories/app.repository';
import { buildTemporarySeed } from '../../../app/data/mocks/temporary-seed';
import { WeddingsService } from '../../../app/core/services/weddings';
import { FinanceService } from '../../../app/core/services/finance';
import { PeopleService } from '../../../app/core/services/people';
import { cloudEnabled } from '../../../app/core/repositories/cloud-backend';
interface SeedMarker {
  id: string;
  weddingId: string;
  previousId: string | null;
}
const markerId = 'temporary-seed-stages-1-3';
@Injectable({ providedIn: 'root' })
export class TemporaryDataService {
  private weddings = inject(WeddingsService);
  private finance = inject(FinanceService);
  private people = inject(PeopleService);
  marker = signal<SeedMarker | null>(null);
  busy = signal(false);
  ready = signal(false);
  error = signal('');
  initialized = this.inspect();
  refresh() {
    return this.inspect();
  }
  private async inspect() {
    if (cloudEnabled) {
      this.ready.set(true);
      return;
    }
    try {
      this.marker.set(
        (await new AppRepository<SeedMarker>('preferences').list()).find(
          (m) => m.id === markerId,
        ) ?? null,
      );
    } catch {
      this.error.set('Não foi possível consultar a massa temporária.');
    } finally {
      this.ready.set(true);
    }
  }
  private async write(remove: boolean) {
    if (cloudEnabled)
      throw new Error('A massa local está disponível somente no ambiente de testes.');
    await this.initialized;
    await this.weddings.initialized;
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const seed = remove ? null : buildTemporarySeed();
      // One transaction creates/removes the fixture and its selection marker together.
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('organiza-casamento', LOCAL_DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Feche outras abas e tente novamente.'));
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction(
              ['weddings', 'finance', 'people', 'invitations', 'suppliers', 'gifts', 'preferences'],
              'readwrite',
            ),
            prefs = tx.objectStore('preferences');
          let failure: unknown;
          const marker = prefs.get(markerId);
          marker.onsuccess = () => {
            const existing = marker.result as SeedMarker | undefined;
            const selection = prefs.get('active-wedding');
            selection.onsuccess = () => {
              const selected = selection.result?.weddingId ?? null;
              if (remove) {
                if (!existing) return;
                const wedding = tx.objectStore('weddings').get(existing.weddingId);
                wedding.onsuccess = () => {
                  if (wedding.result && !wedding.result.temporarySeed) {
                    failure = new Error(
                      'Este cadastro não é uma massa temporária. Nenhum dado foi removido.',
                    );
                    tx.abort();
                    return;
                  }
                  tx.objectStore('weddings').delete(existing.weddingId);
                  tx.objectStore('finance').delete(existing.weddingId);
                  tx.objectStore('people').delete(existing.weddingId);
                  tx.objectStore('invitations').delete(existing.weddingId);
                  tx.objectStore('suppliers').delete(existing.weddingId);
                  tx.objectStore('gifts').delete(existing.weddingId);
                  prefs.delete(markerId);
                  if (selected === existing.weddingId)
                    prefs.put({ id: 'active-wedding', weddingId: existing.previousId });
                };
              } else if (!existing && seed) {
                tx.objectStore('weddings').add(seed.wedding);
                tx.objectStore('finance').add(seed.ledger);
                prefs.add({ id: markerId, weddingId: seed.wedding.id, previousId: selected });
                prefs.put({ id: 'active-wedding', weddingId: seed.wedding.id });
              }
            };
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(failure ?? tx.error);
          };
          tx.onabort = () => {
            db.close();
            reject(failure ?? tx.error);
          };
        };
      });
      await this.inspect();
      await this.weddings.refresh();
      await this.finance.refresh();
      await this.people.refresh();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível preparar a massa.');
      throw e;
    } finally {
      this.busy.set(false);
    }
  }
  create() {
    return this.write(false);
  }
  remove() {
    return this.write(true);
  }
  async select() {
    await this.weddings.select(this.marker()!.weddingId);
  }
}
