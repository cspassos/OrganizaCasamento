import {
  Supplier,
  SupplierQuote,
  SupplierContract,
  Professional,
  WorkShift,
  SuppliersLedger,
  supplierStatuses,
  quoteStatuses,
  contractStatuses,
  professionalStatuses,
  shiftStatuses,
} from '../models/suppliers';
import { FinanceLedger } from '../models/finance';
import { validEmail, validPhone } from './contact';
import { validateAttachment } from './finance';
import { isCalendarDate } from './wedding';

export function emptySuppliers(weddingId: string): SuppliersLedger {
  return {
    id: weddingId,
    weddingId,
    schemaVersion: 1,
    suppliers: [],
    quotes: [],
    contracts: [],
    professionals: [],
    shifts: [],
  };
}
const entity = (weddingId: string) => ({
  id: crypto.randomUUID(),
  weddingId,
  createdAt: new Date().toISOString(),
});
export function newSupplier(weddingId: string): Supplier {
  return {
    ...entity(weddingId),
    name: '',
    company: '',
    document: '',
    category: 'Outros',
    service: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    responsible: '',
    status: 'prospecting',
    notes: '',
    rating: 0,
    review: '',
  };
}
export function newQuote(weddingId: string): SupplierQuote {
  return {
    ...entity(weddingId),
    supplierId: '',
    service: '',
    amountCents: 0,
    included: '',
    deliveryDate: '',
    validUntil: '',
    conditions: '',
    status: 'received',
    notes: '',
  };
}
export function newContract(weddingId: string): SupplierContract {
  return {
    ...entity(weddingId),
    supplierId: '',
    quoteId: '',
    title: '',
    reference: '',
    amountCents: 0,
    signedDate: '',
    deliveryDate: '',
    scope: '',
    conditions: '',
    status: 'draft',
    expenseId: '',
    notes: '',
  };
}
export function newProfessional(weddingId: string): Professional {
  return {
    ...entity(weddingId),
    name: '',
    role: 'Garçom',
    company: '',
    supplierId: '',
    phone: '',
    whatsapp: '',
    email: '',
    agreedCents: 0,
    paymentMode: 'undecided',
    expenseId: '',
    status: 'expected',
    responsibilities: '',
    notes: '',
  };
}
export function newShift(weddingId: string): WorkShift {
  return {
    ...entity(weddingId),
    professionalId: '',
    start: '',
    end: '',
    location: '',
    tasks: '',
    completedTasks: [],
    status: 'planned',
    arrivedAt: '',
    leftAt: '',
    notes: '',
  };
}
export function localDateTime() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function validDateTime(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) &&
    isCalendarDate(value.slice(0, 10))
  );
}
export function dateTimeMinutes(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const [h, min] = value.slice(11).split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, min) / 60000;
}
export function shiftHours(shift: WorkShift) {
  return (dateTimeMinutes(shift.end) - dateTimeMinutes(shift.start)) / 60;
}
export function taskLines(tasks: string) {
  return [
    ...new Set(
      tasks
        .split(/\r?\n/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}
function text(value: string, label: string, max: number, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new Error(
      `Confira ${label}${required ? ' (obrigatório)' : ''}. Limite: ${max} caracteres.`,
    );
}
function amount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 99999999999)
    throw new Error('Informe um valor válido em reais, sem números negativos.');
}
function date(value: string, label: string, required = false) {
  if ((required || value) && !isCalendarDate(value))
    throw new Error(`Informe uma data válida para ${label}.`);
}
function contacts(value: { phone: string; whatsapp: string; email: string }) {
  if (!validPhone(value.phone) || !validPhone(value.whatsapp))
    throw new Error(
      'Confira o telefone e o WhatsApp. Use DDD e um número válido, ou deixe em branco.',
    );
  if (!validEmail(value.email)) throw new Error('Informe um e-mail válido, ou deixe em branco.');
}
export function validateSuppliers(l: SuppliersLedger, finance: FinanceLedger) {
  if (l.id !== l.weddingId || finance.weddingId !== l.weddingId)
    throw new Error('Os registros pertencem a casamentos diferentes.');
  const ids = new Set<string>();
  for (const row of [
    ...l.suppliers,
    ...l.quotes,
    ...l.contracts,
    ...l.professionals,
    ...l.shifts,
  ]) {
    if (!row.id || ids.has(row.id) || row.weddingId !== l.weddingId)
      throw new Error('Registro duplicado ou de outro casamento.');
    ids.add(row.id);
  }
  const supplier = (id: string) => l.suppliers.find((s) => s.id === id);
  for (const s of l.suppliers) {
    text(s.name, 'o nome do fornecedor', 180, true);
    text(s.company, 'a empresa', 180);
    text(s.category, 'a categoria', 100, true);
    text(s.service, 'o serviço', 300);
    text(s.document, 'o CPF/CNPJ', 32);
    text(s.address, 'o endereço', 400);
    text(s.responsible, 'o responsável', 180);
    text(s.notes, 'as observações', 4000);
    text(s.review, 'a avaliação', 2000);
    contacts(s);
    validateAttachment(s.attachment);
    if (
      !(s.status in supplierStatuses) ||
      !Number.isInteger(s.rating) ||
      s.rating < 0 ||
      s.rating > 5
    )
      throw new Error('Situação ou nota do fornecedor inválida.');
    if (
      s.status === 'inactive' &&
      l.contracts.some((c) => c.supplierId === s.id && c.status === 'signed')
    )
      throw new Error('Cancele os contratos ativos antes de inativar este fornecedor.');
  }
  for (const q of l.quotes) {
    if (!supplier(q.supplierId))
      throw new Error('Selecione um fornecedor cadastrado para a proposta.');
    text(q.service, 'o serviço da proposta', 200, true);
    text(q.included, 'os itens incluídos', 4000);
    text(q.conditions, 'as condições', 2000);
    text(q.notes, 'as observações', 4000);
    amount(q.amountCents);
    date(q.deliveryDate, 'entrega');
    date(q.validUntil, 'validade');
    validateAttachment(q.attachment);
    if (!(q.status in quoteStatuses)) throw new Error('Situação da proposta inválida.');
  }
  const linkedExpenses = new Set<string>(),
    linkedQuotes = new Set<string>();
  for (const c of l.contracts) {
    if (!supplier(c.supplierId))
      throw new Error('Selecione um fornecedor cadastrado para o contrato.');
    if (!(c.status in contractStatuses)) throw new Error('Situação do contrato inválida.');
    text(c.title, 'o título do contrato', 200, true);
    text(c.reference, 'a referência', 150);
    text(c.scope, 'os serviços contratados', 4000);
    text(c.conditions, 'as condições', 2000);
    text(c.notes, 'as observações', 4000);
    amount(c.amountCents);
    date(c.signedDate, 'assinatura', c.status === 'signed');
    date(c.deliveryDate, 'entrega');
    validateAttachment(c.attachment);
    if (c.quoteId) {
      const q = l.quotes.find((q) => q.id === c.quoteId);
      if (!q || q.supplierId !== c.supplierId)
        throw new Error('A proposta escolhida não pertence ao fornecedor do contrato.');
    }
    if (c.status === 'signed') {
      if (!c.amountCents || !c.expenseId)
        throw new Error('Vincule o contrato assinado a uma despesa para acompanhar o pagamento.');
      if (c.quoteId && linkedQuotes.has(c.quoteId))
        throw new Error('Esta proposta já possui um contrato ativo.');
      if (c.quoteId) linkedQuotes.add(c.quoteId);
      if (supplier(c.supplierId)?.status !== 'contracted')
        throw new Error('Um fornecedor com contrato assinado deve estar marcado como contratado.');
    }
    if (c.status === 'draft' && c.expenseId)
      throw new Error('Um rascunho não pode ter uma despesa contratada vinculada.');
    if (c.expenseId) {
      const e = finance.expenses.find((e) => e.id === c.expenseId);
      if (
        !e ||
        e.contractId !== c.id ||
        e.supplierId !== c.supplierId ||
        e.contractedCents !== c.amountCents ||
        linkedExpenses.has(e.id) ||
        (c.status === 'signed' && e.status !== 'contracted') ||
        (c.status === 'cancelled' && e.status !== 'cancelled')
      )
        throw new Error(
          'O vínculo entre contrato e despesa não está consistente. Altere o contrato pelo menu Fornecedores → Contratos.',
        );
      linkedExpenses.add(e.id);
    }
  }
  for (const p of l.professionals) {
    text(p.name, 'o nome do profissional', 180, true);
    text(p.role, 'a função', 100, true);
    text(p.company, 'a empresa', 180);
    text(p.responsibilities, 'as responsabilidades', 4000);
    text(p.notes, 'as observações', 4000);
    contacts(p);
    amount(p.agreedCents);
    if (
      !(p.status in professionalStatuses) ||
      !['undecided', 'supplier', 'individual'].includes(p.paymentMode)
    )
      throw new Error('Situação do profissional inválida.');
    if (p.supplierId && !supplier(p.supplierId))
      throw new Error('Fornecedor do profissional não encontrado.');
    if (p.paymentMode === 'supplier' && !p.supplierId)
      throw new Error('Escolha o fornecedor responsável pelo pagamento da equipe.');
    if (p.expenseId) {
      const e = finance.expenses.find((e) => e.id === p.expenseId);
      if (
        !e ||
        e.professionalId !== p.id ||
        p.paymentMode !== 'individual' ||
        e.contractedCents !== p.agreedCents ||
        p.agreedCents <= 0 ||
        !['contracted', 'cancelled'].includes(e.status) ||
        linkedExpenses.has(e.id) ||
        (e.supplierId ?? '') !== p.supplierId
      )
        throw new Error(
          'A despesa individual deve estar contratada e corresponder ao valor e fornecedor deste profissional.',
        );
      linkedExpenses.add(e.id);
    }
  }
  for (const e of finance.expenses) {
    if (e.supplierId && !supplier(e.supplierId))
      throw new Error('Fornecedor vinculado à despesa não encontrado neste casamento.');
    if (e.contractId && !l.contracts.some((c) => c.id === e.contractId && c.expenseId === e.id))
      throw new Error('Contrato vinculado à despesa não encontrado.');
    if (
      e.professionalId &&
      !l.professionals.some((p) => p.id === e.professionalId && p.expenseId === e.id)
    )
      throw new Error('Profissional vinculado à despesa não encontrado.');
    if (e.contractId && e.professionalId)
      throw new Error(
        'Uma despesa não pode cobrar novamente um profissional já incluído no contrato.',
      );
  }
  for (const shift of l.shifts) {
    if (!l.professionals.some((p) => p.id === shift.professionalId))
      throw new Error('Selecione um profissional cadastrado para a escala.');
    if (!validDateTime(shift.start) || !validDateTime(shift.end) || shift.end <= shift.start)
      throw new Error(
        'O fim da escala deve ser posterior ao início. Para trabalho após a meia-noite, informe a data do dia seguinte.',
      );
    if (!(shift.status in shiftStatuses)) throw new Error('Situação da escala inválida.');
    text(shift.location, 'o local da escala', 300);
    text(shift.tasks, 'as tarefas da escala', 4000);
    text(shift.notes, 'as observações', 4000);
    if (
      taskLines(shift.tasks).length > 100 ||
      new Set(shift.completedTasks).size !== shift.completedTasks.length ||
      shift.completedTasks.some((t) => !taskLines(shift.tasks).includes(t))
    )
      throw new Error('Confira as tarefas da escala; limite de 100 por escala.');
    if (
      (shift.arrivedAt && !validDateTime(shift.arrivedAt)) ||
      (shift.leftAt &&
        (!validDateTime(shift.leftAt) || !shift.arrivedAt || shift.leftAt < shift.arrivedAt))
    )
      throw new Error('A saída registrada deve ser posterior ou igual à chegada.');
    if (
      (shift.status === 'working' && !shift.arrivedAt) ||
      (shift.status === 'completed' && (!shift.arrivedAt || !shift.leftAt))
    )
      throw new Error('Registre chegada e saída antes de concluir a escala.');
    if (
      shift.status !== 'cancelled' &&
      l.shifts.some(
        (other) =>
          other.id !== shift.id &&
          other.professionalId === shift.professionalId &&
          other.status !== 'cancelled' &&
          other.start < shift.end &&
          other.end > shift.start,
      )
    )
      throw new Error(
        'Este profissional já tem outra escala neste horário. Ajuste os horários ou escolha outra pessoa.',
      );
  }
}
