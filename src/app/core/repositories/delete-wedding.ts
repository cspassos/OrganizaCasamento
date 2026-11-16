import { IndexedDbRepository, LOCAL_DB_VERSION } from './indexed-db.repository';
import { Wedding } from '../models/models';

export const deletedWeddingKey = (id: string) => `deleted-wedding:${id}`;
export async function deleteWeddingData(id: string) {
  await new IndexedDbRepository<Wedding>('weddings').list();
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('organiza-casamento', LOCAL_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Feche outras abas e tente novamente.'));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(
        ['weddings', 'finance', 'people', 'invitations', 'suppliers', 'gifts', 'preferences'],
        'readwrite',
      );
      const weddings = tx.objectStore('weddings').getAll();
      const preferences = tx.objectStore('preferences').getAll();
      let remaining = 2;
      let failure: unknown;
      const ready = () => {
        if (--remaining) return;
        try {
          const all = weddings.result as Wedding[];
          if (!all.some((w) => w.id === id))
            throw new Error('Este casamento já foi excluído ou não foi encontrado.');
          for (const name of ['weddings', 'finance', 'people', 'invitations', 'suppliers', 'gifts'])
            tx.objectStore(name).delete(id);
          const prefs = tx.objectStore('preferences');
          for (const preference of preferences.result) {
            if (preference.id === 'active-wedding' && preference.weddingId === id) {
              prefs.put({
                ...preference,
                weddingId: all.find((w) => w.id !== id && !w.archived && !w.demo)?.id ?? null,
              });
            } else if (preference.weddingId === id) prefs.delete(preference.id);
            else if (preference.previousId === id) prefs.put({ ...preference, previousId: null });
          }
          // Keep only an anonymous deletion marker to reject stale writes from other tabs.
          prefs.put({ id: deletedWeddingKey(id) });
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      weddings.onsuccess = ready;
      preferences.onsuccess = ready;
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(failure ?? tx.error);
      };
    };
  });
}
