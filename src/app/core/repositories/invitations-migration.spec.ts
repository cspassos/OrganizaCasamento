import { IDBFactory } from 'fake-indexeddb';
import { InvitationsDataRepository } from './invitations.repository';
import { AppRepository } from './app.repository';
describe('Migração de convites', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('preserva pessoas e financeiro da versão 3 ao adicionar convites', async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('organiza-casamento', 3);
      r.onupgradeneeded = () => {
        for (const n of ['preferences', 'weddings', 'people', 'finance'])
          r.result.createObjectStore(n, { keyPath: 'id' });
      };
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction(['people', 'finance'], 'readwrite');
        tx.objectStore('people').put({ id: 'w', guests: ['pessoa existente'] });
        tx.objectStore('finance').put({ id: 'w', paid: 1200000 });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    expect(await new InvitationsDataRepository().list()).toEqual([]);
    expect(
      (await new AppRepository<{ id: string; guests: string[] }>('people').list())[0].guests,
    ).toEqual(['pessoa existente']);
    expect((await new AppRepository<{ id: string; paid: number }>('finance').list())[0].paid).toBe(
      1200000,
    );
  });
});
