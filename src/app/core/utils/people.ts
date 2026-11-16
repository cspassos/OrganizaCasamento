import { Guest, PeopleLedger, guestStatuses, sides } from '../models/people';
import { formatCalendarDate, isCalendarDate } from './wedding';
import { formatPhone, validEmail, validPhone } from './contact';

export function emptyPeople(weddingId: string): PeopleLedger {
  return { id: weddingId, weddingId, schemaVersion: 1, guests: [], families: [], godparents: [] };
}
export function newGuest(weddingId: string): Guest {
  return {
    id: crypto.randomUUID(),
    weddingId,
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    familyId: '',
    group: '',
    relationship: '',
    side: 'Ambos',
    child: false,
    age: null,
    companionOf: '',
    diet: '',
    accessibility: '',
    table: '',
    invitationSent: false,
    sentDate: '',
    status: 'Ainda não convidado',
    notes: '',
  };
}
export function reviewGuestNames(names: string[], guests: Guest[]) {
  const key = (name: string) =>
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('pt-BR');
  const groups = new Map<string, { name: string; occurrences: number; existing: string[] }>();
  for (const name of names) {
    const normalized = key(name);
    const group = groups.get(normalized) ?? {
      name: name.trim(),
      occurrences: 0,
      existing: guests
        .filter((g) => key(g.name) === normalized)
        .map((g) => g.id)
        .sort(),
    };
    group.occurrences++;
    groups.set(normalized, group);
  }
  const duplicates = [...groups.values()].filter((g) => g.occurrences > 1 || g.existing.length > 0);
  return { duplicates, signature: duplicates.length ? JSON.stringify(duplicates) : '' };
}
export function copyFamilyMember(source: Guest): Guest {
  return {
    ...source,
    id: crypto.randomUUID(),
    name: '',
  };
}
export function peopleSummary(l: PeopleLedger) {
  const confirmed = l.guests.filter((g) => g.status === 'Confirmado').length;
  const declined = l.guests.filter((g) => g.status === 'Não comparecerá').length;
  const invitations = new Set(
    l.guests.map((g) => (g.familyId ? 'family:' + g.familyId : 'guest:' + (g.companionOf || g.id))),
  ).size;
  const pairs = new Set(
    l.godparents.filter((p) => p.partnerId).map((p) => [p.id, p.partnerId].sort().join(':')),
  ).size;
  const godparentConfirmed = l.godparents.filter(
    (p) => l.guests.find((g) => g.id === p.guestId)?.status === 'Confirmado',
  ).length;
  const godparentDeclined = l.godparents.filter(
    (p) => l.guests.find((g) => g.id === p.guestId)?.status === 'Não comparecerá',
  ).length;
  return {
    total: l.guests.length,
    confirmed,
    declined,
    pending: l.guests.length - confirmed - declined,
    children: l.guests.filter((g) => g.child).length,
    adults: l.guests.filter((g) => !g.child).length,
    invitations,
    godparents: l.godparents.length,
    pairs,
    godparentConfirmed,
    godparentDeclined,
    godparentPending: l.godparents.length - godparentConfirmed - godparentDeclined,
  };
}
export function validatePeople(l: PeopleLedger) {
  const ids = new Set<string>();
  for (const row of [...l.guests, ...l.families, ...l.godparents]) {
    if (!row.id || ids.has(row.id) || row.weddingId !== l.weddingId)
      throw new Error('Registro de pessoas inválido.');
    ids.add(row.id);
  }
  for (const f of l.families)
    if (!f.name.trim()) throw new Error('Informe o nome da família ou grupo.');
  for (const g of l.guests) {
    if (!g.name.trim()) throw new Error('Informe o nome do convidado.');
    if (!guestStatuses.includes(g.status) || !sides.includes(g.side as (typeof sides)[number]))
      throw new Error('Situação ou lado inválido.');
    if (g.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email))
      throw new Error('Informe um e-mail válido.');
    if (g.child && g.age !== null && (!Number.isInteger(g.age) || g.age < 0 || g.age > 17))
      throw new Error('A idade da criança deve estar entre 0 e 17 anos.');
    if (g.familyId && !l.families.some((f) => f.id === g.familyId))
      throw new Error('Família não encontrada.');
    if (g.sentDate && (!isCalendarDate(g.sentDate) || !g.invitationSent))
      throw new Error('Confira a data de envio do convite.');
    if (g.companionOf) {
      const host = l.guests.find((p) => p.id === g.companionOf);
      if (!host || host.id === g.id || host.companionOf)
        throw new Error('Escolha um convidado principal válido para o acompanhante.');
      if (host.familyId !== g.familyId)
        throw new Error('O acompanhante deve pertencer à mesma família do convidado principal.');
    }
  }
  const assigned = new Set<string>();
  for (const p of l.godparents) {
    if (!l.guests.some((g) => g.id === p.guestId) || assigned.has(p.guestId))
      throw new Error('A pessoa já é padrinho/madrinha ou não foi encontrada.');
    assigned.add(p.guestId);
    if (!p.participation.trim() || !Number.isInteger(p.entryOrder) || p.entryOrder < 0)
      throw new Error('Confira o tipo de participação e a ordem de entrada.');
    if (p.arrival && !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.arrival))
      throw new Error('Horário de chegada inválido.');
    if (p.partnerId) {
      const partner = l.godparents.find((x) => x.id === p.partnerId);
      if (!partner || partner.id === p.id || partner.partnerId !== p.id)
        throw new Error('Par de padrinhos inválido.');
    }
  }
}
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
export function duplicates(g: Guest, others: Guest[]) {
  const contacts = [g.phone, g.whatsapp].map((value) => value.replace(/\D/g, '')).filter(Boolean);
  return others.filter(
    (p) =>
      p.id !== g.id &&
      (normalize(p.name) === normalize(g.name) ||
        [p.phone, p.whatsapp].some((value) => contacts.includes(value.replace(/\D/g, ''))) ||
        (!!g.email && normalize(p.email) === normalize(g.email))),
  );
}
export const guestColumns = [
  'Nome',
  'Telefone',
  'WhatsApp',
  'E-mail',
  'Família',
  'Grupo',
  'Relação',
  'Lado',
  'Criança',
  'Idade',
  'Acompanhante de',
  'Restrições alimentares',
  'Acessibilidade',
  'Mesa',
  'Convite enviado',
  'Data de envio',
  'Confirmação',
  'Observações',
];
const csvCell = (v: string) => '"' + (/^[=+@-]/.test(v) ? "'" + v : v).replace(/"/g, '""') + '"';
export function guestsCsv(l: PeopleLedger, guests = l.guests) {
  return (
    '\uFEFF' +
    [
      guestColumns,
      ...guests.map((g) => [
        g.name,
        g.phone,
        g.whatsapp,
        g.email,
        l.families.find((f) => f.id === g.familyId)?.name ?? '',
        g.group,
        g.relationship,
        g.side,
        g.child ? 'Sim' : 'Não',
        g.age === null ? '' : '' + g.age,
        l.guests.find((p) => p.id === g.companionOf)?.name ?? '',
        g.diet,
        g.accessibility,
        g.table,
        g.invitationSent ? 'Sim' : 'Não',
        g.sentDate ? formatCalendarDate(g.sentDate) : '',
        g.status,
        g.notes,
      ]),
    ]
      .map((row) => row.map(csvCell).join(';'))
      .join('\r\n')
  );
}
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const sep = source.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      row.push(value);
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else value += c;
  }
  if (quoted) throw new Error('CSV inválido: aspas não foram fechadas.');
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function importGuests(
  text: string,
  ledger: PeopleLedger,
): { ledger: PeopleLedger; warnings: string[]; count: number } {
  const l = structuredClone(ledger),
    rows = parseCsv(text),
    headers = rows.shift()?.map(normalize) ?? [];
  if (!headers.includes('nome'))
    throw new Error('O CSV precisa da coluna Nome. Baixe o modelo para conferir as colunas.');
  if (!rows.length || rows.length > 5000)
    throw new Error('Importe entre 1 e 5.000 pessoas por arquivo.');
  const warnings: string[] = [],
    added: { guest: Guest; host: string }[] = [];
  rows.forEach((row, index) => {
    const read = (name: string) =>
      (row[headers.indexOf(normalize(name))] ?? '').trim().replace(/^'(?=[=+@-])/, '');
    const g = newGuest(l.weddingId);
    g.name = read('Nome');
    g.phone = read('Telefone');
    g.whatsapp = read('WhatsApp');
    for (const [field, value] of [
      ['Telefone', g.phone],
      ['WhatsApp', g.whatsapp],
    ]) {
      if (!validPhone(value))
        throw new Error(
          `Onde está o problema: Linha ${index + 2}, convidado ${g.name || 'sem nome'}.\nCampo: ${field}\nVocê preencheu: ${value}\n\nComo corrigir: confira o número na planilha. Inclua o código da cidade, como (11) 3456-7890 para fixo ou (11) 99999-8888 para celular. O celular deve começar com 9 depois do código da cidade.\nSe não souber o número, apague o conteúdo dessa célula e deixe-a vazia.`,
        );
    }
    g.phone = formatPhone(g.phone);
    g.whatsapp = formatPhone(g.whatsapp);
    g.email = read('E-mail');
    if (!validEmail(g.email)) throw new Error(`Linha ${index + 2}: informe um e-mail válido.`);
    g.group = read('Grupo');
    g.relationship = read('Relação');
    g.side = read('Lado') || 'Ambos';
    const yes = (name: string) => {
      const s = normalize(read(name));
      if (s && !['sim', 'nao'].includes(s))
        throw new Error(`Linha ${index + 2}: ${name} deve ser Sim ou Não.`);
      return s === 'sim';
    };
    g.child = yes('Criança');
    g.age = g.child && read('Idade') ? Number(read('Idade')) : null;
    g.diet = read('Restrições alimentares');
    g.accessibility = read('Acessibilidade');
    g.table = read('Mesa');
    g.invitationSent = yes('Convite enviado');
    g.sentDate = read('Data de envio');
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(g.sentDate)) {
      const [d, m, y] = g.sentDate.split('/');
      g.sentDate = `${y}-${m}-${d}`;
    }
    g.status = (read('Confirmação') || 'Ainda não convidado') as Guest['status'];
    g.notes = read('Observações');
    const family = read('Família');
    if (family) {
      let f = l.families.find((f) => normalize(f.name) === normalize(family));
      if (!f) {
        f = { id: crypto.randomUUID(), weddingId: l.weddingId, name: family, notes: '' };
        l.families.push(f);
      }
      g.familyId = f.id;
    }
    if (duplicates(g, l.guests).length)
      warnings.push(`Linha ${index + 2}: confira possível duplicidade de ${g.name}.`);
    l.guests.push(g);
    added.push({ guest: g, host: read('Acompanhante de') });
  });
  for (const { guest, host } of added)
    if (host) {
      const matches = l.guests.filter(
        (g) => g.id !== guest.id && normalize(g.name) === normalize(host),
      );
      if (matches.length !== 1)
        throw new Error(
          `Acompanhante de ${guest.name}: convidado principal ausente ou ambíguo (${host}).`,
        );
      guest.companionOf = matches[0].id;
    }
  validatePeople(l);
  return { ledger: l, warnings, count: rows.length };
}
