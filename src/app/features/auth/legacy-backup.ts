// Read-only compatibility for an explicit one-time import. Never creates a DB,
// writes a record, or deletes the user's old backup.
export function readLegacyRecords(store: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('organiza-casamento');
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve([]);
    };
    request.onerror = () => {
      if (request.error?.name === 'AbortError') resolve([]);
      else reject(request.error);
    };
    request.onblocked = () => reject(new Error('Feche as outras abas para ler o backup antigo.'));
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(store)) {
        db.close();
        resolve([]);
        return;
      }
      const transaction = db.transaction(store, 'readonly'),
        query = transaction.objectStore(store).getAll();
      query.onsuccess = () => resolve(query.result);
      query.onerror = () => reject(query.error);
      transaction.oncomplete = () => db.close();
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}
