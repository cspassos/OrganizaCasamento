import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  InvitationDesign,
  InvitationLedger,
  IssuedInvitation,
  RsvpAnswer,
  WhatsappQueue,
} from '../models/invitations';
import { PeopleLedger } from '../models/people';
import { Wedding } from '../models/models';
import { INVITATIONS_REPOSITORY } from '../repositories/invitations.repository';
import { IndexedDbRepository } from '../repositories/indexed-db.repository';
import {
  emptyInvitations,
  invitationToken,
  recipientGroup,
  validateAnswers,
} from '../utils/invitations';
import { localToday } from '../utils/finance';
import { WeddingsService } from './weddings';
import { PeopleService } from './people';
import {
  cloudEnabled,
  publicInvitation,
  respondPublicInvitation,
} from '../repositories/cloud-backend';
@Injectable({ providedIn: 'root' })
export class InvitationsService {
  weddings = inject(WeddingsService);
  people = inject(PeopleService);
  private repository = inject(INVITATIONS_REPOSITORY);
  private records = signal<InvitationLedger[]>([]);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  ledger = computed(() => {
    const id = this.weddings.active()?.id;
    return id ? (this.records().find((l) => l.id === id) ?? emptyInvitations(id)) : null;
  });
  private revision = 0;
  initialized = this.refresh();
  private channel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('organiza-casamento-invitations')
      : null;
  constructor() {
    const reload = () => {
      if (!this.loading()) void this.refresh(false);
    };
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
  async refresh(show = true) {
    const revision = ++this.revision;
    if (show) this.loading.set(true);
    try {
      const records = await this.repository.list();
      if (revision === this.revision) {
        this.records.set(records);
        this.error.set('');
      }
    } catch {
      this.error.set('Não foi possível carregar os convites. Tente atualizar a página.');
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }
  private async mutate(
    weddingId: string,
    action: (l: InvitationLedger, p: PeopleLedger) => void,
    localResponse = false,
  ) {
    await this.initialized;
    if (!localResponse && this.weddings.active()?.id !== weddingId)
      throw new Error('O casamento mudou. Abra o cadastro novamente.');
    if (this.busy()) throw new Error('Aguarde a operação em andamento.');
    this.busy.set(true);
    try {
      const l = await this.repository.update(weddingId, action);
      this.revision++;
      this.records.update((rows) => [...rows.filter((r) => r.id !== weddingId), l]);
      this.loading.set(false);
      await this.people.refresh(false);
      try {
        this.channel?.postMessage(weddingId);
        const channel = new BroadcastChannel('organiza-casamento-people');
        channel.postMessage(weddingId);
        channel.close();
      } catch {
        /* Stored data remains available through refresh. */
      }
    } finally {
      this.busy.set(false);
    }
  }
  saveDesign(design: InvitationDesign) {
    return this.mutate(design.weddingId, (l) => {
      l.designs = [...l.designs.filter((d) => d.id !== design.id), structuredClone(design)];
    });
  }
  deleteDesign(id: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      if (l.issues.some((i) => i.designId === id && i.active))
        throw new Error('Desative os convites emitidos com este modelo antes de excluí-lo.');
      l.designs = l.designs.filter((d) => d.id !== id);
    });
  }
  async issue(designId: string, guestId: string, weddingId: string) {
    let issued!: IssuedInvitation;
    await this.mutate(weddingId, (l, p) => {
      const design = l.designs.find((d) => d.id === designId);
      if (!design) throw new Error('Salve o modelo antes de criar o convite.');
      const group = recipientGroup(p, guestId);
      if (l.issues.some((i) => i.unitKey === group.key && i.active))
        throw new Error(
          'Esta pessoa ou família já tem um convite ativo. Consulte Convites enviados ou desative o anterior para criar outro.',
        );
      issued = {
        id: crypto.randomUUID(),
        weddingId,
        designId,
        design: structuredClone(design),
        token: invitationToken(),
        active: true,
        recipientLabel: group.label,
        unitKey: group.key,
        recipients: group.members.map((g) => ({ guestId: g.id, name: g.name })),
        createdAt: new Date().toISOString(),
        responses: [],
      };
      l.issues.push(issued);
      for (const g of group.members)
        if (g.status === 'Ainda não convidado') g.status = 'Convite preparado';
    });
    return issued;
  }
  markSent(id: string, weddingId: string) {
    return this.mutate(weddingId, (l, p) => {
      const i = l.issues.find((i) => i.id === id);
      if (!i?.active) throw new Error('Convite não encontrado ou desativado.');
      i.sentAt = new Date().toISOString();
      for (const r of i.recipients) {
        const g = p.guests.find((g) => g.id === r.guestId);
        if (g) {
          g.invitationSent = true;
          g.sentDate = localToday();
          if (!['Confirmado', 'Não comparecerá'].includes(g.status))
            g.status = 'Aguardando confirmação';
        }
      }
    });
  }
  async issueMany(designId: string, guestIds: string[], weddingId: string) {
    const result = { created: 0, existing: 0 };
    await this.mutate(weddingId, (l, p) => {
      const design = l.designs.find((d) => d.id === designId);
      if (!design) throw new Error('Escolha um modelo salvo.');
      const groups = new Map(
        guestIds.map((id) => {
          const g = recipientGroup(p, id);
          return [g.key, g] as const;
        }),
      );
      if (!groups.size) throw new Error('Selecione ao menos uma pessoa.');
      for (const group of groups.values()) {
        if (l.issues.some((i) => i.active && i.unitKey === group.key)) {
          result.existing++;
          continue;
        }
        l.issues.push({
          id: crypto.randomUUID(),
          weddingId,
          designId,
          design,
          token: invitationToken(),
          active: true,
          recipientLabel: group.label,
          unitKey: group.key,
          recipients: group.members.map((g) => ({ guestId: g.id, name: g.name })),
          createdAt: new Date().toISOString(),
          responses: [],
        });
        for (const g of group.members)
          if (g.status === 'Ainda não convidado') g.status = 'Convite preparado';
        result.created++;
      }
    });
    return result;
  }
  bulkIssues(ids: string[], action: 'sent' | 'revoke', weddingId: string) {
    return this.mutate(weddingId, (l, p) => {
      const selected = new Set(ids),
        issues = l.issues.filter((i) => selected.has(i.id));
      if (!issues.length || issues.length !== selected.size)
        throw new Error('A lista mudou. Confira a seleção novamente.');
      for (const i of issues) {
        if (action === 'revoke') {
          i.active = false;
          continue;
        }
        if (!i.active)
          throw new Error(
            'Há convites desativados na seleção. Selecione apenas convites ativos para registrar envio.',
          );
        i.sentAt ||= new Date().toISOString();
        for (const r of i.recipients) {
          const g = p.guests.find((g) => g.id === r.guestId);
          if (g) {
            g.invitationSent = true;
            g.sentDate ||= localToday();
            if (!['Confirmado', 'Não comparecerá'].includes(g.status))
              g.status = 'Aguardando confirmação';
          }
        }
      }
    });
  }
  saveWhatsappQueue(queue: WhatsappQueue, weddingId: string) {
    return this.mutate(weddingId, (l, p) => {
      if (l.whatsappQueue?.entries.some((e) => e.state === 'pending'))
        throw new Error('Conclua ou encerre a fila atual antes de preparar outra.');
      if (
        queue.design.weddingId !== weddingId ||
        queue.entries.some(
          (e) =>
            !p.guests.some((g) => g.id === e.guestId) ||
            e.recipientIds.some((id) => !p.guests.some((g) => g.id === id)),
        )
      )
        throw new Error('A lista de convidados mudou. Prepare a fila novamente.');
      l.whatsappQueue = structuredClone(queue);
    });
  }
  updateWhatsappEntry(
    queueId: string,
    entryId: string,
    state: 'sent' | 'skipped',
    weddingId: string,
  ) {
    return this.mutate(weddingId, (l, p) => {
      const q = l.whatsappQueue,
        e = q?.entries.find((e) => e.id === entryId);
      if (!q || q.id !== queueId || !e || e.state !== 'pending')
        throw new Error('Esta fila mudou. Confira o andamento antes de continuar.');
      if (state === 'sent' && q.action === 'invite') {
        for (const id of e.recipientIds) {
          const g = p.guests.find((g) => g.id === id);
          if (!g)
            throw new Error('Uma pessoa foi removida. Pule este envio e prepare uma nova fila.');
          g.invitationSent = true;
          g.sentDate ||= localToday();
          if (!['Confirmado', 'Não comparecerá'].includes(g.status))
            g.status = 'Aguardando confirmação';
        }
        for (const i of l.issues)
          if (
            i.active &&
            i.recipients.some((r) => e.recipientIds.includes(r.guestId)) &&
            i.recipients.every((r) => p.guests.find((g) => g.id === r.guestId)?.invitationSent)
          )
            i.sentAt ||= new Date().toISOString();
      }
      e.state = state;
    });
  }
  closeWhatsappQueue(weddingId: string) {
    return this.mutate(weddingId, (l) => {
      if (l.whatsappQueue)
        for (const e of l.whatsappQueue.entries) if (e.state === 'pending') e.state = 'skipped';
    });
  }
  revoke(id: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      const i = l.issues.find((i) => i.id === id);
      if (i) i.active = false;
    });
  }
  saveMessage(action: string, text: string, weddingId: string) {
    return this.mutate(weddingId, (l) => {
      if (!text.trim() || text.length > 2500)
        throw new Error('Escreva uma mensagem com até 2.500 caracteres.');
      l.messages[action] = text;
    });
  }
  async localView(token: string) {
    if (cloudEnabled) return publicInvitation(token);
    if (!/^[a-f\d]{64}$/.test(token)) throw new Error('Convite não encontrado neste navegador.');
    const ledgers = await this.repository.list(),
      ledger = ledgers.find((l) => l.issues.some((i) => i.token === token)),
      issue = ledger?.issues.find((i) => i.token === token);
    if (!issue?.active)
      throw new Error(
        'Convite não encontrado ou desativado. O link de teste só funciona no navegador onde foi criado.',
      );
    const [people, weddings] = await Promise.all([
      new IndexedDbRepository<PeopleLedger>('people').list(),
      new IndexedDbRepository<Wedding>('weddings').list(),
    ]);
    const wedding = weddings.find((w) => w.id === issue.weddingId);
    if (!wedding || wedding.archived) throw new Error('Este casamento não está disponível.');
    const members = (people.find((p) => p.id === issue.weddingId)?.guests ?? [])
      .filter((g) => issue.recipients.some((r) => r.guestId === g.id))
      .map((g) => ({ id: g.id, name: g.name, status: g.status, diet: g.diet }));
    if (!members.length)
      throw new Error('Os destinatários deste convite não estão mais cadastrados.');
    return { issue, members };
  }
  async respond(token: string, answers: RsvpAnswer[]) {
    if (cloudEnabled) {
      await respondPublicInvitation(token, answers);
      return;
    }
    const view = await this.localView(token);
    await this.mutate(
      view.issue.weddingId,
      (l, p) => {
        const issue = l.issues.find((i) => i.token === token);
        if (!issue?.active) throw new Error('Este convite foi desativado.');
        const members = p.guests.filter((g) => issue.recipients.some((r) => r.guestId === g.id));
        validateAnswers(
          answers,
          members.map((g) => g.id),
        );
        for (const a of answers) {
          const g = members.find((g) => g.id === a.guestId)!;
          g.status = a.attending ? 'Confirmado' : 'Não comparecerá';
          g.diet = a.diet.trim();
        }
        const previous = issue.responses.at(-1)?.answers;
        if (JSON.stringify(previous) !== JSON.stringify(answers))
          issue.responses.push({ at: new Date().toISOString(), answers: structuredClone(answers) });
      },
      true,
    );
  }
}
