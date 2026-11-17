import { InjectionToken } from '@angular/core';
import { FinanceLedger } from '../../../app/core/models/finance';
import { SuppliersLedger } from '../../../app/core/models/suppliers';
import { AppRepository, LOCAL_DB_VERSION } from '../../../app/core/repositories/app.repository';
import { emptyLedger, validateLedger } from '../../../app/core/utils/finance';
import { emptySuppliers, validateSuppliers } from '../../../app/core/utils/suppliers';
import { cloudBackend, cloudEnabled } from '../../../app/core/repositories/cloud-backend';

export interface PlanningRecords {
  suppliers: SuppliersLedger;
  finance: FinanceLedger;
}
export interface SuppliersRepository {
  list(): Promise<SuppliersLedger[]>;
  update(
    weddingId: string,
    action: (suppliers: SuppliersLedger, finance: FinanceLedger) => void,
    fallback?: FinanceLedger,
  ): Promise<PlanningRecords>;
}
// Both repositories use this transaction so financial edits cannot lose or bypass supplier links.
export async function updatePlanning(
  weddingId: string,
  action: (suppliers: SuppliersLedger, finance: FinanceLedger, existingFinance: boolean) => void,
  fallback?: FinanceLedger,
  requireWedding = true,
): Promise<PlanningRecords> {
  if (cloudEnabled)
    return cloudBackend.transact(weddingId, (workspace) => {
      const existing = !!workspace.finance;
      const suppliers = workspace.suppliers ?? emptySuppliers(weddingId);
      const finance = workspace.finance ?? structuredClone(fallback ?? emptyLedger(weddingId));
      action(suppliers, finance, existing);
      validateLedger(finance);
      validateSuppliers(suppliers, finance);
      workspace.suppliers = suppliers;
      workspace.finance = finance;
      return { suppliers, finance };
    });
  await new AppRepository<SuppliersLedger>('suppliers').list();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('organiza-casamento', LOCAL_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Feche as outras abas e tente novamente.'));
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction(['suppliers', 'finance', 'weddings', 'preferences'], 'readwrite');
      const sr = tx.objectStore('suppliers').get(weddingId),
        fr = tx.objectStore('finance').get(weddingId),
        wr = tx.objectStore('weddings').get(weddingId),
        deleted = tx.objectStore('preferences').get(`deleted-wedding:${weddingId}`);
      let remaining = 4,
        result: PlanningRecords,
        failure: unknown;
      const ready = () => {
        if (--remaining) return;
        try {
          if (deleted.result)
            throw new Error('Este casamento foi excluído. Volte à lista de casamentos.');
          if ((requireWedding && !wr.result) || wr.result?.archived)
            throw new Error('Casamento não encontrado ou arquivado.');
          const suppliers: SuppliersLedger = structuredClone(
            sr.result ?? emptySuppliers(weddingId),
          );
          const finance: FinanceLedger = structuredClone(
            fr.result ?? fallback ?? emptyLedger(weddingId),
          );
          action(suppliers, finance, !!fr.result);
          validateLedger(finance);
          validateSuppliers(suppliers, finance);
          tx.objectStore('suppliers').put(suppliers);
          tx.objectStore('finance').put(finance);
          result = { suppliers, finance };
        } catch (e) {
          failure = e;
          tx.abort();
        }
      };
      sr.onsuccess = ready;
      fr.onsuccess = ready;
      wr.onsuccess = ready;
      deleted.onsuccess = ready;
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onabort = () => {
        db.close();
        reject(failure ?? tx.error);
      };
      tx.onerror = () => {
        db.close();
        reject(failure ?? tx.error);
      };
    };
  });
}
export class SuppliersDataRepository implements SuppliersRepository {
  private base = new AppRepository<SuppliersLedger>('suppliers');
  list() {
    return this.base.list();
  }
  update(
    weddingId: string,
    action: (s: SuppliersLedger, f: FinanceLedger) => void,
    fallback?: FinanceLedger,
  ) {
    return updatePlanning(weddingId, action, fallback);
  }
}
export const SUPPLIERS_REPOSITORY = new InjectionToken<SuppliersRepository>('SuppliersRepository', {
  providedIn: 'root',
  factory: () => new SuppliersDataRepository(),
});
