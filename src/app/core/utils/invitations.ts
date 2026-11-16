import {
  InvitationDesign,
  InvitationLedger,
  InvitationStyle,
  invitationStyles,
  RsvpAnswer,
} from '../models/invitations';
import { Wedding } from '../models/models';
import { Guest, PeopleLedger } from '../models/people';
import { formatCalendarDate, isCalendarDate } from './wedding';
import { phoneDigits, validPhone } from './contact';
export function emptyInvitations(weddingId: string): InvitationLedger {
  return { id: weddingId, weddingId, schemaVersion: 1, designs: [], issues: [], messages: {} };
}
export function invitationToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
}
export function newDesign(w: Wedding, style: InvitationStyle = 'Clássico'): InvitationDesign {
  const palette: Record<InvitationStyle, [string, string, string]> = {
    Clássico: ['#fcf9f1', '#31392f', '#b09252'],
    Elegante: ['#f6f1e7', '#283c37', '#b09252'],
    Minimalista: ['#ffffff', '#29332d', '#69795f'],
    Moderno: ['#f6f4ee', '#293d44', '#bd744e'],
    Floral: ['#fafbf5', '#3f5541', '#7f9972'],
    Rústico: ['#f3eadb', '#514233', '#96734a'],
    Romântico: ['#fff5f4', '#624349', '#bb878f'],
    Personalizado: ['#faf8f0', '#343c35', '#b09252'],
  };
  const [background, color, accent] = palette[style];
  return {
    id: crypto.randomUUID(),
    weddingId: w.id,
    title: `Convite ${style.toLowerCase()}`,
    style,
    font: 'serif',
    bride: w.brideName ?? '',
    groom: w.groomName ?? '',
    date: w.date,
    time: w.ceremonyTime ?? '',
    venue: w.ceremonyVenue ?? '',
    address: [w.ceremonyAddress, w.city, w.state].filter(Boolean).join(' · '),
    reception: w.receptionVenue && w.receptionVenue !== w.ceremonyVenue ? w.receptionVenue : '',
    receptionTime: w.receptionTime ?? '',
    message:
      'Juntos, com nossas famílias, convidamos você para celebrar o começo de uma nova história.',
    footer: 'Sua presença tornará este dia ainda mais especial.',
    background,
    color,
    accent,
    photo: '',
  };
}
export function validateDesign(d: InvitationDesign) {
  if (!invitationStyles.includes(d.style)) throw new Error('Escolha um modelo válido.');
  for (const [label, value, max] of [
    ['Título', d.title, 100],
    ['Nome da noiva', d.bride, 80],
    ['Nome do noivo', d.groom, 80],
  ] as const)
    if (!value.trim() || value.length > max)
      throw new Error(`${label}: preencha até ${max} caracteres.`);
  if (d.date && !isCalendarDate(d.date)) throw new Error('Escolha uma data válida.');
  if ([d.time, d.receptionTime].some((t) => t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))
    throw new Error('Informe horários válidos.');
  for (const value of [d.background, d.color, d.accent])
    if (!/^#[\da-f]{6}$/i.test(value)) throw new Error('Escolha cores válidas.');
  if (!['serif', 'italic', 'sans'].includes(d.font)) throw new Error('Escolha uma fonte válida.');
  if (
    d.message.length > 240 ||
    d.footer.length > 130 ||
    d.venue.length > 110 ||
    d.address.length > 180 ||
    d.reception.length > 110
  )
    throw new Error('Reduza o texto para caber no convite.');
  if (
    d.photo &&
    (!/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(d.photo) || d.photo.length > 2800000)
  )
    throw new Error('Use uma imagem JPG, PNG ou WebP de até 2 MB.');
}
export function recipientGroup(people: PeopleLedger, guestId: string) {
  const guest = people.guests.find((g) => g.id === guestId);
  if (!guest) throw new Error('Selecione um convidado cadastrado.');
  const host = guest.companionOf || guest.id;
  const members = people.guests.filter((g) =>
    guest.familyId ? g.familyId === guest.familyId : g.id === host || g.companionOf === host,
  );
  return {
    members,
    key: guest.familyId ? 'family:' + guest.familyId : 'guest:' + host,
    label: guest.familyId
      ? (people.families.find((f) => f.id === guest.familyId)?.name ?? guest.name)
      : (people.guests.find((g) => g.id === host)?.name ?? guest.name),
  };
}
export function validateAnswers(answers: RsvpAnswer[], expected: string[]) {
  if (
    answers.length !== expected.length ||
    new Set(answers.map((a) => a.guestId)).size !== expected.length ||
    answers.some(
      (a) =>
        !expected.includes(a.guestId) ||
        typeof a.attending !== 'boolean' ||
        typeof a.diet !== 'string' ||
        a.diet.length > 500,
    )
  )
    throw new Error('Responda por cada pessoa deste convite. Nenhuma resposta foi salva.');
}
export function validateInvitations(l: InvitationLedger) {
  const ids = new Set<string>();
  for (const row of [...l.designs, ...l.issues]) {
    if (row.weddingId !== l.weddingId || !row.id || ids.has(row.id))
      throw new Error('Convite inválido.');
    ids.add(row.id);
  }
  for (const d of l.designs) validateDesign(d);
  const tokens = new Set<string>();
  for (const i of l.issues) {
    if (
      !/^[a-f\d]{64}$/.test(i.token) ||
      tokens.has(i.token) ||
      i.design.weddingId !== l.weddingId ||
      !i.recipients.length
    )
      throw new Error('Destinatário ou link inválido.');
    if (i.recipientLabel.length > 100)
      throw new Error(
        'O nome da pessoa ou família precisa ter até 100 caracteres para caber no convite.',
      );
    tokens.add(i.token);
    validateDesign(i.design);
  }
}
export function mapsUrl(address: string, app: 'google' | 'waze' = 'google') {
  return app === 'google'
    ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address)
    : 'https://waze.com/ul?q=' + encodeURIComponent(address) + '&navigate=yes';
}
export function renderMessage(template: string, g: Guest, d: InvitationDesign) {
  const values: Record<string, string> = {
    nome: g.name,
    noivos: `${d.bride} e ${d.groom}`,
    data: formatCalendarDate(d.date),
    hora: d.time || 'horário a definir',
    local: d.venue || 'local a definir',
    endereco: d.address || 'endereço a definir',
    mapa: d.address ? mapsUrl(d.address) : 'Endereço a definir',
    link: 'A confirmação por link está disponível somente para teste local.',
  };
  return template.replace(
    /\{(nome|noivos|data|hora|local|endereco|mapa|link)\}/g,
    (_, key: string) => values[key],
  );
}
export function whatsappUrl(phone: string, message: string) {
  if (!phone || !validPhone(phone))
    throw new Error(
      'Cadastre um WhatsApp ou telefone válido com código da cidade para esta pessoa.',
    );
  return 'https://wa.me/55' + phoneDigits(phone) + '?text=' + encodeURIComponent(message);
}
