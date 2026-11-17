import { IDBFactory } from 'fake-indexeddb';
import { AppRepository } from './app.repository';
describe('Migração da etapa 04', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('adiciona pessoas mantendo casamentos, preferências e financeiro da versão 2', async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('organiza-casamento', 2);
      request.onupgradeneeded = () => {
        for (const name of ['preferences', 'weddings', 'finance'])
          request.result.createObjectStore(name, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['preferences', 'weddings', 'finance'], 'readwrite');
        tx.objectStore('weddings').put({ id: 'w', name: 'Casamento existente' });
        tx.objectStore('finance').put({ id: 'w', paid: 400000 });
        tx.objectStore('preferences').put({ id: 'appearance', dark: true });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
    const people = new AppRepository<{ id: string }>('people');
    expect(await people.list()).toEqual([]);
    expect(await new AppRepository<{ id: string; paid: number }>('finance').list()).toEqual([
      { id: 'w', paid: 400000 },
    ]);
    expect((await new AppRepository<{ id: string; name: string }>('weddings').list())[0].name).toBe(
      'Casamento existente',
    );
    expect(
      (await new AppRepository<{ id: string; dark: boolean }>('preferences').list())[0].dark,
    ).toBe(true);
  });
});
