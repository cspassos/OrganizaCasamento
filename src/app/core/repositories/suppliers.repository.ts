import { InjectionToken } from '@angular/core';
import { FinanceLedger } from '../models/finance';
import { SuppliersLedger } from '../models/suppliers';
import { AppRepository } from './app.repository';
import { emptyLedger, validateLedger } from '../utils/finance';
import { emptySuppliers, validateSuppliers } from '../utils/suppliers';
import { cloudBackend } from './cloud-backend';

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
