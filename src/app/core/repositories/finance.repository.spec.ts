import { IDBFactory } from 'fake-indexeddb';
import { AppRepository } from './app.repository';
describe('Financial schema and atomic storage', () => {
  beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
  afterEach(() => vi.unstubAllGlobals());
  it('upgrades version 1 without losing wedding data', async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('organiza-casamento', 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('weddings', { keyPath: 'id' });
        r.result.createObjectStore('preferences', { keyPath: 'id' });
      };
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction('weddings', 'readwrite');
        tx.objectStore('weddings').put({ id: 'existing', name: 'Preservado' });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
      r.onerror = () => reject(r.error);
    });
    await new AppRepository<{ id: string }>('finance').list();
    expect(await new AppRepository<{ id: string; name: string }>('weddings').list()).toContainEqual(
      { id: 'existing', name: 'Preservado' },
    );
  });
  it('serializes concurrent updates and rolls back a rejected operation', async () => {
    const a = new AppRepository<{ id: string; count: number }>('finance'),
      b = new AppRepository<{ id: string; count: number }>('finance');
    await a.save({ id: 'w', count: 0 });
    await Promise.all([
      a.update('w', (value) => ({ ...value!, count: value!.count + 1 })),
      b.update('w', (value) => ({ ...value!, count: value!.count + 1 })),
    ]);
    expect((await a.list())[0].count).toBe(2);
    await expect(
      a.update('w', () => {
        throw new Error('Rejeitada');
      }),
    ).rejects.toThrow('Rejeitada');
    expect((await b.list())[0].count).toBe(2);
  });
});
