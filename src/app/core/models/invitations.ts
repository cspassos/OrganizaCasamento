import { WeddingEntity } from './models';
export const invitationStyles = [
  'Clássico',
  'Elegante',
  'Minimalista',
  'Moderno',
  'Floral',
  'Rústico',
  'Romântico',
  'Personalizado',
] as const;
export type InvitationStyle = (typeof invitationStyles)[number];
export interface InvitationDesign extends WeddingEntity {
  title: string;
  style: InvitationStyle;
  font: 'serif' | 'italic' | 'sans';
  bride: string;
  groom: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  reception: string;
  receptionTime: string;
  message: string;
  footer: string;
  background: string;
  color: string;
  accent: string;
  photo: string;
}
export interface IssuedInvitation extends WeddingEntity {
  designId: string;
  design: InvitationDesign;
  token: string;
  active: boolean;
  recipientLabel: string;
  unitKey: string;
  recipients: { guestId: string; name: string }[];
  createdAt: string;
  sentAt?: string;
  responses: { at: string; answers: RsvpAnswer[] }[];
}
export interface RsvpAnswer {
  guestId: string;
  attending: boolean;
  diet: string;
}
export interface InvitationLedger extends WeddingEntity {
  schemaVersion: 1;
  designs: InvitationDesign[];
  issues: IssuedInvitation[];
  messages: Record<string, string>;
  whatsappQueue?: WhatsappQueue;
}
export interface WhatsappQueue {
  id: string;
  design: InvitationDesign;
  action: string;
  text: string;
  entries: {
    id: string;
    guestId: string;
    label: string;
    recipientIds: string[];
    state: 'pending' | 'sent' | 'skipped';
  }[];
}
export const messageActions = [
  {
    id: 'invite',
    label: 'Enviar convite',
    text: 'Olá, {nome}! {noivos} convidam você para celebrar nosso casamento em {data}, às {hora}, em {local}. Será uma alegria ter você com a gente!',
  },
  {
    id: 'reminder',
    label: 'Enviar lembrete',
    text: 'Olá, {nome}! Nosso casamento será em {data}, às {hora}, em {local}. Estamos esperando você! Com carinho, {noivos}.',
  },
  {
    id: 'rsvp',
    label: 'Solicitar confirmação',
    text: 'Olá, {nome}! Você poderá estar com a gente no casamento de {noivos}, em {data}? Por favor, responda nesta conversa para confirmarmos sua presença.',
  },
  {
    id: 'location',
    label: 'Compartilhar localização',
    text: 'Olá, {nome}! O casamento de {noivos} será em {local}, {endereco}. Localização: {mapa}',
  },
  {
    id: 'thanks',
    label: 'Enviar agradecimento',
    text: 'Olá, {nome}! Obrigado por fazer parte da nossa história. Com carinho, {noivos}.',
  },
] as const;
