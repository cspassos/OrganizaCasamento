import { cloudEnabled } from '../../core/repositories/cloud-backend';
import { PreferencesService } from '../../core/services/preferences';
import { MatMenuModule } from '@angular/material/menu';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { InvitationsService } from '../../core/services/invitations';
import {
  InvitationDesign,
  IssuedInvitation,
  invitationStyles,
  messageActions,
} from '../../core/models/invitations';
import { newDesign, renderMessage, whatsappUrl } from '../../core/utils/invitations';
import { validPhone } from '../../core/utils/contact';
import { formatCalendarDate } from '../../core/utils/wedding';
import { InvitationPreview } from '../../shared/components/invitation-preview';
import { GuestPicker } from '../../shared/components/guest-picker';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { NoticeDialog } from '../../shared/components/notice-dialog';
import { IssueDialog } from './issue-dialog';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { BatchIssueDialog } from './batch-issue-dialog';
import { BatchExportDialog } from './batch-export-dialog';
import { WhatsappBatch } from './whatsapp-batch';
import { ListPager } from '../../shared/components/list-pager';
import {
  downloadInvitationFile,
  invitationPdf,
  invitationPng,
  invitationQr,
} from '../../core/utils/invitation-export';
@Component({
  selector: 'oc-invitations-page',
  imports: [
    MatMenuModule,
    FormsModule,
    RouterLink,
    InvitationPreview,
    GuestPicker,
    CollectionTable,
    WhatsappBatch,
    ListPager,
  ],
  templateUrl: './invitations-page.html',
})
export class InvitationsPage {
  cloud = cloudEnabled;
  store = inject(InvitationsService);
  private dialogs = inject(MatDialog);
  params = toSignal(inject(ActivatedRoute).paramMap);
  section = computed(() => this.params()?.get('section') ?? 'modelos');
  title = computed(
    () =>
      (
        ({
          modelos: 'Modelos de convites',
          enviados: 'Convites enviados',
          whatsapp: 'WhatsApp',
          confirmacoes: 'Confirmação de presença',
        }) as Record<string, string>
      )[this.section()] ?? 'Convites',
  );
  query = signal('');
  filter = signal('');
  deliverySummary = computed(() => {
    const issues = this.store.ledger()?.issues ?? [];
    return {
      total: issues.length,
      sent: issues.filter((i) => !!i.sentAt).length,
      pending: issues.filter((i) => i.active && !i.sentAt).length,
    };
  });
  page = signal(1);
  private preferences = inject(PreferencesService);
  view = this.preferences.invitationsView;
  pageSize = signal(25);
  setView(view: string) {
    this.preferences.setCollectionView('invitations', view);
  }
  savedCards = computed(() => {
    const rows = this.designs().filter((d) =>
      searchText(d.title).includes(searchText(this.query())),
    );
    const page = Math.min(this.page(), Math.max(1, Math.ceil(rows.length / this.pageSize())));
    return rows.slice((page - 1) * this.pageSize(), page * this.pageSize());
  });
  selected = signal(new Set<string>());
  toSet = (ids: string[]) => new Set(ids);
  issueRows = computed(() =>
    this.issues().map((i) => ({
      id: i.id,
      record: i,
      cells: [
        i.recipientLabel,
        i.design.title,
        String(i.recipients.length),
        !i.active
          ? 'Desativado'
          : i.responses.length
            ? 'Resposta registrada'
            : i.sentAt
              ? 'Envio registrado'
              : 'Preparado',
        this.date(i.createdAt),
        this.date(i.sentAt),
      ],
    })),
  );
  guestRows = computed(() =>
    this.guests().map((g) => ({
      id: g.id,
      record: g,
      cells: [
        g.name,
        this.family(g.familyId),
        g.status,
        g.whatsapp || g.phone,
        g.invitationSent ? 'Sim' : 'Não',
      ],
    })),
  );
  savedRows = computed(() =>
    this.designs()
      .filter((d) => searchText(d.title).includes(searchText(this.query())))
      .map((d) => ({ id: d.id, record: d, cells: [d.title, d.style, this.date(d.date), d.venue] })),
  );
  error = signal('');
  message = signal('');
  working = signal(false);
  qr = signal<{ id: string; src: string } | null>(null);
  copiedLink = signal('');
  actions = messageActions;
  action = signal('invite');
  personId = signal('');
  designId = signal('');
  messageTemplate = signal<string | null>(null);
  shareFormat = signal<'png' | 'pdf'>('png');
  preparedFile = signal<{ key: string; file: File } | null>(null);
  shareKey = computed(() =>
    JSON.stringify([
      this.messageDesign(),
      this.personId(),
      this.person()?.name,
      this.shareFormat(),
    ]),
  );
  prepared = computed(() =>
    this.preparedFile()?.key === this.shareKey() ? this.preparedFile()!.file : null,
  );
  canSharePrepared = computed(() => {
    const file = this.prepared();
    try {
      return (
        !!file && typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [file] })
      );
    } catch {
      return false;
    }
  });
  samples = computed(() => {
    const w = this.store.weddings.active();
    return w ? invitationStyles.map((style) => newDesign(w, style)) : [];
  });
  designs = computed(() => this.store.ledger()?.designs ?? []);
  issues = computed(() =>
    (this.store.ledger()?.issues ?? [])
      .filter(
        (i) =>
          searchText(
            i.recipientLabel +
              ' ' +
              i.design.title +
              ' ' +
              i.recipients.map((r) => r.name).join(' '),
          ).includes(searchText(this.query())) &&
          (!this.filter() ||
            (this.filter() === 'active'
              ? i.active
              : this.filter() === 'inactive'
                ? !i.active
                : this.filter() === 'sent'
                  ? !!i.sentAt
                  : i.responses.length > 0)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  guests = computed(() =>
    (this.store.people.ledger()?.guests ?? []).filter(
      (g) =>
        searchText(
          g.name + ' ' + this.family(g.familyId) + ' ' + g.phone + ' ' + g.whatsapp,
        ).includes(searchText(this.query())) &&
        (!this.filter() ||
          (this.filter() === 'confirmed'
            ? g.status === 'Confirmado'
            : this.filter() === 'declined'
              ? g.status === 'Não comparecerá'
              : !['Confirmado', 'Não comparecerá'].includes(g.status))),
    ),
  );
  rows = computed(() =>
    this.section() === 'confirmacoes' ? this.guests().length : this.issues().length,
  );
  pages = computed(() => Math.max(1, Math.ceil(this.rows() / this.pageSize())));
  visibleIssues = computed(() =>
    this.issues().slice(
      (Math.min(this.page(), this.pages()) - 1) * this.pageSize(),
      Math.min(this.page(), this.pages()) * this.pageSize(),
    ),
  );
  visibleGuests = computed(() =>
    this.guests().slice(
      (Math.min(this.page(), this.pages()) - 1) * this.pageSize(),
      Math.min(this.page(), this.pages()) * this.pageSize(),
    ),
  );
  person = computed(() => this.store.people.ledger()?.guests.find((g) => g.id === this.personId()));
  messageDesign = computed(
    () =>
      this.designs().find((d) => d.id === this.designId()) ??
      this.designs()[0] ??
      (this.store.weddings.active() ? newDesign(this.store.weddings.active()!) : null),
  );
  defaultText = computed(
    () =>
      this.store.ledger()?.messages[this.action()] ??
      messageActions.find((a) => a.id === this.action())?.text ??
      '',
  );
  text = computed(() => this.messageTemplate() ?? this.defaultText());
  renderedMessage = computed(() => {
    const g = this.person(),
      d = this.messageDesign();
    return g && d ? renderMessage(this.text(), g, d) : '';
  });
  whatsappLink = computed(() => {
    const g = this.person();
    if (!g) return '';
    try {
      return whatsappUrl(g.whatsapp || g.phone, this.renderedMessage());
    } catch {
      return '';
    }
  });
  constructor() {
    effect(() => {
      this.section();
      this.store.weddings.active()?.id;
      this.query.set('');
      this.filter.set('');
      this.page.set(1);
      this.selected.set(new Set());
      this.error.set('');
      this.message.set('');
      this.personId.set('');
      this.designId.set('');
      this.messageTemplate.set(null);
      this.qr.set(null);
      this.copiedLink.set('');
    });
  }
  url(i: IssuedInvitation) {
    return location.origin + '/convite/' + i.token;
  }
  date(value: string | undefined) {
    if (!value) return 'Ainda não enviado';
    return value.includes('T')
      ? new Date(value).toLocaleDateString('pt-BR')
      : formatCalendarDate(value);
  }
  family(id: string) {
    return this.store.people.ledger()?.families.find((f) => f.id === id)?.name ?? 'Individual';
  }
  guestName(id: string) {
    return (
      this.store.people.ledger()?.guests.find((g) => g.id === id)?.name ?? 'Convidado removido'
    );
  }
  guestStatus(id: string) {
    return (
      this.store.people.ledger()?.guests.find((g) => g.id === id)?.status ?? 'Cadastro removido'
    );
  }
  async run(action: () => Promise<unknown>, success: string) {
    this.error.set('');
    this.message.set('');
    this.working.set(true);
    try {
      await action();
      this.message.set(success);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível concluir.');
      this.dialogs.open(NoticeDialog, {
        width: '520px',
        maxWidth: '94vw',
        role: 'alertdialog',
        data: { title: 'Não foi possível concluir', message: this.error() },
      });
    } finally {
      this.working.set(false);
    }
  }
  async issue(designId?: string) {
    const result = await firstValueFrom(
      this.dialogs
        .open(IssueDialog, { width: '700px', maxWidth: '96vw', data: { designId } })
        .afterClosed(),
    );
    if (result)
      this.message.set(
        'Convite preparado. Consulte Convites enviados para testar a confirmação ou baixar a cópia personalizada.',
      );
  }
  async issueBatch(designId?: string) {
    const result = await firstValueFrom(
      this.dialogs
        .open(BatchIssueDialog, { width: '1100px', maxWidth: '96vw', data: { designId } })
        .afterClosed(),
    );
    if (result)
      this.message.set(
        `${result.created} convites criados. ${result.existing} convites ativos já existentes foram mantidos. Nenhum envio foi feito automaticamente.`,
      );
  }
  async bulk(action: 'sent' | 'revoke') {
    const ids = [...this.selected()],
      weddingId = this.store.weddings.active()!.id;
    if (!ids.length) return;
    if (
      await this.confirm(
        action === 'sent' ? 'Registrar envios selecionados?' : 'Desativar convites selecionados?',
        `${ids.length} convites serão alterados, inclusive em outras páginas e fora do filtro atual. ${action === 'sent' ? 'Confirme somente se você já enviou todos esses convites.' : 'Os links de teste deixarão de aceitar respostas; os dados serão preservados.'}`,
      )
    )
      await this.run(async () => {
        await this.store.bulkIssues(ids, action, weddingId);
        this.selected.set(new Set());
      }, `${ids.length} convites atualizados.`);
  }
  exportBatch(format: 'png' | 'pdf') {
    const items = (this.store.ledger()?.issues ?? [])
      .filter((i) => this.selected().has(i.id))
      .map((i) => ({ design: structuredClone(i.design), label: i.recipientLabel }));
    if (items.length)
      this.dialogs.open(BatchExportDialog, {
        width: '600px',
        maxWidth: '96vw',
        data: { items, format },
      });
  }
  issueDetails(i: IssuedInvitation) {
    this.dialogs.open(NoticeDialog, {
      width: '600px',
      maxWidth: '96vw',
      data: {
        title: i.recipientLabel,
        message: `${i.design.title}\n${i.recipients.map((r) => r.name + ' — ' + this.guestStatus(r.guestId)).join('\n')}\n\n${i.responses.length} resposta(s) registrada(s).\n${i.responses.map((r) => this.date(r.at) + ': ' + r.answers.map((a) => this.guestName(a.guestId) + ' — ' + (a.attending ? 'Confirmou' : 'Não comparecerá')).join('; ')).join('\n')}`,
      },
    });
  }
  async removeDesign(d: InvitationDesign) {
    if (
      await this.confirm(
        'Excluir modelo?',
        `Excluir ${d.title}? Convites ativos precisam ser desativados antes.`,
      )
    )
      await this.run(() => this.store.deleteDesign(d.id, d.weddingId), 'Modelo excluído.');
  }
  async duplicate(d: InvitationDesign) {
    await this.run(
      () =>
        this.store.saveDesign({
          ...d,
          id: crypto.randomUUID(),
          title: d.title.slice(0, 90) + ' — cópia',
        }),
      'Cópia criada.',
    );
  }
  async markSent(i: IssuedInvitation) {
    if (
      await this.confirm(
        'Registrar envio?',
        `Marque somente se você já enviou este convite. Abrir o WhatsApp ou baixar o arquivo não envia automaticamente. A data será registrada como hoje.`,
      )
    )
      await this.run(
        () => this.store.markSent(i.id, i.weddingId),
        'Envio registrado nos convidados deste convite.',
      );
  }
  async revoke(i: IssuedInvitation) {
    if (
      await this.confirm(
        'Desativar link de teste?',
        `O link de ${i.recipientLabel} deixará de aceitar respostas. As respostas já salvas serão mantidas.`,
      )
    )
      await this.run(() => this.store.revoke(i.id, i.weddingId), 'Link desativado.');
  }
  confirm(title: string, message: string) {
    return firstValueFrom(
      this.dialogs.open(ConfirmDialog, { data: { title, message } }).afterClosed(),
    );
  }
  async export(d: InvitationDesign, format: 'png' | 'pdf', recipient = '') {
    await this.run(
      async () =>
        downloadInvitationFile(
          format === 'png' ? await invitationPng(d, recipient) : await invitationPdf(d, recipient),
          'convite.' + format,
        ),
      'Arquivo preparado para download.',
    );
  }
  async copyLink(i: IssuedInvitation) {
    this.copiedLink.set(this.url(i));
    await this.run(
      () => navigator.clipboard.writeText(this.url(i)),
      this.cloud
        ? 'Link copiado. Compartilhe quando o site estiver publicado.'
        : 'Link de teste copiado. Ele funciona apenas neste navegador e endereço.',
    );
  }
  async showQr(i: IssuedInvitation) {
    await this.run(
      async () => this.qr.set({ id: i.id, src: await invitationQr(this.url(i)) }),
      this.cloud
        ? 'QR Code pronto. O endereço deve estar acessível na internet.'
        : 'QR de teste pronto. Não use como link público para convidados.',
    );
  }
  async downloadQr() {
    const q = this.qr();
    if (q) downloadInvitationFile(await (await fetch(q.src)).blob(), 'qr-convite-teste.png');
  }
  async saveMessage() {
    const id = this.store.weddings.active()!.id;
    await this.run(
      () => this.store.saveMessage(this.action(), this.text(), id),
      'Mensagem salva para esta ação.',
    );
  }
  async copyMessage() {
    await this.run(
      () => navigator.clipboard.writeText(this.renderedMessage()),
      'Mensagem copiada.',
    );
  }
  async prepareShare() {
    const design = this.messageDesign(),
      person = this.person();
    if (!design || !person || !this.designs().length) return;
    const key = this.shareKey(),
      format = this.shareFormat();
    await this.run(async () => {
      const blob =
        format === 'png'
          ? await invitationPng(design, person.name)
          : await invitationPdf(design, person.name);
      if (key !== this.shareKey())
        throw new Error('A pessoa ou o modelo mudou. Prepare o convite novamente.');
      this.preparedFile.set({
        key,
        file: new File([blob], 'convite.' + format, {
          type: format === 'png' ? 'image/png' : 'application/pdf',
        }),
      });
    }, 'Convite pronto. Compartilhe o arquivo ou baixe para anexar no WhatsApp.');
  }
  downloadPrepared() {
    const file = this.prepared();
    if (file) {
      downloadInvitationFile(file, file.name);
      this.message.set(
        'Convite baixado. Abra a conversa no WhatsApp e use o clipe de anexar para selecionar o arquivo.',
      );
    }
  }
  async sharePrepared() {
    const file = this.prepared();
    if (!file || !this.canSharePrepared()) return;
    this.error.set('');
    this.message.set('');
    this.working.set(true);
    try {
      await navigator.share({
        files: [file],
        title: this.messageDesign()!.title,
        text: this.renderedMessage(),
      });
      this.message.set(
        'Compartilhamento aberto. Escolha o WhatsApp e confirme o envio no aplicativo. O sistema não registrou envio automaticamente.',
      );
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError')
        this.message.set('Compartilhamento cancelado. Nenhum envio foi registrado.');
      else {
        this.error.set(
          'Não foi possível abrir o compartilhamento. Use Baixar convite para anexar e envie o arquivo pela conversa do WhatsApp.',
        );
        this.dialogs.open(NoticeDialog, {
          width: '520px',
          maxWidth: '94vw',
          role: 'alertdialog',
          data: { title: 'Envie o arquivo pela conversa', message: this.error() },
        });
      }
    } finally {
      this.working.set(false);
    }
  }
}
