import {
  duplicates,
  emptyPeople,
  guestsCsv,
  importGuests,
  newGuest,
  peopleSummary,
  validatePeople,
} from './people';

describe('Pessoas: vínculos, contagens e CSV', () => {
  it('conta pessoas, crianças e convites separadamente, com confirmação parcial e padrinhos sem duplicidade', () => {
    const l = emptyPeople('w');
    l.families.push({ id: 'f', weddingId: 'w', name: 'Família', notes: '' });
    const a = { ...newGuest('w'), familyId: 'f', status: 'Confirmado' as const };
    a.name = 'Ana';
    const b = {
      ...newGuest('w'),
      familyId: 'f',
      child: true,
      age: 7,
      status: 'Não comparecerá' as const,
    };
    b.name = 'Bia';
    const c = { ...newGuest('w'), companionOf: a.id, familyId: 'f' };
    c.name = 'Caio';
    l.guests.push(a, b, c);
    l.godparents.push({
      id: 'p',
      weddingId: 'w',
      guestId: a.id,
      partnerId: '',
      participation: 'Madrinha',
      attireColor: '',
      attireModel: '',
      size: '',
      arrival: '',
      responsibilities: '',
      gift: '',
      position: '',
      entryOrder: 1,
      notes: '',
    });
    validatePeople(l);
    expect(peopleSummary(l)).toMatchObject({
      total: 3,
      confirmed: 1,
      declined: 1,
      pending: 1,
      children: 1,
      invitations: 1,
      godparents: 1,
      godparentConfirmed: 1,
    });
  });
  it('agrupa acompanhantes no convite individual sem reduzir o total de pessoas', () => {
    const l = emptyPeople('w'),
      a = { ...newGuest('w'), name: 'Ana' };
    l.guests.push(a, { ...newGuest('w'), name: 'Bruno', companionOf: a.id });
    expect(peopleSummary(l)).toMatchObject({ total: 2, invitations: 1 });
  });
  it('rejeita vínculos entre casamentos, acompanhantes cíclicos e pares assimétricos', () => {
    const l = emptyPeople('w'),
      g = { ...newGuest('other'), name: 'Ana' };
    l.guests.push(g);
    expect(() => validatePeople(l)).toThrow();
    g.weddingId = 'w';
    g.companionOf = g.id;
    expect(() => validatePeople(l)).toThrow('principal');
  });
  it('alerta nomes e telefones compartilhados sem bloquear o cadastro', () => {
    const a = { ...newGuest('w'), name: 'José', phone: '(11) 99999-8888' },
      b = { ...newGuest('w'), name: 'Maria', phone: '11999998888' };
    expect(duplicates(b, [a])).toHaveLength(1);
    const l = emptyPeople('w');
    l.guests.push(a, b);
    expect(() => validatePeople(l)).not.toThrow();
  });
  it('importa e exporta famílias, acompanhantes, campos multilinha e acentos sem UUIDs', () => {
    const text =
      'Nome;Família;Criança;Idade;Acompanhante de;Confirmação;Observações\r\n"Ana; Silva";Souza;Não;;;Confirmado;"Uma linha\nOutra linha"\r\nBia;Souza;Sim;8;"Ana; Silva";Não comparecerá;';
    const { ledger } = importGuests(text, emptyPeople('w'));
    validatePeople(ledger);
    expect(peopleSummary(ledger)).toMatchObject({
      total: 2,
      invitations: 1,
      confirmed: 1,
      declined: 1,
    });
    const csv = guestsCsv(ledger);
    expect(csv).not.toContain(ledger.guests[0].id);
    const result = importGuests(csv, emptyPeople('new'));
    expect(result.ledger.guests[0].notes).toBe('Uma linha\nOutra linha');
    expect(result.ledger.guests[1].companionOf).toBe(result.ledger.guests[0].id);
  });
  it('rejeita CSV inválido inteiramente sem alterar o original e neutraliza fórmulas na exportação', () => {
    const l = emptyPeople('w');
    expect(() => importGuests('Nome;Criança;Idade\nAna;Sim;45', l)).toThrow('idade');
    expect(l.guests).toHaveLength(0);
    l.guests.push({ ...newGuest('w'), name: '=SUM(A1)' });
    expect(guestsCsv(l)).toContain("'=SUM(A1)");
  });
});
