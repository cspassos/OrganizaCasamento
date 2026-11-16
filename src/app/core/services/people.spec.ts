import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { IDBFactory } from 'fake-indexeddb';
import { PeopleService } from './people';
import { WeddingsService } from './weddings';
import { newGuest, reviewGuestNames } from '../utils/people';
import { Wedding } from '../models/models';

describe('Persistência de pessoas', () => {
  it('vincula todos os nomes à família escolhida e rejeita família inexistente sem inclusão parcial', async () => {
    await service.saveFamily({ id: 'f', weddingId: 'w', name: 'Família Souza', notes: '' });
    await service.addNames(['Ana', 'Carlos'], 'w', '', 'f');
    expect(service.ledger()!.guests.map((g) => g.familyId)).toEqual(['f', 'f']);
    await expect(service.addNames(['Maria', 'Pedro'], 'w', '', 'missing')).rejects.toThrow(
      'família',
    );
    expect(service.ledger()!.guests).toHaveLength(2);
    await service.addNames(['Convidado individual'], 'w');
    expect(service.ledger()!.guests[2].familyId).toBe('');
  });
  it('altera envio sem modificar confirmação e limpa a data ao desmarcar', async () => {
    await service.addNames(['Ana'], 'w');
    const guest = service.ledger()!.guests[0];
    await service.setStatus(guest.id, 'Confirmado', 'w');
    await service.setInvitationSent(guest.id, true, 'w');
    const sentDate = service.ledger()!.guests[0].sentDate;
    expect(sentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(service.ledger()!.guests[0].status).toBe('Confirmado');
    await service.setInvitationSent(guest.id, true, 'w');
    expect(service.ledger()!.guests[0].sentDate).toBe(sentDate);
    await service.setInvitationSent(guest.id, false, 'w');
    expect(service.ledger()!.guests[0].sentDate).toBe('');
    expect(service.ledger()!.guests[0].status).toBe('Confirmado');
    await expect(service.setInvitationSent('missing', true, 'w')).rejects.toThrow('não encontrado');
  });
  it('exige confirmação de homônimos e invalida uma conferência desatualizada sem gravação parcial', async () => {
    await service.addNames(['José Silva'], 'w');
    const names = [' JOSE  SILVA ', 'Maria', 'Maria'];
    const review = reviewGuestNames(names, service.ledger()!.guests);
    expect(review.duplicates).toHaveLength(2);
    await expect(service.addNames(names, 'w')).rejects.toThrow('nomes repetidos');
    expect(service.summary().total).toBe(1);
    await service.addNames(['Maria'], 'w');
    await expect(service.addNames(names, 'w', review.signature)).rejects.toThrow('nomes repetidos');
    expect(service.summary().total).toBe(2);
    await service.addNames(names, 'w', reviewGuestNames(names, service.ledger()!.guests).signature);
    expect(service.summary().total).toBe(5);
  });
  it('adiciona uma lista de nomes de forma atômica e preserva o isolamento do casamento', async () => {
    await service.addNames([' Ana ', 'Carlos'], 'w');
    await service.refresh();
    expect(service.ledger()!.guests.map((g) => g.name)).toEqual(['Ana', 'Carlos']);
    expect(service.ledger()!.guests.every((g) => !g.phone && !g.whatsapp)).toBe(true);
    await expect(service.addNames(['Nome válido', 'x'.repeat(181)], 'w')).rejects.toThrow('180');
    expect(service.summary().total).toBe(2);
    active.set({ id: 'other', name: 'Outro', date: '', demo: false });
    expect(service.summary().total).toBe(0);
    await expect(service.addNames(['Não salvar'], 'w')).rejects.toThrow();
    active.set({ id: 'w', name: 'Teste', date: '', demo: false });
    expect(service.summary().total).toBe(2);
  });
  it('atualiza confirmações em lote sem alteração parcial se a seleção mudou', async () => {
    const a = { ...newGuest('w'), name: 'Ana' },
      b = { ...newGuest('w'), name: 'Beto' };
    await service.saveGuest(a);
    await service.saveGuest(b);
    await expect(service.setStatuses([a.id, 'removido'], 'Confirmado', 'w')).rejects.toThrow(
      'mudou',
    );
    expect(service.summary().confirmed).toBe(0);
    await service.setStatuses([a.id, b.id], 'Confirmado', 'w');
    expect(service.summary().confirmed).toBe(2);
  });
  it('exclui somente principal e acompanhantes confirmados, sem exclusão parcial nem registros não revisados', async () => {
    const principal = { ...newGuest('w'), name: 'Maria' },
      companion = { ...newGuest('w'), name: 'Carlos' },
      other = { ...newGuest('w'), name: 'Pedro' };
    companion.companionOf = principal.id;
    await service.saveGuest(principal);
    await service.saveGuest(companion);
    await service.saveGuest(other);
    await expect(
      service.removeGuestAndCompanions(principal.id, 'w', [principal.id]),
    ).rejects.toThrow('mudou');
    expect(service.summary().total).toBe(3);
    await service.saveGodparent({
      id: 'godparent',
      weddingId: 'w',
      guestId: companion.id,
      partnerId: '',
      participation: 'Padrinho',
      attireColor: '',
      attireModel: '',
      size: '',
      arrival: '',
      responsibilities: '',
      gift: '',
      position: '',
      entryOrder: 0,
      notes: '',
    });
    await expect(
      service.removeGuestAndCompanions(principal.id, 'w', [principal.id, companion.id]),
    ).rejects.toThrow('Carlos');
    expect(service.summary().total).toBe(3);
    await service.removeGodparent('godparent', 'w');
    await service.removeGuestAndCompanions(principal.id, 'w', [principal.id, companion.id]);
    await service.refresh();
    expect(service.ledger()!.guests.map((g) => g.name)).toEqual(['Pedro']);
  });
  let service: PeopleService;
  let active = signal<Wedding | null>({ id: 'w', name: 'Teste', date: '', demo: false });
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    active = signal<Wedding | null>({ id: 'w', name: 'Teste', date: '', demo: false });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: WeddingsService, useValue: { active } }],
    });
    service = TestBed.inject(PeopleService);
    await service.initialized;
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  it('preserva confirmação parcial, rejeita exclusão com vínculo e mantém isolamento', async () => {
    await service.saveFamily({ id: 'f', weddingId: 'w', name: 'Souza', notes: '' });
    const a = { ...newGuest('w'), name: 'Ana', familyId: 'f' },
      b = { ...newGuest('w'), name: 'Bia', familyId: 'f' };
    await service.saveGuest(a);
    await service.saveGuest(b);
    await service.setStatus(a.id, 'Confirmado', 'w');
    await expect(service.removeFamily('f', 'w')).rejects.toThrow('integrantes');
    await service.refresh();
    expect(service.summary()).toMatchObject({ total: 2, confirmed: 1, pending: 1, invitations: 1 });
    active.set({ id: 'w2', name: 'Outro', date: '', demo: false });
    expect(service.summary().total).toBe(0);
    await expect(service.saveGuest(a)).rejects.toThrow('mudou');
  });
  it('mantém pares simétricos, evita duplicar padrinhos e preserva o convidado ao remover participação', async () => {
    const a = { ...newGuest('w'), name: 'Ana' },
      b = { ...newGuest('w'), name: 'Beto' };
    await service.saveGuest(a);
    await service.saveGuest(b);
    const base = {
      weddingId: 'w',
      partnerId: '',
      participation: 'Padrinho',
      attireColor: '',
      attireModel: '',
      size: '',
      arrival: '',
      responsibilities: '',
      gift: '',
      position: '',
      entryOrder: 0,
      notes: '',
    };
    await service.saveGodparent({ ...base, id: 'p1', guestId: a.id });
    await service.saveGodparent({ ...base, id: 'p2', guestId: b.id, partnerId: 'p1' });
    expect(service.summary()).toMatchObject({ total: 2, godparents: 2, pairs: 1 });
    await expect(service.saveGodparent({ ...base, id: 'p3', guestId: a.id })).rejects.toThrow(
      'já é',
    );
    await expect(service.removeGuest(a.id, 'w')).rejects.toThrow('participação');
    await service.removeGodparent('p1', 'w');
    expect(service.summary()).toMatchObject({ total: 2, godparents: 1, pairs: 0 });
  });
});
