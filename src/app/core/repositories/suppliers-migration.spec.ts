import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbRepository, LOCAL_DB_VERSION } from './indexed-db.repository';
describe('Migração de fornecedores e equipe', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('adiciona fornecedores à versão 4 sem modificar pessoas, convites ou financeiro', async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('organiza-casamento', 4);
      r.onupgradeneeded = () => {
        for (const name of ['preferences', 'weddings', 'finance', 'people', 'invitations'])
          r.result.createObjectStore(name, { keyPath: 'id' });
      };
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction(['finance', 'people', 'invitations'], 'readwrite');
        tx.objectStore('finance').put({ id: 'w', sentinel: 'pagamento preservado' });
        tx.objectStore('people').put({ id: 'w', sentinel: 'pessoas preservadas' });
        tx.objectStore('invitations').put({ id: 'w', sentinel: 'convite preservado' });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    expect(await new IndexedDbRepository<{ id: string }>('suppliers').list()).toEqual([]);
    expect(LOCAL_DB_VERSION).toBe(6);
    for (const [store, sentinel] of [
      ['finance', 'pagamento preservado'],
      ['people', 'pessoas preservadas'],
      ['invitations', 'convite preservado'],
    ] as const)
      expect(
        (await new IndexedDbRepository<{ id: string; sentinel: string }>(store).list())[0].sentinel,
      ).toBe(sentinel);
  });
});
