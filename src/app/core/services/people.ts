import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Family, Godparent, Guest, PeopleLedger } from '../models/people';
import { PEOPLE_REPOSITORY } from '../repositories/people.repository';
import { WeddingsService } from './weddings';
import { localToday } from '../utils/finance';
import {
  emptyPeople,
  importGuests,
  newGuest,
  peopleSummary,
  reviewGuestNames,
  validatePeople,
} from '../utils/people';
import { formatPhone, validEmail, validPhone } from '../utils/contact';

@Injectable({ providedIn: 'root' })
export class PeopleService {
  weddings = inject(WeddingsService);
  private repository = inject(PEOPLE_REPOSITORY);
  private records = signal<PeopleLedger[]>([]);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  ledger = computed(() => {
    const id = this.weddings.active()?.id;
    return id ? (this.records().find((l) => l.id === id) ?? emptyPeople(id)) : null;
  });
  summary = computed(() => peopleSummary(this.ledger() ?? emptyPeople('')));
  initialized: Promise<void>;
  private revision = 0;
  private channel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('organiza-casamento-people')
      : null;
  constructor() {
    this.initialized = this.refresh();
    const reload = () => void this.refresh(false);
    window.addEventListener('focus', reload);
    if (this.channel) this.channel.onmessage = reload;
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((e) => {
        if (e instanceof NavigationEnd) reload();
      });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('focus', reload);
      this.channel?.close();
    });
  }
  async refresh(showLoading = true) {
    const revision = ++this.revision;
    if (showLoading) this.loading.set(true);
    try {
      const records = await this.repository.list();
      if (revision === this.revision) {
        this.records.set(records);
        this.error.set('');
      }
    } catch {
      this.error.set('Não foi possível carregar as pessoas. Tente atualizar os dados.');
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }
  private async mutate(weddingId: string, action: (l: PeopleLedger) => void) {
    await this.initialized;
    if (this.weddings.active()?.id !== weddingId)
      throw new Error('O casamento selecionado mudou. Abra o formulário novamente.');
    if (this.busy()) throw new Error('Aguarde o salvamento em andamento.');
    this.busy.set(true);
    try {
      const result = await this.repository.update(weddingId, (value) => {
        const l = structuredClone(value ?? emptyPeople(weddingId));
        action(l);
        validatePeople(l);
        return l;
      });
      this.revision++;
      this.records.update((rows) => [...rows.filter((l) => l.id !== weddingId), result]);
      this.loading.set(false);
      this.error.set('');
      try {
        this.channel?.postMessage(weddingId);
      } catch {
        /* Data is already committed. */
      }
    } finally {
      this.busy.set(false);
    }
  }
  addNames(names: string[], weddingId: string, acceptedDuplicates = '', familyId = '') {
    return this.mutate(weddingId, (ledger) => {
      if (!names.length || names.length > 1000)
        throw new Error('Informe entre 1 e 1.000 nomes, um por linha.');
      if (names.some((name) => !name.trim() || name.trim().length > 180))
        throw new Error('Cada nome deve ter entre 1 e 180 caracteres.');
      if (familyId && !ledger.families.some((family) => family.id === familyId))
        throw new Error(
          'Esta família não está mais disponível. Escolha outra família ou deixe sem família. Nenhum convidado foi adicionado.',
        );
      const review = reviewGuestNames(names, ledger.guests);
      if (review.signature && review.signature !== acceptedDuplicates)
        throw new Error(
          'Encontramos nomes repetidos. Confira a lista e confirme somente se forem pessoas diferentes. Nenhum convidado foi adicionado.',
        );
      ledger.guests.push(
        ...names.map((name) => ({ ...newGuest(weddingId), name: name.trim(), familyId })),
      );
    });
  }
  saveGuest(g: Guest) {
    return this.mutate(g.weddingId, (l) => {
      if (!validPhone(g.phone) || !validPhone(g.whatsapp))
        throw new Error('Informe telefone e WhatsApp válidos com DDD.');
      if (!validEmail(g.email)) throw new Error('Informe um e-mail válido.');
      const guest = {
        ...g,
        name: g.name.trim(),
        email: g.email.trim(),
        phone: validPhone(g.phone) ? formatPhone(g.phone) : g.phone,
        whatsapp: validPhone(g.whatsapp) ? formatPhone(g.whatsapp) : g.whatsapp,
        age: g.child ? g.age : null,
        sentDate: g.invitationSent ? g.sentDate : '',
      };
      l.guests = [...l.guests.filter((x) => x.id !== g.id), guest];
      // Moving a principal guest also moves their companions, preserving the shared invitation.
      l.guests = l.guests.map((x) =>
        x.companionOf === g.id ? { ...x, familyId: guest.familyId } : x,
      );
    });
  }
  removeGuest(id: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      if (l.godparents.some((p) => p.guestId === id))
        throw new Error('Remova primeiro a participação na aba Participações especiais.');
      const companions = l.guests.filter((g) => g.companionOf === id);
      if (companions.length) {
        const name = l.guests.find((g) => g.id === id)?.name ?? 'esta pessoa';
        throw new Error(
          `Não é possível excluir ${name}, pois há acompanhantes vinculados: ${companions.map((g) => g.name).join(', ')}.\n\nEdite cada acompanhante e, no campo “Acompanhante de”, escolha “Não é acompanhante” ou outra pessoa. Salve e tente excluir novamente. Nenhum cadastro foi excluído.`,
        );
      }
      l.guests = l.guests.filter((g) => g.id !== id);
    });
  }
  saveFamily(f: Family) {
    return this.mutate(f.weddingId, (l) => {
      l.families = [...l.families.filter((x) => x.id !== f.id), { ...f, name: f.name.trim() }];
    });
  }
  removeGuestAndCompanions(id: string, weddingId: string, confirmedIds: string[]) {
    return this.mutate(weddingId, (l) => {
      const current = l.guests.filter((g) => g.id === id || g.companionOf === id);
      if (
        !current.some((g) => g.id === id) ||
        current
          .map((g) => g.id)
          .sort()
          .join(',') !== [...confirmedIds].sort().join(',')
      )
        throw new Error(
          'A lista de acompanhantes mudou. Confira os cadastros e tente excluir novamente. Nenhum cadastro foi excluído.',
        );
      const ids = new Set(confirmedIds);
      const linked = l.godparents.filter((p) => ids.has(p.guestId));
      if (linked.length)
        throw new Error(
          `Remova primeiro a participação na aba Participações especiais de: ${linked.map((p) => l.guests.find((g) => g.id === p.guestId)!.name).join(', ')}. Nenhum cadastro foi excluído.`,
        );
      l.guests = l.guests.filter((g) => !ids.has(g.id));
    });
  }
  removeFamily(id: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      if (l.guests.some((g) => g.familyId === id))
        throw new Error('Mova ou desvincule os integrantes antes de excluir a família.');
      l.families = l.families.filter((f) => f.id !== id);
    });
  }
  setStatuses(ids: string[], status: Guest['status'], weddingId: string) {
    return this.mutate(weddingId, (l) => {
      const selected = new Set(ids);
      if (l.guests.filter((g) => selected.has(g.id)).length !== selected.size)
        throw new Error('A lista de pessoas mudou. Confira a seleção novamente.');
      for (const g of l.guests) if (selected.has(g.id)) g.status = status;
    });
  }
  setStatus(id: string, status: Guest['status'], weddingId: string) {
    return this.mutate(weddingId, (l) => {
      const g = l.guests.find((g) => g.id === id);
      if (!g) throw new Error('Convidado não encontrado.');
      g.status = status;
    });
  }
  setInvitationSent(id: string, sent: boolean, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      const guest = l.guests.find((g) => g.id === id);
      if (!guest) throw new Error('Convidado não encontrado.');
      guest.invitationSent = sent;
      guest.sentDate = sent ? guest.sentDate || localToday() : '';
    });
  }
  saveGodparent(p: Godparent) {
    return this.mutate(p.weddingId, (l) => {
      for (const other of l.godparents) if (other.partnerId === p.id) other.partnerId = '';
      const partner = l.godparents.find((x) => x.id === p.partnerId);
      if (
        p.partnerId &&
        (!partner || partner.id === p.id || (partner.partnerId && partner.partnerId !== p.id))
      )
        throw new Error('Esse par já está vinculado ou não está disponível.');
      if (partner) partner.partnerId = p.id;
      l.godparents = [...l.godparents.filter((x) => x.id !== p.id), { ...p }];
    });
  }
  removeGodparent(id: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      l.godparents = l.godparents
        .filter((p) => p.id !== id)
        .map((p) => (p.partnerId === id ? { ...p, partnerId: '' } : p));
    });
  }
  importCsv(text: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      const result = importGuests(text, l);
      Object.assign(l, result.ledger);
    });
  }
}
