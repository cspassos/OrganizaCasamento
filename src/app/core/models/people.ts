import { WeddingEntity } from './models';

export const guestStatuses = [
  'Ainda não convidado',
  'Convite preparado',
  'Convite enviado',
  'Aguardando confirmação',
  'Confirmado',
  'Não comparecerá',
] as const;
export type GuestStatus = (typeof guestStatuses)[number];
export const sides = ['Ambos', 'Noiva', 'Noivo'] as const;
export interface Guest extends WeddingEntity {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  familyId: string;
  group: string;
  relationship: string;
  side: string;
  child: boolean;
  age: number | null;
  companionOf: string;
  diet: string;
  accessibility: string;
  table: string;
  invitationSent: boolean;
  sentDate: string;
  status: GuestStatus;
  notes: string;
}
export interface Family extends WeddingEntity {
  name: string;
  notes: string;
}
export interface Godparent extends WeddingEntity {
  guestId: string;
  partnerId: string;
  participation: string;
  attireColor: string;
  attireModel: string;
  size: string;
  arrival: string;
  responsibilities: string;
  gift: string;
  position: string;
  entryOrder: number;
  notes: string;
}
export interface PeopleLedger extends WeddingEntity {
  schemaVersion: 1;
  guests: Guest[];
  families: Family[];
  godparents: Godparent[];
}
