import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { IDBFactory } from 'fake-indexeddb';
import { InvitationsService } from './invitations';
import { WeddingsService } from './weddings';
import { AppRepository } from '../repositories/app.repository';
import { Wedding } from '../models/models';
import { PeopleLedger } from '../models/people';
import { emptyPeople, newGuest } from '../utils/people';
import { newDesign } from '../utils/invitations';
describe('Convites e RSVP local', () => {
  const wedding: Wedding = {
    id: 'w1',
    name: 'Clara e Lucas',
    date: '2027-09-20',
    brideName: 'Clara',
    groomName: 'Lucas',
    demo: false,
  };
  let service: InvitationsService,
    active = signal<Wedding | null>(wedding),
    people: PeopleLedger;
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    active = signal<Wedding | null>(wedding);
    await new AppRepository<Wedding>('weddings').save(wedding);
    people = emptyPeople(wedding.id);
    people.families.push({ id: 'family', weddingId: wedding.id, name: 'Família Silva', notes: '' });
    people.guests.push(
      { ...newGuest(wedding.id), name: 'Maria', familyId: 'family' },
      { ...newGuest(wedding.id), name: 'Pedro', familyId: 'family', child: true, age: 8 },
    );
    await new AppRepository<PeopleLedger>('people').save(people);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: WeddingsService, useValue: { active, initialized: Promise.resolve() } },
      ],
    });
    service = TestBed.inject(InvitationsService);
    await service.initialized;
    await service.people.initialized;
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  async function issue() {
    const design = newDesign(wedding);
    await service.saveDesign(design);
    return service.issue(design.id, people.guests[0].id, wedding.id);
  }
  it('prepara lote sem duplicar famílias e cancela toda a alteração quando uma pessoa não existe', async () => {
    const design = newDesign(wedding);
    await service.saveDesign(design);
    const ids = people.guests.map((g) => g.id);
    await expect(
      service.issueMany(design.id, [...ids, 'inexistente'], wedding.id),
    ).rejects.toThrow();
    expect(service.ledger()!.issues).toHaveLength(0);
    expect(await service.issueMany(design.id, ids, wedding.id)).toEqual({
      created: 1,
      existing: 0,
    });
    expect(await service.issueMany(design.id, ids, wedding.id)).toEqual({
      created: 0,
      existing: 1,
    });
    expect(service.ledger()!.issues[0].recipients).toHaveLength(2);
    expect(service.people.ledger()!.guests.every((g) => !g.invitationSent)).toBe(true);
    await service.saveDesign({ ...design, title: 'Alterado' });
    expect(service.ledger()!.issues[0].design.title).toBe(design.title);
  });
  it('lote de envios é atômico, preserva respostas e bloqueia seleção desatualizada ou desativada', async () => {
    const i = await issue();
    await expect(service.bulkIssues([i.id, 'removido'], 'sent', wedding.id)).rejects.toThrow(
      'mudou',
    );
    expect(service.ledger()!.issues[0].sentAt).toBeUndefined();
    await service.people.setStatus(people.guests[0].id, 'Confirmado', wedding.id);
    await service.bulkIssues([i.id], 'sent', wedding.id);
    expect(service.people.summary().confirmed).toBe(1);
    await service.bulkIssues([i.id], 'revoke', wedding.id);
    await expect(service.bulkIssues([i.id], 'sent', wedding.id)).rejects.toThrow('desativados');
  });
  it('fila de WhatsApp persiste, não registra preparo como envio e não processa a mesma entrada duas vezes', async () => {
    const i = await issue();
    const queue = {
      id: 'fila',
      design: i.design,
      action: 'invite',
      text: 'Olá {nome}',
      entries: [
        {
          id: 'item',
          guestId: people.guests[0].id,
          label: 'Família Silva',
          recipientIds: people.guests.map((g) => g.id),
          state: 'pending' as const,
        },
      ],
    };
    await service.saveWhatsappQueue(queue, wedding.id);
    await service.refresh();
    expect(service.ledger()!.whatsappQueue?.entries[0].state).toBe('pending');
    expect(service.people.ledger()!.guests.every((g) => !g.invitationSent)).toBe(true);
    await expect(service.saveWhatsappQueue({ ...queue, id: 'outra' }, wedding.id)).rejects.toThrow(
      'fila atual',
    );
    await service.updateWhatsappEntry('fila', 'item', 'sent', wedding.id);
    expect(service.people.ledger()!.guests.every((g) => g.invitationSent)).toBe(true);
    expect(service.ledger()!.issues[0].sentAt).toBeTruthy();
    await expect(service.updateWhatsappEntry('fila', 'item', 'sent', wedding.id)).rejects.toThrow(
      'mudou',
    );
    active.set({ ...wedding, id: 'outro' });
    expect(service.ledger()!.whatsappQueue).toBeUndefined();
  });
  it('registra o convite familiar quando todos os integrantes recebem individualmente; lembrete não registra convite', async () => {
    const i = await issue();
    const entries = people.guests.map((g) => ({
      id: g.id,
      guestId: g.id,
      label: g.name,
      recipientIds: [g.id],
      state: 'pending' as const,
    }));
    await service.saveWhatsappQueue(
      { id: 'individual', design: i.design, action: 'invite', text: 'Olá', entries },
      wedding.id,
    );
    await service.updateWhatsappEntry('individual', entries[0].id, 'sent', wedding.id);
    expect(service.ledger()!.issues[0].sentAt).toBeUndefined();
    await service.updateWhatsappEntry('individual', entries[1].id, 'sent', wedding.id);
    expect(service.ledger()!.issues[0].sentAt).toBeTruthy();
    await service.people.saveGuest({
      ...service.people.ledger()!.guests[0],
      invitationSent: false,
    });
    await service.saveWhatsappQueue(
      { id: 'lembrete', design: i.design, action: 'reminder', text: 'Olá', entries: [entries[0]] },
      wedding.id,
    );
    await service.updateWhatsappEntry('lembrete', entries[0].id, 'sent', wedding.id);
    expect(
      service.people.ledger()!.guests.find((g) => g.id === entries[0].guestId)!.invitationSent,
    ).toBe(false);
  });
  it('cria um convite familiar sem duplicar pessoas e mantém a cópia emitida após editar o modelo', async () => {
    const i = await issue();
    expect(i.recipients).toHaveLength(2);
    expect(i.token).toMatch(/^[a-f\d]{64}$/);
    expect(service.people.summary().total).toBe(2);
    await service.saveDesign({ ...i.design, title: 'Modelo alterado', message: 'Texto novo' });
    expect((await service.localView(i.token)).issue.design.message).toBe(i.design.message);
    await expect(service.issue(i.designId, people.guests[1].id, wedding.id)).rejects.toThrow(
      'já tem um convite',
    );
    expect(service.ledger()!.issues).toHaveLength(1);
  });
  it('confirma uma pessoa, recusa a outra e persiste sem dupla contagem nem envio automático', async () => {
    const i = await issue();
    await service.respond(i.token, [
      { guestId: people.guests[0].id, attending: true, diet: 'Sem lactose' },
      { guestId: people.guests[1].id, attending: false, diet: '' },
    ]);
    expect(service.people.summary()).toMatchObject({
      total: 2,
      confirmed: 1,
      declined: 1,
      invitations: 1,
    });
    const view = await service.localView(i.token);
    expect(view.members[0].diet).toBe('Sem lactose');
    expect(service.people.ledger()!.guests.every((g) => !g.invitationSent)).toBe(true);
    await service.markSent(i.id, wedding.id);
    expect(service.people.ledger()!.guests.every((g) => g.invitationSent)).toBe(true);
    expect(service.people.summary()).toMatchObject({ confirmed: 1, declined: 1 });
  });
  it('rejeita respostas incompletas e IDs de fora da família sem salvar parcialmente', async () => {
    const i = await issue();
    await expect(
      service.respond(i.token, [{ guestId: people.guests[0].id, attending: true, diet: '' }]),
    ).rejects.toThrow('cada pessoa');
    await expect(
      service.respond(i.token, [
        { guestId: people.guests[0].id, attending: true, diet: '' },
        { guestId: 'outra-pessoa', attending: false, diet: '' },
      ]),
    ).rejects.toThrow('cada pessoa');
    expect(service.people.summary().confirmed).toBe(0);
    expect(service.ledger()!.issues[0].responses).toHaveLength(0);
  });
  it('desativa links sem apagar respostas e gera token novo ao recriar', async () => {
    const i = await issue();
    await service.revoke(i.id, wedding.id);
    await expect(service.localView(i.token)).rejects.toThrow('desativado');
    await expect(service.respond(i.token, [])).rejects.toThrow('desativado');
    const next = await service.issue(i.designId, people.guests[0].id, wedding.id);
    expect(next.token).not.toBe(i.token);
  });
  it('mantém isolamento do casamento selecionado e não permite apagar modelo com convite ativo', async () => {
    const i = await issue();
    await expect(service.deleteDesign(i.designId, wedding.id)).rejects.toThrow('Desative');
    active.set({ ...wedding, id: 'outro' });
    expect(service.ledger()!.issues).toHaveLength(0);
    await expect(service.saveDesign(i.design)).rejects.toThrow('casamento mudou');
    await service.respond(
      i.token,
      people.guests.map((g) => ({ guestId: g.id, attending: true, diet: '' })),
    );
    expect(service.people.summary().total).toBe(0);
    expect((await service.localView(i.token)).members.every((g) => g.status === 'Confirmado')).toBe(
      true,
    );
  });
});
