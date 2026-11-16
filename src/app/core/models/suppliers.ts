import { WeddingEntity } from './models';
import { InstallmentPlan, LocalAttachment } from './finance';

export const supplierCategories = [
  'Buffet',
  'Decoração',
  'Fotografia',
  'Filmagem',
  'DJ',
  'Banda',
  'Cerimonial',
  'Garçons',
  'Segurança',
  'Limpeza',
  'Bolo',
  'Doces',
  'Bebidas',
  'Floricultura',
  'Transporte',
  'Aluguel de equipamentos',
  'Beleza',
  'Outros',
];
export const professionalRoles = [
  'Cerimonialista',
  'Coordenador',
  'Garçom',
  'Cozinheiro',
  'Auxiliar',
  'Bartender',
  'Recepcionista',
  'Segurança',
  'Limpeza',
  'Motorista',
  'Montador',
  'Técnico de som',
  'Técnico de iluminação',
  'Outra função',
];
export const supplierStatuses = {
  prospecting: 'Ainda estou pesquisando',
  quoted: 'Já recebi o preço',
  contracted: 'Já contratei',
  inactive: 'Não vou contratar',
} as const;
export const quoteStatuses = {
  pending: 'Aguardando proposta',
  received: 'Recebida',
  selected: 'Selecionada',
  rejected: 'Descartada',
} as const;
export const contractStatuses = {
  draft: 'Rascunho',
  signed: 'Assinado',
  cancelled: 'Cancelado',
} as const;
export const professionalStatuses = {
  expected: 'A confirmar',
  confirmed: 'Confirmado',
  unavailable: 'Indisponível',
} as const;
export const shiftStatuses = {
  planned: 'Planejada',
  confirmed: 'Confirmada',
  working: 'Em trabalho',
  completed: 'Concluída',
  cancelled: 'Cancelada',
} as const;

export interface Supplier extends WeddingEntity {
  name: string;
  company: string;
  document: string;
  category: string;
  service: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  responsible: string;
  status: keyof typeof supplierStatuses;
  notes: string;
  attachment?: LocalAttachment;
  rating: number;
  review: string;
  createdAt: string;
}
export interface SupplierQuote extends WeddingEntity {
  supplierId: string;
  service: string;
  amountCents: number;
  included: string;
  deliveryDate: string;
  validUntil: string;
  conditions: string;
  status: keyof typeof quoteStatuses;
  notes: string;
  attachment?: LocalAttachment;
  createdAt: string;
}
export interface SupplierContract extends WeddingEntity {
  supplierId: string;
  quoteId: string;
  title: string;
  reference: string;
  amountCents: number;
  signedDate: string;
  deliveryDate: string;
  scope: string;
  conditions: string;
  status: keyof typeof contractStatuses;
  expenseId: string;
  notes: string;
  attachment?: LocalAttachment;
  createdAt: string;
  cancelledAt?: string;
  cancelReason?: string;
}
export interface Professional extends WeddingEntity {
  name: string;
  role: string;
  company: string;
  supplierId: string;
  phone: string;
  whatsapp: string;
  email: string;
  agreedCents: number;
  paymentMode: 'undecided' | 'supplier' | 'individual';
  expenseId: string;
  status: keyof typeof professionalStatuses;
  responsibilities: string;
  notes: string;
  createdAt: string;
}
export interface WorkShift extends WeddingEntity {
  professionalId: string;
  start: string;
  end: string;
  location: string;
  tasks: string;
  completedTasks: string[];
  status: keyof typeof shiftStatuses;
  arrivedAt: string;
  leftAt: string;
  notes: string;
  createdAt: string;
}
export interface SuppliersLedger extends WeddingEntity {
  schemaVersion: 1;
  suppliers: Supplier[];
  quotes: SupplierQuote[];
  contracts: SupplierContract[];
  professionals: Professional[];
  shifts: WorkShift[];
}
export interface ContractFinancePlan extends InstallmentPlan {
  mode: 'create' | 'link' | 'none';
  expenseId: string;
  categoryId: string;
  dueDate: string;
  method: string;
}
