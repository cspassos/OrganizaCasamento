import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { IDBFactory } from 'fake-indexeddb';
import { SuppliersService } from './suppliers';
import { WeddingsService } from './weddings';
import { IndexedDbRepository } from '../repositories/indexed-db.repository';
import { Wedding } from '../models/models';
import { ContractFinancePlan } from '../models/suppliers';
import { ExpenseDraft } from '../models/finance';
import {
  newSupplier,
  newContract,
  newQuote,
  newProfessional,
  newShift,
  shiftHours,
} from '../utils/suppliers';
import { localToday } from '../utils/finance';

describe('Fornecedores, contratos, financeiro e equipe', () => {
  const wedding: Wedding = { id: 'w1', name: 'Ana e Lucas', demo: false, date: '2027-09-20' };
  let active = signal<Wedding | null>(wedding),
    service: SuppliersService;
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    active = signal<Wedding | null>(wedding);
    await new IndexedDbRepository<Wedding>('weddings').save(wedding);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: WeddingsService,
          useValue: { active, initialized: Promise.resolve(), error: signal('') },
        },
      ],
    });
    service = TestBed.inject(SuppliersService);
    await Promise.all([service.initialized, service.finance.initialized]);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  async function supplier() {
    const s = {
      ...newSupplier(wedding.id),
      name: 'Fotografia Jardim',
      category: 'Fotografia',
      phone: '11999998888',
      email: 'contato@jardim.com',
    };
    await service.saveSupplier(s);
    return s;
  }
  function plan(): ContractFinancePlan {
    return {
      mode: 'create',
      expenseId: '',
      categoryId: service.finance.ledger()!.categories[0].id,
      dueDate: localToday(),
      entryCents: 20000,
      count: 3,
      firstDueDate: localToday(),
      method: 'PIX',
    };
  }
  function draft(amount = 100000): ExpenseDraft {
    return {
      description: 'Contrato de fotografia',
      categoryId: service.finance.ledger()!.categories[0].id,
      supplier: 'Fornecedor informado antes da etapa 06',
      plannedCents: amount,
      contractedCents: amount,
      status: 'contracted',
      contractDate: localToday(),
      dueDate: localToday(),
      method: 'PIX',
      notes: '',
      contractReference: '',
    };
  }
  async function signed() {
    const s = await supplier(),
      c = {
        ...newContract(wedding.id),
        supplierId: s.id,
        title: 'Fotografia completa',
        amountCents: 100000,
        status: 'signed' as const,
        signedDate: localToday(),
      };
    await service.saveContract(c, plan());
    return { s, c: service.ledger()!.contracts[0] };
  }

  it('salva contatos com máscara, várias propostas e rascunhos sem criar despesa', async () => {
    const s = await supplier();
    expect(service.ledger()!.suppliers[0].phone).toBe('(11) 99999-8888');
    const q = {
      ...newQuote(wedding.id),
      supplierId: s.id,
      service: 'Fotografia 8h',
      amountCents: 100000,
    };
    await service.saveQuote(q);
    await service.saveQuote({ ...q, id: crypto.randomUUID(), amountCents: 120000 });
    await service.saveContract(
      { ...newContract(wedding.id), supplierId: s.id, title: 'Rascunho', amountCents: 100000 },
      plan(),
    );
    expect(service.ledger()!.quotes).toHaveLength(2);
    expect(service.finance.ledger()!.expenses).toHaveLength(0);
    expect(service.ledger()!.suppliers[0].status).toBe('quoted');
    await expect(service.saveSupplier({ ...s, email: 'errado' })).rejects.toThrow('e-mail');
  });
  it('assinar cria uma única despesa, parcelas fecham em centavos e editar não duplica', async () => {
    const { c } = await signed();
    expect(service.finance.ledger()!.expenses).toHaveLength(1);
    expect(service.finance.ledger()!.installments.reduce((sum, i) => sum + i.amountCents, 0)).toBe(
      100000,
    );
    expect(service.finance.summary()!.paid).toBe(0);
    expect(service.summary().contracted).toBe(1);
    const ids = service.finance.ledger()!.installments.map((i) => i.id);
    await service.saveContract({ ...c, title: 'Fotografia e álbum' }, plan());
    expect(service.finance.ledger()!.expenses).toHaveLength(1);
    expect(service.finance.ledger()!.installments.map((i) => i.id)).toEqual(ids);
    await expect(service.saveContract({ ...c, amountCents: 200000 }, plan())).rejects.toThrow(
      'Preserve',
    );
  });
  it('vincula despesa antiga sem duplicar parcelas ou pagamentos', async () => {
    const s = await supplier();
    await service.finance.saveExpense(
      wedding.id,
      'antiga',
      { ...draft(), supplier: s.name, supplierId: s.id },
      {
        entryCents: 0,
        count: 1,
        firstDueDate: localToday(),
      },
    );
    const installment = service.finance.ledger()!.installments[0];
    await service.finance.transaction(wedding.id, {
      expenseId: 'antiga',
      installmentId: installment.id,
      kind: 'payment',
      amountCents: 10000,
      date: localToday(),
      method: 'PIX',
      notes: '',
    });
    await service.saveContract(
      {
        ...newContract(wedding.id),
        supplierId: s.id,
        title: 'Contrato vinculado',
        amountCents: 100000,
        signedDate: localToday(),
        status: 'signed',
      },
      { ...plan(), mode: 'link', expenseId: 'antiga' },
    );
    expect(service.finance.ledger()!.expenses).toHaveLength(1);
    expect(service.finance.ledger()!.installments[0].id).toBe(installment.id);
    expect(service.finance.summary()!.paid).toBe(10000);
    expect(service.finance.ledger()!.expenses[0].supplierId).toBe(s.id);
  });
  it('falha de parcelamento ou categoria desfaz contrato e despesa na mesma transação', async () => {
    const s = await supplier(),
      c = {
        ...newContract(wedding.id),
        supplierId: s.id,
        title: 'Contrato',
        amountCents: 100000,
        signedDate: localToday(),
        status: 'signed' as const,
      };
    await expect(service.saveContract(c, { ...plan(), entryCents: 100001 })).rejects.toThrow(
      'entrada',
    );
    await expect(service.saveContract(c, { ...plan(), categoryId: 'não-existe' })).rejects.toThrow(
      'Categoria',
    );
    expect(service.ledger()!.contracts).toHaveLength(0);
    expect(service.finance.ledger()!.expenses).toHaveLength(0);
    expect(service.ledger()!.suppliers[0].status).toBe('prospecting');
  });
  it('cancelamento exige resolver pagamentos e preserva histórico financeiro', async () => {
    const { c } = await signed(),
      i = service.finance.ledger()!.installments[0];
    await service.finance.transaction(wedding.id, {
      expenseId: c.expenseId,
      installmentId: i.id,
      kind: 'payment',
      amountCents: 10000,
      date: localToday(),
      method: 'PIX',
      notes: '',
    });
    await expect(service.cancelContract(c.id, wedding.id, 'Mudança de plano')).rejects.toThrow(
      'possui pagamento',
    );
    expect(service.ledger()!.contracts[0].status).toBe('signed');
    await service.finance.voidTransaction(
      wedding.id,
      service.finance.ledger()!.transactions[0].id,
      'Registro incorreto de teste',
    );
    await service.cancelContract(c.id, wedding.id, 'Mudança de plano');
    expect(service.ledger()!.contracts[0].cancelReason).toBe('Mudança de plano');
    expect(service.finance.ledger()!.expenses[0].status).toBe('cancelled');
    expect(service.finance.ledger()!.transactions).toHaveLength(1);
    expect(service.finance.summary()!.contracted).toBe(0);
  });
  it('edição financeira não contorna vínculo do contrato; exclusões relacionadas são bloqueadas', async () => {
    const { c, s } = await signed();
    await expect(service.finance.cancelExpense(wedding.id, c.expenseId)).rejects.toThrow('vínculo');
    await expect(
      service.finance.saveExpense(wedding.id, c.expenseId, draft(150000), {
        entryCents: 0,
        count: 1,
        firstDueDate: localToday(),
      }),
    ).rejects.toThrow('vínculo');
    await expect(service.removeSupplier(s.id, wedding.id)).rejects.toThrow('vinculadas');
    await expect(service.removeContract(c.id, wedding.id)).rejects.toThrow('rascunhos');
    expect(service.finance.summary()!.contracted).toBe(100000);
  });
  it('pagamento individual usa a despesa existente e equipe incluída não gera cobrança adicional', async () => {
    const s = await supplier(),
      p = {
        ...newProfessional(wedding.id),
        name: 'Carlos',
        supplierId: s.id,
        paymentMode: 'individual' as const,
        agreedCents: 20000,
      };
    await service.saveProfessional(p);
    await service.finance.saveExpense(
      wedding.id,
      'profissional',
      { ...draft(20000), professionalId: p.id, supplierId: s.id },
      { entryCents: 0, count: 1, firstDueDate: localToday() },
    );
    await service.refresh(false);
    await vi.waitFor(() =>
      expect(service.ledger()!.professionals.find((row) => row.id === p.id)!.expenseId).toBe(
        'profissional',
      ),
    );
    await service.saveProfessional({
      ...newProfessional(wedding.id),
      name: 'Ana',
      supplierId: s.id,
      paymentMode: 'supplier',
      agreedCents: 20000,
    });
    expect(service.finance.summary()!.contracted).toBe(20000);
    const i = service.finance.ledger()!.installments[0];
    await service.finance.transaction(wedding.id, {
      expenseId: 'profissional',
      installmentId: i.id,
      kind: 'payment',
      amountCents: 20000,
      date: localToday(),
      method: 'PIX',
      notes: '',
    });
    expect(service.paymentStatus('profissional')).toBe('Paga');
    await expect(service.removeProfessional(p.id, wedding.id)).rejects.toThrow('vinculada');
  });
  it('escalas cruzam meia-noite, admitem horários adjacentes e rejeitam lote com sobreposição sem salvar parcialmente', async () => {
    const a = { ...newProfessional(wedding.id), name: 'Ana' },
      b = { ...newProfessional(wedding.id), name: 'Carlos' };
    await service.saveProfessional(a);
    await service.saveProfessional(b);
    const shift = {
      ...newShift(wedding.id),
      professionalId: a.id,
      start: '2027-09-20T22:00',
      end: '2027-09-21T02:00',
    };
    await service.saveShift(shift);
    expect(shiftHours(shift)).toBe(4);
    await expect(
      service.saveShifts(
        [
          { ...shift, id: 'livre', professionalId: b.id },
          { ...shift, id: 'conflito', start: '2027-09-21T01:00' },
        ],
        wedding.id,
      ),
    ).rejects.toThrow('outra escala');
    expect(service.ledger()!.shifts).toHaveLength(1);
    await service.saveShift({
      ...shift,
      id: 'adjacente',
      start: '2027-09-21T02:00',
      end: '2027-09-21T03:00',
    });
    expect(service.ledger()!.shifts).toHaveLength(2);
  });
  it('registra presença e tarefas sem permitir saída sem chegada ou apagar presença', async () => {
    const p = { ...newProfessional(wedding.id), name: 'Ana' };
    await service.saveProfessional(p);
    const shift = {
      ...newShift(wedding.id),
      professionalId: p.id,
      start: '2020-01-01T09:00',
      end: '2020-01-01T17:00',
      tasks: 'Conferir mesas\nRecepcionar convidados',
    };
    await service.saveShift(shift);
    await expect(
      service.presence(shift.id, wedding.id, 'departure', '2020-01-01T17:00'),
    ).rejects.toThrow('chegada');
    await service.presence(shift.id, wedding.id, 'arrival', '2020-01-01T09:00');
    await service.task(shift.id, wedding.id, 'Conferir mesas', true);
    await service.presence(shift.id, wedding.id, 'departure', '2020-01-01T17:00');
    expect(service.ledger()!.shifts[0].status).toBe('completed');
    expect(service.ledger()!.shifts[0].completedTasks).toEqual(['Conferir mesas']);
    await expect(service.removeShift(shift.id, wedding.id)).rejects.toThrow('histórico');
    await expect(
      service.saveShift({ ...service.ledger()!.shifts[0], start: '2020-01-01T08:00' }),
    ).rejects.toThrow('presença');
  });
  it('duas abas assinando a mesma proposta não criam dois compromissos financeiros', async () => {
    const s = await supplier(),
      q = { ...newQuote(wedding.id), supplierId: s.id, service: 'Fotografia', amountCents: 100000 };
    await service.saveQuote(q);
    const second = TestBed.runInInjectionContext(() => new SuppliersService());
    await second.initialized;
    const c = {
      ...newContract(wedding.id),
      supplierId: s.id,
      quoteId: q.id,
      title: 'Contrato',
      amountCents: 100000,
      signedDate: localToday(),
      status: 'signed' as const,
    };
    const results = await Promise.allSettled([
      service.saveContract(c, plan()),
      second.saveContract({ ...c, id: crypto.randomUUID() }, plan()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await service.refresh(false);
    await service.finance.refresh(true);
    expect(service.ledger()!.contracts).toHaveLength(1);
    expect(service.finance.ledger()!.expenses).toHaveLength(1);
  });
  it('isola casamentos e bloqueia gravação em casamento arquivado', async () => {
    const s = await supplier();
    const other = { ...wedding, id: 'w2' };
    await new IndexedDbRepository<Wedding>('weddings').save(other);
    active.set(other);
    expect(service.ledger()!.suppliers).toHaveLength(0);
    await expect(service.saveSupplier(s)).rejects.toThrow('casamento mudou');
    await expect(
      service.saveQuote({
        ...newQuote(other.id),
        supplierId: s.id,
        service: 'Fornecedor de outro casamento',
      }),
    ).rejects.toThrow('fornecedor cadastrado');
    active.set(wedding);
    await new IndexedDbRepository<Wedding>('weddings').save({ ...wedding, archived: true });
    await expect(service.saveSupplier({ ...s, name: 'Alterado' })).rejects.toThrow('arquivado');
  });
});
