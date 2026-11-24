import { PlanningDetails, PlanningVersion, Wedding } from '../models/models';

export const planningFields = {
  name: 'Nome do casamento',
  brideName: 'Noiva',
  groomName: 'Noivo',
  date: 'Data do casamento',
  ceremonyTime: 'Horário da cerimônia',
  receptionTime: 'Horário da recepção',
  ceremonyType: 'Tipo de cerimônia',
  style: 'Estilo',
  theme: 'Tema',
  colors: 'Cores',
  colorPalette: 'Paleta de cores',
  ceremonyDescription: 'Descrição da cerimônia',
  initialBudget: 'Orçamento inicial',
  estimatedGuests: 'Convidados estimados',
  capacity: 'Capacidade',
  city: 'Cidade',
  state: 'Estado',
  ceremonyVenue: 'Local da cerimônia',
  ceremonyAddress: 'Endereço da cerimônia',
  receptionVenue: 'Local da recepção',
  receptionAddress: 'Endereço da recepção',
  notes: 'Observações',
} satisfies Record<keyof PlanningDetails, string>;

export const planningKeys = Object.keys(planningFields) as (keyof PlanningDetails)[];

export function planningVersion(wedding: Wedding): PlanningVersion {
  return {
    savedAt: wedding.planningSavedAt ?? wedding.updatedAt ?? wedding.createdAt,
    details: Object.fromEntries(
      planningKeys.map((key) => [key, wedding[key]]),
    ) as unknown as PlanningDetails,
  };
}

export function savePlanning(wedding: Wedding, now: string, previous?: Wedding): Wedding {
  const current = planningVersion(wedding);
  const prior = previous && planningVersion(previous);
  const normalize = (value: PlanningDetails[keyof PlanningDetails]) =>
    Array.isArray(value) ? JSON.stringify(value.length ? value : '') : JSON.stringify(value ?? '');
  const changed =
    prior &&
    planningKeys.some((key) => normalize(prior.details[key]) !== normalize(current.details[key]));
  return {
    ...wedding,
    planningSavedAt: changed || !prior ? now : prior.savedAt,
    planningHistory: changed
      ? [prior, ...(previous?.planningHistory ?? [])]
      : previous?.planningHistory,
  };
}
