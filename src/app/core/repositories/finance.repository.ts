import { InjectionToken } from '@angular/core';
import { Repository } from '../models/models';
import { FinanceLedger } from '../models/finance';
import { AppRepository } from './app.repository';
import { updatePlanning } from './suppliers.repository';
export interface FinanceRepository extends Repository<FinanceLedger> {
  update(
    id: string,
    transform: (value: FinanceLedger | undefined) => FinanceLedger,
    ensureSupplierFor?: string,
  ): Promise<FinanceLedger>;
}
export class FinanceDataRepository implements FinanceRepository {
  private base = new AppRepository<FinanceLedger>('finance');
  list() {
    return this.base.list();
  }
  save(value: FinanceLedger) {
    return this.update(value.id, () => value).then(() => undefined);
  }
  remove(_id: string): Promise<void> {
    return Promise.reject(
      new Error(
        'Preserve o histórico financeiro. Arquive o casamento em vez de apagar o financeiro.',
      ),
    );
  }
  async update(
    id: string,
    transform: (value: FinanceLedger | undefined) => FinanceLedger,
    ensureSupplierFor?: string,
  ) {
    const result = await updatePlanning(
      id,
      (suppliers, finance, existing) => {
        const updated = transform(existing ? finance : undefined);
        if (updated.id !== id || updated.weddingId !== id)
          throw new Error('Identificador inválido.');
        Object.assign(finance, updated);
        if (ensureSupplierFor) {
          const expense = finance.expenses.find((e) => e.id === ensureSupplierFor)!;
          const name = expense.supplier.trim();
          if (!name || name.length > 180)
            throw new Error('Informe o fornecedor ou quem vai receber (até 180 caracteres).');
          const normalize = (s: string) =>
            s
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
              .replace(/\s+/g, ' ')
              .toLocaleLowerCase('pt-BR');
          let supplier = expense.supplierId
            ? suppliers.suppliers.find((s) => s.id === expense.supplierId)
            : suppliers.suppliers.find((s) => normalize(s.name) === normalize(name));
          if (expense.supplierId && !supplier)
            throw new Error('O fornecedor não está mais disponível. Escolha novamente.');
          if (!supplier) {
            supplier = {
              id: crypto.randomUUID(),
              weddingId: id,
              name,
              company: '',
              document: '',
              category:
                finance.categories.find((c) => c.id === expense.categoryId)?.name ?? 'Outros',
              service: '',
              phone: '',
              whatsapp: '',
              email: '',
              address: '',
              responsible: '',
              status: expense.status === 'contracted' ? 'contracted' : 'prospecting',
              notes: '',
              rating: 0,
              review: '',
              createdAt: new Date().toISOString(),
            };
            suppliers.suppliers.push(supplier);
          }
          expense.supplierId = supplier.id;
          expense.supplier = supplier.name;
          if (expense.status === 'contracted') supplier.status = 'contracted';
        }
        for (const expense of finance.expenses) {
          if (expense.supplierId) {
            const supplier = suppliers.suppliers.find((s) => s.id === expense.supplierId);
            if (supplier) expense.supplier = supplier.name;
          }
          if (expense.professionalId) {
            const p = suppliers.professionals.find((p) => p.id === expense.professionalId);
            if (!p || p.paymentMode !== 'individual' || (p.expenseId && p.expenseId !== expense.id))
              throw new Error(
                'Este profissional já tem uma despesa vinculada ou não recebe individualmente.',
              );
            p.expenseId = expense.id;
          }
        }
      },
      undefined,
      false,
    );
    return result.finance;
  }
}
export const FINANCE_REPOSITORY = new InjectionToken<FinanceRepository>('FinanceRepository', {
  providedIn: 'root',
  factory: () => new FinanceDataRepository(),
});
