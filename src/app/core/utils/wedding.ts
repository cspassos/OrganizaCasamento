import { Wedding } from '../models/models';

// A calendar date is not an instant. UTC arithmetic avoids daylight saving offsets.
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 2200) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function calendarDaysUntil(value: string, today = new Date()): number | null {
  if (!value || !isCalendarDate(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );
}

export function formatCalendarDate(value: string): string {
  if (!isCalendarDate(value)) return 'Data a definir';
  return value.split('-').reverse().join('/');
}

export function parseDisplayDate(value: string): string {
  if (/^\d{8}$/.test(value)) value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return '';
  const iso = value.split('/').reverse().join('-');
  return isCalendarDate(iso) ? iso : '';
}

export function validateWedding(w: Wedding): string | null {
  if (
    w.colorPalette &&
    (w.colorPalette.length > 8 || w.colorPalette.some((color) => !/^#[0-9a-f]{6}$/i.test(color)))
  )
    return 'Escolha até oito cores válidas para a paleta.';
  if (!w.name?.trim() || !w.brideName?.trim() || !w.groomName?.trim())
    return 'Preencha o nome do casamento e os nomes dos noivos.';
  if ([w.name, w.brideName, w.groomName].some((v) => v!.trim().length > 120))
    return 'Os nomes devem ter até 120 caracteres.';
  if (w.date && !isCalendarDate(w.date)) return 'Informe uma data válida entre 1900 e 2200.';
  for (const time of [w.ceremonyTime, w.receptionTime]) {
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      return 'Informe horários válidos no formato 24 horas.';
  }
  if (!Number.isFinite(w.initialBudget) || w.initialBudget! < 0 || w.initialBudget! > 999999999.99)
    return 'Informe um orçamento entre zero e R$ 999.999.999,99.';
  for (const value of [w.estimatedGuests, w.capacity]) {
    if (!Number.isSafeInteger(value) || value! < 0 || value! > 100000)
      return 'Informe quantidades inteiras entre zero e 100.000.';
  }
  if (w.capacity && w.estimatedGuests! > w.capacity)
    return 'A estimativa de convidados não pode ultrapassar a capacidade do local.';
  if (
    w.photo &&
    (!/^data:image\/(jpeg|png|webp);base64,/.test(w.photo) || w.photo.length > 2800000)
  )
    return 'A foto deve ser JPG, PNG ou WebP e ter até 2 MB.';
  return null;
}
