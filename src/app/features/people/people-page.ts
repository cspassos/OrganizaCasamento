import { MatMenuModule } from '@angular/material/menu';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { PeopleService } from '../../core/services/people';
import { Family, Godparent, Guest, guestStatuses, sides } from '../../core/models/people';
import { emptyPeople, guestsCsv, importGuests } from '../../core/utils/people';
import { formatCalendarDate } from '../../core/utils/wedding';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { NoticeDialog } from '../../shared/components/notice-dialog';
import { DeletePersonDialog } from '../../shared/components/delete-person-dialog';
import { Icon } from '../../shared/components/icon';
import { PersonDialog } from './person-dialog';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { ListPager } from '../../shared/components/list-pager';
import { QuickGuestsDialog } from './quick-guests-dialog';
import { PreferencesService } from '../../core/services/preferences';

@Component({
  selector: 'oc-people-page',
  imports: [MatMenuModule, FormsModule, RouterLink, Icon, CollectionTable, ListPager],
  templateUrl: './people-page.html',
})
export class PeoplePage {
  bulkMode = signal(false);
  toggleBulk() {
    this.bulkMode.update((v) => !v);
    if (!this.bulkMode()) this.selected.set(new Set());
    else this.setView('table');
  }
  store = inject(PeopleService);
  dialogs = inject(MatDialog);
  pdfBusy = signal(false);
  async printPdf() {
    const wedding = this.store.weddings.active();
    if (!wedding || this.pdfBusy()) return;
    const special = this.section() === 'padrinhos';
    const filters = special
      ? `Busca: ${this.query() || 'nenhuma'}. Participação: ${this.participation() || 'Todas'}.`
      : [
          this.query() ? `Busca: ${this.query()}` : '',
          this.participation() ? `Participação: ${this.participation()}` : '',
          this.family() ? `Família: ${this.familyName(this.family())}` : '',
          this.status() ? `Confirmação: ${this.status()}` : '',
          this.side() ? `Lado: ${this.side()}` : '',
          this.age() ? `Faixa etária: ${this.age() === 'child' ? 'Crianças' : 'Adultos'}` : '',
          this.sent() ? `Convite enviado: ${this.sent() === 'yes' ? 'Sim' : 'Não'}` : '',
        ]
          .filter(Boolean)
          .join(' | ') || 'Todos os convidados.';
    const rows = special
      ? this.godparents().map((p) => {
          const g = this.guest(p.guestId)!;
          return [g.name, p.participation, g.status, g.whatsapp || g.phone || 'Não informado'];
        })
      : this.filtered().map((g) => [
          g.name + (g.child ? ' (criança)' : ''),
          g.familyId ? this.familyName(g.familyId) : 'Individual',
          g.status,
          g.whatsapp || g.phone || 'Não informado',
        ]);
    this.pdfBusy.set(true);
    this.error.set('');
    try {
      const { peopleListPdf } = await import('../../core/utils/people-pdf');
      const blob = await peopleListPdf({
        title: special ? 'Participações especiais' : 'Lista de convidados',
        wedding: wedding.name,
        filters,
        columns: ['Nome', special ? 'Participação' : 'Família', 'Confirmação', 'Contato'],
        rows,
      });
      if (this.store.weddings.active()?.id !== wedding.id)
        throw new Error('O casamento selecionado mudou. Gere a lista novamente.');
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = special ? 'participacoes-especiais.pdf' : 'lista-convidados.pdf';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível gerar a lista.');
    } finally {
      this.pdfBusy.set(false);
    }
  }
  async quickGuests() {
    const count = await firstValueFrom(
      this.dialogs
        .open(QuickGuestsDialog, { width: '650px', maxWidth: '96vw', maxHeight: '90dvh' })
        .afterClosed(),
    );
    if (count)
      this.message.set(`${count} convidados adicionados. Você pode completar os dados depois.`);
  }
  params = toSignal(inject(ActivatedRoute).paramMap);
  section = computed(() =>
    this.params()?.get('section') === 'especiais'
      ? 'padrinhos'
      : (this.params()?.get('section') ?? 'convidados'),
  );
  title = computed(() =>
    this.section() === 'familias'
      ? 'Famílias e grupos'
      : this.section() === 'padrinhos'
        ? 'Participações especiais'
        : 'Convidados',
  );
  statuses = guestStatuses;
  sides = sides;
  date = formatCalendarDate;
  query = signal('');
  family = signal('');
  participation = signal('');
  participationOptions = computed(() =>
    [
      ...new Set([
        'Padrinho',
        'Madrinha',
        ...(this.store.ledger()?.godparents.map((p) => p.participation) ?? []),
      ]),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  );
  guestParticipation(id: string) {
    return this.store.ledger()?.godparents.find((p) => p.guestId === id);
  }
  group = signal('');
  side = signal('');
  status = signal('');
  age = signal('');
  table = signal('');
  sent = signal('');
  page = signal(1);
  private preferences = inject(PreferencesService);
  view = this.preferences.peopleView;
  pageSize = signal(25);
  setView(view: string) {
    this.preferences.setCollectionView('people', view);
  }
  selected = signal<Set<string>>(new Set());
  bulkStatus = signal('Aguardando confirmação');
  inspectedFamily = signal('');
  memberQuery = signal('');
  guestRows = computed(() =>
    this.filtered().map((g) => ({
      id: g.id,
      record: g,
      cells: [
        g.name,
        this.familyName(g.familyId),
        g.whatsapp || g.phone,
        g.status,
        g.invitationSent ? 'Sim' : 'Não',
      ],
    })),
  );
  familyRows = computed(() =>
    this.families().map((f) => ({
      id: f.id,
      record: f,
      cells: [
        f.name,
        `${this.members(f.id).length} integrantes · ${this.confirmed(f.id)} confirmados`,
        f.notes,
      ],
    })),
  );
  memberRows = computed(() =>
    this.members(this.inspectedFamily())
      .filter((g) => searchText(g.name).includes(searchText(this.memberQuery())))
      .map((g) => ({
        id: g.id,
        record: g,
        cells: [g.name, g.child ? 'Criança' : 'Adulto', g.status, g.whatsapp || g.phone],
      })),
  );
  godparentRows = computed(() =>
    this.godparents().map((p) => ({
      id: p.id,
      record: p,
      cells: [
        this.name(p.guestId),
        p.participation + (p.partnerId ? ' · Par: ' + this.partnerName(p.partnerId) : ''),
        this.guest(p.guestId)?.status ?? '',
        this.guest(p.guestId)?.whatsapp || this.guest(p.guestId)?.phone || '',
      ],
    })),
  );
  message = signal('');
  error = signal('');
  importFeedback = signal<{ kind: 'loading' | 'error' | 'success'; text: string } | null>(null);
  readingImport = signal(false);
  importExpanded = signal(false);
  private importRequest = 0;
  preview = signal<{
    text: string;
    count: number;
    warnings: string[];
    names: string[];
    weddingId: string;
    filename: string;
  } | null>(null);
  guests = computed(() => this.store.ledger()?.guests ?? []);
  filtered = computed(() =>
    this.guests()
      .filter(
        (g) =>
          (!this.query() ||
            searchText(
              [
                g.name,
                g.phone,
                g.whatsapp,
                g.email,
                this.familyName(g.familyId),
                g.relationship,
                g.table,
                this.guestParticipation(g.id)?.participation ?? '',
              ].join(' '),
            ).includes(searchText(this.query()))) &&
          (!this.family() || g.familyId === this.family()) &&
          (!this.participation() ||
            this.guestParticipation(g.id)?.participation === this.participation()) &&
          (!this.group() || g.group.toLowerCase().includes(this.group().toLowerCase())) &&
          (!this.side() || g.side === this.side()) &&
          (!this.status() || g.status === this.status()) &&
          (!this.age() || (this.age() === 'child' ? g.child : !g.child)) &&
          (!this.table() || g.table.toLowerCase().includes(this.table().toLowerCase())) &&
          (!this.sent() || g.invitationSent === (this.sent() === 'yes')),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  pages = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (this.section() === 'familias'
          ? this.families().length
          : this.section() === 'padrinhos'
            ? this.godparents().length
            : this.filtered().length) / this.pageSize(),
      ),
    ),
  );
  visible = computed(() =>
    this.filtered().slice(
      (Math.min(this.page(), this.pages()) - 1) * this.pageSize(),
      Math.min(this.page(), this.pages()) * this.pageSize(),
    ),
  );
  families = computed(() =>
    (this.store.ledger()?.families ?? [])
      .filter((f) =>
        searchText(
          f.name +
            ' ' +
            f.notes +
            ' ' +
            this.members(f.id)
              .map((g) => g.name)
              .join(' '),
        ).includes(searchText(this.query())),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  godparents = computed(() =>
    (this.store.ledger()?.godparents ?? [])
      .filter((p) => !this.participation() || p.participation === this.participation())
      .filter((p) =>
        searchText(
          this.name(p.guestId) +
            ' ' +
            p.participation +
            ' ' +
            (this.guest(p.guestId)?.whatsapp ?? ''),
        ).includes(searchText(this.query())),
      )
      .sort(
        (a, b) =>
          (a.entryOrder || 99999) - (b.entryOrder || 99999) ||
          this.name(a.guestId).localeCompare(this.name(b.guestId)),
      ),
  );
  visibleFamilies = computed(() =>
    this.families().slice(
      (Math.min(this.page(), this.pages()) - 1) * this.pageSize(),
      Math.min(this.page(), this.pages()) * this.pageSize(),
    ),
  );
  visibleGodparents = computed(() =>
    this.godparents().slice(
      (Math.min(this.page(), this.pages()) - 1) * this.pageSize(),
      Math.min(this.page(), this.pages()) * this.pageSize(),
    ),
  );
  constructor() {
    effect(() => {
      this.store.weddings.active()?.id;
      this.section();
      this.clear();
      this.selected.set(new Set());
      this.inspectedFamily.set('');
      this.preview.set(null);
      this.message.set('');
      this.error.set('');
      this.importRequest++;
      this.importFeedback.set(null);
      this.readingImport.set(false);
    });
  }
  clear() {
    this.participation.set('');
    this.query.set('');
    this.family.set('');
    this.group.set('');
    this.side.set('');
    this.status.set('');
    this.age.set('');
    this.table.set('');
    this.sent.set('');
    this.page.set(1);
  }
  setSelection(ids: string[]) {
    this.selected.set(new Set(ids));
  }
  details(g: Guest) {
    this.dialogs.open(NoticeDialog, {
      width: '600px',
      maxWidth: '94vw',
      data: {
        title: g.name,
        message: `${this.familyName(g.familyId)} · ${g.side} · ${g.status}\nTelefone: ${g.phone || 'Não informado'}\nWhatsApp: ${g.whatsapp || 'Não informado'}\nE-mail: ${g.email || 'Não informado'}\nRelação: ${g.relationship || 'Não informada'}\nMesa: ${g.table || 'Não definida'}\n${g.companionOf ? 'Acompanhante de ' + this.name(g.companionOf) : ''}\nObservações: ${g.notes || 'Nenhuma'}`,
      },
    });
  }
  async updateSelected() {
    const weddingId = this.store.weddings.active()!.id;
    const ids = [...this.selected()];
    const status = this.bulkStatus() as Guest['status'];
    if (!ids.length) return;
    const yes = await firstValueFrom(
      this.dialogs
        .open(ConfirmDialog, {
          data: {
            title: `Atualizar ${ids.length} pessoas?`,
            message: `A confirmação das pessoas selecionadas, inclusive em outras páginas e fora do filtro atual, passará para “${status}”. Revise sua seleção antes de confirmar.`,
          },
        })
        .afterClosed(),
    );
    if (yes)
      await this.run(
        async () => {
          await this.store.setStatuses(ids, status, weddingId);
          this.selected.set(new Set());
        },
        `${ids.length} pessoas atualizadas.`,
        true,
      );
  }
  guest(id: string) {
    return this.guests().find((g) => g.id === id);
  }
  name(id: string) {
    return this.guest(id)?.name ?? '';
  }
  familyName(id: string) {
    return this.store.ledger()?.families.find((f) => f.id === id)?.name ?? 'Individual';
  }
  members(id: string) {
    return this.guests().filter((g) => g.familyId === id);
  }
  confirmed(id: string) {
    return this.members(id).filter((g) => g.status === 'Confirmado').length;
  }
  partnerName(id: string) {
    const p = this.store.ledger()?.godparents.find((p) => p.id === id);
    return p ? this.name(p.guestId) : 'Sem par';
  }
  async edit(
    kind: 'guest' | 'family' | 'godparent',
    guest?: Guest,
    family?: Family,
    godparent?: Godparent,
    familyId?: string,
    companionOf?: string,
    selectedGuestId?: string,
  ) {
    this.error.set('');
    const saved = await firstValueFrom(
      this.dialogs
        .open(PersonDialog, {
          width: '780px',
          maxWidth: '96vw',
          data: { kind, guest, family, godparent, familyId, companionOf, selectedGuestId },
          autoFocus: kind === 'godparent' ? 'first-heading' : 'first-tabbable',
        })
        .afterClosed(),
    );
    if (saved) this.message.set('Cadastro salvo com sucesso.');
  }
  async duplicate(guest: Guest) {
    const saved = await firstValueFrom(
      this.dialogs
        .open(PersonDialog, {
          width: '780px',
          maxWidth: '96vw',
          data: { kind: 'guest', copyFrom: guest },
          autoFocus: '#guest-name',
        })
        .afterClosed(),
    );
    if (saved) this.message.set('Novo integrante salvo com sucesso.');
  }
  assignParticipation(g: Guest) {
    return this.edit(
      'godparent',
      undefined,
      undefined,
      this.guestParticipation(g.id),
      undefined,
      undefined,
      g.id,
    );
  }
  async remove(kind: 'guest' | 'family' | 'godparent', id: string, name: string) {
    const weddingId = this.store.weddings.active()!.id;
    const companions = kind === 'guest' ? this.guests().filter((g) => g.companionOf === id) : [];
    if (companions.length) {
      const confirmed = await firstValueFrom(
        this.dialogs
          .open(DeletePersonDialog, {
            width: '560px',
            maxWidth: '94vw',
            data: { name, companions },
          })
          .afterClosed(),
      );
      if (confirmed)
        await this.run(
          () =>
            this.store.removeGuestAndCompanions(id, weddingId, [
              id,
              ...companions.map((g) => g.id),
            ]),
          'Pessoa e acompanhantes excluídos. Os demais integrantes foram mantidos.',
          true,
        );
      return;
    }
    if (
      !(await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Excluir cadastro?',
              message:
                kind === 'godparent'
                  ? `Remover a participação de ${name}? A pessoa continuará na lista de convidados.`
                  : `Excluir ${name}? Vínculos existentes precisam ser removidos antes.`,
            },
          })
          .afterClosed(),
      ))
    )
      return;
    await this.run(
      () =>
        kind === 'guest'
          ? this.store.removeGuest(id, weddingId)
          : kind === 'family'
            ? this.store.removeFamily(id, weddingId)
            : this.store.removeGodparent(id, weddingId),
      'Cadastro excluído.',
      true,
    );
  }
  async changeStatus(g: Guest, status: string) {
    await this.run(
      () => this.store.setStatus(g.id, status as Guest['status'], g.weddingId),
      `Confirmação de ${g.name} atualizada.`,
    );
  }
  async inlineStatus(g: Guest, control: HTMLSelectElement) {
    await this.changeStatus(g, control.value);
    control.value =
      this.store.ledger()?.guests.find((guest) => guest.id === g.id)?.status ?? g.status;
  }
  async inlineSent(g: Guest, control: HTMLSelectElement) {
    await this.run(
      () => this.store.setInvitationSent(g.id, control.value === 'yes', g.weddingId),
      `Convite de ${g.name} atualizado.`,
    );
    control.value = this.store.ledger()?.guests.find((guest) => guest.id === g.id)?.invitationSent
      ? 'yes'
      : 'no';
  }
  async run(action: () => Promise<unknown>, success: string, showErrorDialog = false) {
    this.error.set('');
    this.message.set('');
    try {
      await action();
      this.message.set(success);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível concluir.');
      if (showErrorDialog)
        this.dialogs.open(NoticeDialog, {
          width: '540px',
          maxWidth: '94vw',
          role: 'alertdialog',
          data: { title: 'Não foi possível concluir', message: this.error() },
        });
    }
  }
  download(template = false) {
    const l = this.store.ledger();
    if (!l) return;
    const blob = new Blob(
      [guestsCsv(template ? emptyPeople(l.weddingId) : l, template ? [] : this.filtered())],
      { type: 'text/csv;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = template ? 'modelo-convidados.csv' : 'convidados.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async readFile(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    this.error.set('');
    this.preview.set(null);
    if (!file) return;
    const ledger = this.store.ledger();
    if (!ledger) return;
    const request = ++this.importRequest;
    this.message.set('');
    this.importFeedback.set({ kind: 'loading', text: `Conferindo ${file.name}…` });
    this.readingImport.set(true);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('O CSV deve ter até 2 MB.');
      const text = await file.text();
      if (request !== this.importRequest) return;
      const result = importGuests(text, ledger);
      this.preview.set({
        text,
        count: result.count,
        warnings: result.warnings,
        names: result.ledger.guests.slice(-result.count).map((g) => g.name),
        weddingId: ledger.weddingId,
        filename: file.name,
      });
      this.importFeedback.set({
        kind: 'success',
        text: `Arquivo ${file.name} conferido: ${result.count} pessoas encontradas. Confira a prévia abaixo e clique em Confirmar importação. Nenhum cadastro foi adicionado ainda.`,
      });
    } catch (e) {
      if (request !== this.importRequest) return;
      this.importFailure(file.name, e);
    } finally {
      if (request === this.importRequest) this.readingImport.set(false);
    }
  }
  importFailure(filename: string, error: unknown) {
    const message = `${error instanceof Error ? error.message : 'Não conseguimos ler a planilha.'}\n\nNenhum convidado foi importado. Corrija a planilha e use “Enviar planilha preenchida” para tentar novamente.\nArquivo: ${filename}`;
    this.importFeedback.set({ kind: 'error', text: message });
    this.dialogs.open(NoticeDialog, {
      width: '560px',
      maxWidth: '94vw',
      role: 'alertdialog',
      data: { title: 'Confira a planilha antes de continuar', message },
    });
  }
  async confirmImport() {
    const p = this.preview();
    if (!p || this.store.busy()) return;
    this.importFeedback.set({ kind: 'loading', text: 'Salvando os convidados…' });
    try {
      await this.store.importCsv(p.text, p.weddingId);
      this.preview.set(null);
      this.clear();
      this.importExpanded.set(false);
      this.importFeedback.set({
        kind: 'success',
        text: `${p.count} pessoas importadas com sucesso de ${p.filename}. Os filtros foram limpos para mostrar os cadastros.`,
      });
    } catch (e) {
      this.importFailure(p.filename, e);
    }
  }
}
