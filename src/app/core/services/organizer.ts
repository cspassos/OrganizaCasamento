import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { OrganizerItem, Wedding } from '../models/models';
import { WeddingsService } from './weddings';
import { FinanceService } from './finance';
import { AppRepository } from '../repositories/app.repository';
import { cloudBackend, cloudEnabled } from '../repositories/cloud-backend';
import { calendarDaysUntil, isCalendarDate } from '../utils/wedding';
import { localToday } from '../utils/finance';

export function validateOrganizer(items: OrganizerItem[]) {
  if (!Array.isArray(items) || items.length > 1000)
    throw new Error('Limite de 1.000 anotações e lembretes por casamento.');
  const ids = new Set<string>();
  for (const item of items) {
    if (
      !item.id ||
      ids.has(item.id) ||
      !['note', 'reminder'].includes(item.kind) ||
      !item.title.trim() ||
      item.title.length > 120 ||
      item.text.length > 5000 ||
      (item.kind === 'reminder' && !isCalendarDate(item.date)) ||
      (item.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))
    )
      throw new Error('Confira o título, a data e o horário do lembrete.');
    ids.add(item.id);
  }
}

@Injectable({ providedIn: 'root' })
export class OrganizerService {
  weddings = inject(WeddingsService);
  finance = inject(FinanceService);
  busy = signal(false);
  now = signal(new Date());
  items = computed(() => this.weddings.active()?.organizer ?? []);
  pending = computed(() =>
    this.items()
      .filter((i) => i.kind === 'reminder' && !i.completed)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
  );
  upcoming = computed(() => this.pending().filter((i) => this.days(i.date) <= 7));
  bills = computed(() =>
    (this.finance.summary()?.bills ?? [])
      .filter((b) => b.open > 0 && this.days(b.dueDate) <= 7)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  );
  alertCount = computed(() => this.upcoming().length + this.bills().length);
  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  days(date: string) {
    return calendarDaysUntil(date, this.now()) ?? 99999;
  }
  label(date: string) {
    const days = this.days(date);
    return days < 0 ? 'Atrasado' : days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`;
  }
  overdue(item: OrganizerItem) {
    return (
      item.date < localToday(this.now()) ||
      (item.date === localToday(this.now()) &&
        !!item.time &&
        item.time <
          `${String(this.now().getHours()).padStart(2, '0')}:${String(this.now().getMinutes()).padStart(2, '0')}`)
    );
  }
  expenseName(id: string) {
    return this.finance.ledger()?.expenses.find((e) => e.id === id)?.description ?? 'Conta';
  }
  private async change(weddingId: string, transform: (items: OrganizerItem[]) => OrganizerItem[]) {
    if (this.busy()) throw new Error('Aguarde o salvamento.');
    if (this.weddings.active()?.id !== weddingId)
      throw new Error('O casamento mudou. Abra o cadastro novamente.');
    this.busy.set(true);
    try {
      const changeWedding = (w: Wedding | undefined): Wedding => {
        if (!w || w.archived) throw new Error('Escolha um casamento ativo.');
        const organizer = transform(structuredClone(w.organizer ?? []));
        validateOrganizer(organizer);
        return { ...w, organizer, updatedAt: new Date().toISOString() };
      };
      if (cloudEnabled)
        await cloudBackend.transact(
          weddingId,
          (workspace) => {
            workspace.wedding = changeWedding(workspace.wedding);
          },
          true,
        );
      else await new AppRepository<Wedding>('weddings').update(weddingId, changeWedding);
      await this.weddings.refresh();
    } finally {
      this.busy.set(false);
    }
  }
  save(weddingId: string, item: OrganizerItem) {
    return this.change(weddingId, (items) => [
      ...items.filter((i) => i.id !== item.id),
      {
        ...item,
        title: item.title.trim(),
        text: item.text.trim(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }
  toggle(item: OrganizerItem) {
    const id = this.weddings.active()?.id;
    if (!id) return Promise.reject(new Error('Escolha um casamento.'));
    return this.change(id, (items) =>
      items.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i)),
    );
  }
  remove(item: OrganizerItem) {
    const id = this.weddings.active()?.id;
    if (!id) return Promise.reject(new Error('Escolha um casamento.'));
    return this.change(id, (items) => items.filter((i) => i.id !== item.id));
  }
}
