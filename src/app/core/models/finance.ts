import { WeddingEntity } from './models';
export interface FinanceCategory extends WeddingEntity {
  name: string;
  budgetCents: number;
}
export interface LocalAttachment {
  name: string;
  type: string;
  data: string;
}
export interface Expense extends WeddingEntity {
  description: string;
  categoryId: string;
  additionalCategoryIds?: string[];
  supplier: string;
  supplierId?: string;
  contractId?: string;
  professionalId?: string;
  plannedCents: number;
  contractedCents: number;
  status: 'planned' | 'contracted' | 'cancelled';
  contractDate: string;
  dueDate: string;
  method: string;
  notes: string;
  contractReference: string;
  attachment?: LocalAttachment;
  createdAt: string;
}
export interface Installment extends WeddingEntity {
  expenseId: string;
  number: number;
  label: string;
  amountCents: number;
  dueDate: string;
}
export type TransactionKind = 'payment' | 'refund' | 'discount' | 'interest' | 'fine';
export interface FinanceTransaction extends WeddingEntity {
  expenseId: string;
  installmentId: string;
  kind: TransactionKind;
  amountCents: number;
  date: string;
  method: string;
  notes: string;
  paymentId?: string;
  attachment?: LocalAttachment;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
}
export interface FinanceAudit extends WeddingEntity {
  at: string;
  action: string;
  entityId: string;
  detail: string;
}
export interface FinanceLedger extends WeddingEntity {
  schemaVersion: 1;
  budgetCents: number | null;
  reserveCents: number;
  categories: FinanceCategory[];
  expenses: Expense[];
  installments: Installment[];
  transactions: FinanceTransaction[];
  audit: FinanceAudit[];
}
export interface ExpenseDraft {
  description: string;
  categoryId: string;
  additionalCategoryIds?: string[];
  supplier: string;
  supplierId?: string;
  contractId?: string;
  professionalId?: string;
  plannedCents: number;
  contractedCents: number;
  status: 'planned' | 'contracted';
  contractDate: string;
  dueDate: string;
  method: string;
  notes: string;
  contractReference: string;
  attachment?: LocalAttachment;
}
export interface InstallmentPlan {
  entryCents: number;
  count: number;
  firstDueDate: string;
}
export const paymentMethods = [
  'PIX',
  'Dinheiro',
  'Cartão de crédito',
  'Cartão de débito',
  'Transferência',
  'Boleto',
  'Outros',
];
export const transactionLabels: Record<TransactionKind, string> = {
  payment: 'Pagamento',
  refund: 'Devolução de pagamento',
  discount: 'Desconto',
  interest: 'Juros',
  fine: 'Multa',
};
export const initialCategories = [
  'Cerimônia',
  'Recepção',
  'Buffet',
  'Bebidas',
  'Decoração',
  'Flores',
  'Fotografia',
  'Filmagem',
  'Música',
  'DJ',
  'Vestido',
  'Terno',
  'Maquiagem',
  'Cabelo',
  'Convites',
  'Lembrancinhas',
  'Bolo',
  'Doces',
  'Transporte',
  'Hospedagem',
  'Cartório',
  'Equipe',
  'Outros',
];
