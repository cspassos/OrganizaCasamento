import { Repository } from '../../../app/core/models/models';
import { cloudBackend, cloudEnabled } from '../../../app/core/repositories/cloud-backend';
export const LOCAL_DB_VERSION = 6;
export class AppRepository<T extends { id: string }> implements Repository<T> {
  private db?: Promise<IDBDatabase>;
  constructor(
    private store:
      'preferences' | 'weddings' | 'finance' | 'people' | 'invitations' | 'suppliers' | 'gifts',
    private forceLocal = false,
  ) {}
  private open(): Promise<IDBDatabase> {
    return (this.db ??= new Promise((resolve, reject) => {
      const r = indexedDB.open('organiza-casamento', LOCAL_DB_VERSION);
      r.onupgradeneeded = () => {
        for (const name of [
          'preferences',
          'weddings',
          'finance',
          'people',
          'invitations',
          'suppliers',
          'gifts',
        ])
          if (!r.result.objectStoreNames.contains(name))
            r.result.createObjectStore(name, { keyPath: 'id' });
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => r.result.close();
        resolve(r.result);
      };
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('Feche outras abas para atualizar a base local.'));
    }));
  }
  async list(): Promise<T[]> {
    if (cloudEnabled && !this.forceLocal) return cloudBackend.list<T>(this.store);
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const r = db.transaction(this.store).objectStore(this.store).getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  private async write(action: (s: IDBObjectStore) => void, id?: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const guarded = this.store !== 'preferences' && !!id;
      const tx = db.transaction(guarded ? [this.store, 'preferences'] : this.store, 'readwrite');
      let failure: unknown;
      if (guarded) {
        const marker = tx.objectStore('preferences').get(`deleted-wedding:${id}`);
        marker.onsuccess = () => {
          if (marker.result) {
            failure = new Error('Este casamento foi excluído. Volte à lista de casamentos.');
            tx.abort();
          } else action(tx.objectStore(this.store));
        };
      } else action(tx.objectStore(this.store));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(failure ?? tx.error);
      tx.onabort = () => reject(failure ?? tx.error);
    });
  }
  save(value: T) {
    if (cloudEnabled && !this.forceLocal) return cloudBackend.save(this.store, value);
    return this.write((s) => {
      s.put(value);
    }, value.id);
  }
  remove(id: string) {
    if (cloudEnabled && !this.forceLocal) return cloudBackend.remove(this.store, id);
    return this.write((s) => {
      s.delete(id);
    });
  }
  async update(id: string, transform: (value: T | undefined) => T): Promise<T> {
    if (cloudEnabled && !this.forceLocal) return cloudBackend.update(this.store, id, transform);
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const guarded = this.store !== 'preferences';
      const tx = db.transaction(guarded ? [this.store, 'preferences'] : this.store, 'readwrite');
      const store = tx.objectStore(this.store);
      const request = store.get(id);
      let value: T;
      let failure: unknown;
      const marker = guarded ? tx.objectStore('preferences').get(`deleted-wedding:${id}`) : null;
      let remaining = marker ? 2 : 1;
      if (marker) marker.onsuccess = () => ready();
      const ready = () => {
        if (--remaining) return;
        if (marker?.result) {
          failure = new Error('Este casamento foi excluído. Volte à lista de casamentos.');
          tx.abort();
          return;
        }
        try {
          value = transform(request.result);
          if (value.id !== id) throw new Error('Identificador inválido.');
          store.put(value);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      request.onsuccess = ready;
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(failure ?? tx.error);
      tx.onabort = () => reject(failure ?? tx.error);
    });
  }
}
