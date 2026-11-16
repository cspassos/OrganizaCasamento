import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FinanceService } from './finance';
import { WeddingsService } from './weddings';
import { ExpenseDraft, FinanceTransaction } from '../models/finance';
import { Wedding } from '../models/models';
import { localToday } from '../utils/finance';
import { FINANCE_REPOSITORY } from '../repositories/finance.repository';
import { SUPPLIERS_REPOSITORY } from '../repositories/suppliers.repository';
describe('Financial operations', () => {
  it('saves contact and expense atomically and reuses a named contact', async () => {
    const first = await expense('planned');
    const repository = TestBed.inject(SUPPLIERS_REPOSITORY);
    let contacts = (await repository.list())[0].suppliers;
    expect(contacts).toHaveLength(1);
    expect(service.ledger()!.expenses[0].supplierId).toBe(contacts[0].id);
    await service.saveExpense(
      w.id,
      crypto.randomUUID(),
      { ...first.draft, supplier: '  SABOR  ' },
      { entryCents: 0, count: 1, firstDueDate: localToday() },
    );
    contacts = (await repository.list())[0].suppliers;
    expect(contacts).toHaveLength(1);
    expect(service.ledger()!.expenses.every((e) => e.supplierId === contacts[0].id)).toBe(true);
    await expect(
      service.saveExpense(
        w.id,
        crypto.randomUUID(),
        { ...first.draft, supplier: '' },
        { entryCents: 0, count: 1, firstDueDate: localToday() },
      ),
    ).rejects.toThrow('quem vai receber');
    expect((await repository.list())[0].suppliers).toHaveLength(1);
    expect(service.ledger()!.expenses).toHaveLength(2);
    await expect(
      service.saveExpense(
        w.id,
        crypto.randomUUID(),
        {
          ...first.draft,
          status: 'contracted',
          contractedCents: 100,
          supplier: 'Contato que não pode ficar salvo',
        },
        { entryCents: 200, count: 1, firstDueDate: localToday() },
      ),
    ).rejects.toThrow();
    expect((await repository.list())[0].suppliers).toHaveLength(1);
  });
  it('deletes a price research while protecting contracted expenses', async () => {
    const research = await expense('planned');
    await service.deletePriceResearch(w.id, research.id);
    expect(service.ledger()!.expenses).toHaveLength(0);
    expect(service.summary()!.planned).toBe(0);
    const contracted = await expense();
    await expect(service.deletePriceResearch(w.id, contracted.id)).rejects.toThrow('Só é possível');
    expect(service.ledger()!.expenses).toHaveLength(1);
    expect(service.ledger()!.installments).toHaveLength(6);
  });
  it('explains that an already paid installment cannot receive a duplicate payment', async () => {
    const { id } = await expense();
    await operation(id, 'payment', 200000);
    await expect(operation(id, 'payment', 200000)).rejects.toThrow('já está paga');
    expect(service.summary()!.paid).toBe(200000);
    expect(service.ledger()!.transactions).toHaveLength(1);
  });
  it('does not overwrite a saved payment with an older refresh snapshot', async () => {
    const { id } = await expense();
    const repository = TestBed.inject(FINANCE_REPOSITORY);
    const old = structuredClone(await repository.list());
    let release!: (records: typeof old) => void;
    const read = vi.spyOn(repository, 'list').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const refreshing = service.refresh(true);
    await vi.waitFor(() => expect(read).toHaveBeenCalled());
    await operation(id, 'payment', 50000);
    release(old);
    await refreshing;
    expect(service.summary()!.paid).toBe(50000);
    expect(service.ledger()!.transactions).toHaveLength(1);
    read.mockRestore();
  });
  it('settles every remaining installment once, including advance payments', async () => {
    const { id } = await expense();
    await operation(id, 'payment', 50000);
    await service.settle(w.id, id, 1150000, localToday(), 'PIX', 'Quitação antecipada');
    expect(service.summary()!.paid).toBe(1200000);
    expect(service.summary()!.open).toBe(0);
    await expect(
      service.settle(w.id, id, 1150000, localToday(), 'PIX', 'Duplicada'),
    ).rejects.toThrow('saldo');
    expect(service.ledger()!.installments).toHaveLength(6);
  });
  const w: Wedding = { id: 'w1', name: 'Teste', demo: false, date: '', initialBudget: 20000 };
  let active = signal<Wedding | null>(w);
  let service: FinanceService;
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    active = signal<Wedding | null>(w);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WeddingsService,
          useValue: { active, initialized: Promise.resolve(), error: signal('') },
        },
      ],
    });
    service = TestBed.inject(FinanceService);
    await service.initialized;
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  async function expense(status: 'planned' | 'contracted' = 'contracted') {
    const id = crypto.randomUUID(),
      l = service.ledger()!;
    const draft: ExpenseDraft = {
      description: 'Buffet',
      categoryId: l.categories[0].id,
      supplier: 'Sabor',
      plannedCents: 1200000,
      contractedCents: status === 'planned' ? 0 : 1200000,
      status,
      contractDate: localToday(),
      dueDate: localToday(),
      method: 'PIX',
      notes: '',
      contractReference: '',
    };
    await service.saveExpense(w.id, id, draft, {
      entryCents: 200000,
      count: 5,
      firstDueDate: localToday(),
    });
    return { id, draft };
  }
  async function operation(
    expenseId: string,
    kind: FinanceTransaction['kind'],
    amountCents: number,
    paymentId?: string,
  ) {
    const i = service.ledger()!.installments.find((i) => i.expenseId === expenseId)!;
    await service.transaction(w.id, {
      expenseId,
      installmentId: i.id,
      kind,
      amountCents,
      date: localToday(),
      method: 'PIX',
      notes: '',
      paymentId,
    });
    return service.ledger()!.transactions.at(-1)!;
  }
  it('records partial payments and rejects overpayment atomically', async () => {
    const { id } = await expense();
    await operation(id, 'payment', 50000);
    expect(service.summary()!.paid).toBe(50000);
    await expect(operation(id, 'payment', 150001)).rejects.toThrow('saldo');
    expect(service.summary()!.paid).toBe(50000);
    expect(service.ledger()!.transactions).toHaveLength(1);
  });
  it('processes refunds, discounts, interest, fines and reversals consistently', async () => {
    const { id } = await expense();
    const payment = await operation(id, 'payment', 50000);
    const refund = await operation(id, 'refund', 20000, payment.id);
    await operation(id, 'discount', 10000);
    await operation(id, 'interest', 2000);
    await operation(id, 'fine', 500);
    expect(service.summary()!.paid).toBe(30000);
    expect(service.summary()!.contracted).toBe(1192500);
    await expect(service.voidTransaction(w.id, payment.id, 'Erro')).rejects.toThrow('devolução');
    await service.voidTransaction(w.id, refund.id, 'Correção');
    expect(service.summary()!.paid).toBe(50000);
    expect(service.ledger()!.transactions.find((t) => t.id === refund.id)?.voidedAt).toBeTruthy();
  });
  it('requires payment refund before cancellation and retains category references', async () => {
    const { id } = await expense();
    const p = await operation(id, 'payment', 50000);
    await expect(service.cancelExpense(w.id, id)).rejects.toThrow('devolução');
    await operation(id, 'refund', 50000, p.id);
    await service.cancelExpense(w.id, id);
    expect(service.summary()!.contracted).toBe(0);
    expect(service.summary()!.paid).toBe(0);
    expect(service.ledger()!.transactions).toHaveLength(2);
    await expect(service.removeCategory(w.id, service.ledger()!.categories[0].id)).rejects.toThrow(
      'vinculada',
    );
  });
  it('preserves history and prevents invalid schedule edits and duplicate obligations', async () => {
    const { id, draft } = await expense();
    await operation(id, 'payment', 50000);
    await service.saveExpense(
      w.id,
      id,
      { ...draft, description: 'Buffet atualizado' },
      { entryCents: 0, count: 1, firstDueDate: localToday() },
    );
    expect(service.ledger()!.installments).toHaveLength(6);
    await expect(
      service.saveExpense(
        w.id,
        id,
        { ...draft, contractedCents: 1000000 },
        { entryCents: 0, count: 1, firstDueDate: localToday() },
      ),
    ).rejects.toThrow('histórico');
    await service.reschedule(w.id, service.ledger()!.installments[0].id, '2027-01-31');
    expect(service.ledger()!.installments[0].dueDate).toBe('2027-01-31');
  });
  it('keeps weddings independent and rejects stale-form writes', async () => {
    await expense();
    active.set({ ...w, id: 'w2', initialBudget: 50000 });
    expect(service.summary()!.contracted).toBe(0);
    await expect(service.budget('w1', 10000, 0)).rejects.toThrow('mudou');
    await service.budget('w2', 40000, 5000);
    expect(service.summary()!.available).toBe(3500000);
    active.set(w);
    expect(service.summary()!.contracted).toBe(1200000);
    expect(service.summary()!.budget).toBe(2000000);
  });
  it('does not treat planned expenses or generated entries as payments', async () => {
    await expense('planned');
    expect(service.summary()!.planned).toBe(1200000);
    expect(service.summary()!.contracted).toBe(0);
    expect(service.summary()!.paid).toBe(0);
    await expect(service.budget(w.id, 100, 101)).rejects.toThrow('reserva');
  });
});
