import { cloudEnabled } from '../../core/repositories/cloud-backend';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { InvitationsService } from '../../core/services/invitations';
import { messageActions, WhatsappQueue } from '../../core/models/invitations';
import { validPhone } from '../../core/utils/contact';
import { recipientGroup, renderMessage, whatsappUrl } from '../../core/utils/invitations';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { BatchExportDialog } from './batch-export-dialog';

@Component({
  selector: 'oc-whatsapp-batch',
  imports: [FormsModule, CollectionTable],
  template: `<section class="card form-section">
    <h2>Escolha quem vai receber</h2>
    <p class="muted">
      Selecione os destinatários e prepare uma fila de conversas. Você confirma cada envio no
      WhatsApp.
      {{
        cloud
          ? 'O andamento fica salvo na sua conta.'
          : 'O andamento fica salvo neste navegador, mesmo se sair da tela.'
      }}
    </p>
    @if (error()) {
      <p class="feedback error" role="alert">{{ error() }}</p>
    }
    @if (message()) {
      <p class="feedback success" role="status">{{ message() }}</p>
    }
    @if (queue(); as q) {
      <div class="collection-selection">
        <strong
          >{{ done() }} de {{ q.entries.length }} concluídos · {{ skipped() }} pulados ·
          {{ pending() }} pendentes</strong
        ><button class="button secondary" [disabled]="busy() || !pending()" (click)="closeQueue()">
          Encerrar fila pendente</button
        ><button class="button secondary" (click)="downloadQueue()">
          Baixar convites desta fila em ZIP
        </button>
      </div>
      @if (current(); as e) {
        <section class="whatsapp-current" aria-label="Próximo envio">
          <h3>Próximo: {{ e.label }}</h3>
          <p>
            {{
              currentPhone() ||
                'Contato removido ou inválido — pule este envio e corrija o cadastro.'
            }}
          </p>
          <p class="muted">
            {{
              q.action === 'invite'
                ? 'O convite representa: ' + recipientNames(e.recipientIds)
                : 'Esta ação não altera a confirmação nem registra um novo convite enviado.'
            }}
          </p>
          <textarea
            readonly
            rows="4"
            aria-label="Mensagem do próximo envio"
            [value]="currentText()"
          ></textarea>
          <div class="people-actions">
            @if (currentLink()) {
              <a class="button primary" [href]="currentLink()" target="_blank" rel="noopener"
                >Abrir conversa no WhatsApp</a
              >
            }
            <button
              class="button primary"
              [disabled]="busy() || !currentLink()"
              (click)="finish('sent')"
            >
              Já enviei — registrar e ir ao próximo
            </button>
            <button class="button secondary" [disabled]="busy()" (click)="finish('skipped')">
              Pular este envio
            </button>
          </div>
          <small
            >O atalho abre apenas o texto. Para enviar o modelo, baixe o ZIP, extraia os arquivos e
            anexe o convite com o nome desta pessoa ou família na conversa.</small
          >
        </section>
      } @else {
        <p role="status">Fila concluída. Você pode preparar outra seleção abaixo.</p>
      }
      <details class="optional-details">
        <summary>Ver todos os destinatários e o andamento</summary>
        <oc-collection-table
          label="Andamento dos envios"
          [headers]="['Destinatário', 'Andamento']"
          [rows]="queueRows()"
        />
      </details>
    }
    <details class="optional-details" [open]="!pending()">
      <summary>Selecionar destinatários para uma nova fila</summary>
      <div class="people-form">
        <label
          >Modelo do convite<select [ngModel]="designId()" (ngModelChange)="designId.set($event)">
            <option value="">Escolha um modelo salvo</option>
            @for (d of store.ledger()?.designs; track d.id) {
              <option [value]="d.id">{{ d.title }}</option>
            }
          </select></label
        >
        <label
          >Mensagem<select
            [ngModel]="action()"
            (ngModelChange)="action.set($event); customText.set('')"
          >
            @for (a of actions; track a.id) {
              <option [value]="a.id">{{ a.label }}</option>
            }
          </select></label
        >
        <label class="full"
          >Buscar nome, família, telefone ou confirmação<input
            type="search"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
        /></label>
        <label class="check-label"
          ><input
            type="checkbox"
            [ngModel]="onePerFamily()"
            (ngModelChange)="onePerFamily.set($event)"
          />Uma conversa por família / convite compartilhado</label
        >
        <label class="check-label"
          ><input
            type="checkbox"
            [ngModel]="onlyUnsent()"
            (ngModelChange)="onlyUnsent.set($event)"
          />Mostrar apenas convites ainda não enviados</label
        >
      </div>
      <details>
        <summary>Personalizar texto da fila</summary>
        <label
          >Mensagem<textarea
            rows="4"
            maxlength="2500"
            [ngModel]="template()"
            (ngModelChange)="customText.set($event)"
          ></textarea></label
        ><small
          >Use {{ '{nome}' }}, {{ '{noivos}' }}, {{ '{data}' }}, {{ '{hora}' }}, {{ '{local}' }} e
          {{ '{mapa}' }}.</small
        >
      </details>
      <oc-collection-table
        label="Destinatários WhatsApp"
        [headers]="['Nome', 'Família', 'Contato', 'Confirmação', 'Convite enviado']"
        [rows]="rows()"
        [selectable]="true"
        [selected]="selected()"
        (selectionChange)="selected.set(toSet($event))"
        [disabled]="busy() || !!pending()"
        [compact]="true"
      />
      <p>
        {{ plan().entries.length }} conversas serão preparadas para {{ selected().size }} pessoas
        selecionadas. {{ plan().excluded.length }} sem contato próprio válido.
        {{ plan().grouped }} agrupadas por família ou convite compartilhado.
      </p>
      @if (plan().excluded.length) {
        <details>
          <summary>Ver pessoas sem contato válido</summary>
          <p>
            {{ plan().excluded.join(', ') }}. Corrija o telefone ou WhatsApp no cadastro e prepare
            outra fila para elas.
          </p>
        </details>
      }
      <button
        class="button primary"
        [disabled]="busy() || !!pending() || !plan().entries.length || !designId()"
        (click)="prepare()"
      >
        Preparar fila de {{ plan().entries.length }} conversas
      </button>
      @if (!store.ledger()?.designs?.length) {
        <p class="muted">Salve um modelo em Convites → Modelos para preparar a fila.</p>
      }
    </details>
  </section>`,
})
export class WhatsappBatch {
  cloud = cloudEnabled;
  store = inject(InvitationsService);
  dialogs = inject(MatDialog);
  actions = messageActions;
  query = signal('');
  selected = signal(new Set<string>());
  designId = signal('');
  action = signal('invite');
  customText = signal('');
  onePerFamily = signal(true);
  onlyUnsent = signal(false);
  error = signal('');
  message = signal('');
  busy = signal(false);
  toSet = (ids: string[]) => new Set(ids);
  queue = computed(() => this.store.ledger()?.whatsappQueue);
  current = computed(() => this.queue()?.entries.find((e) => e.state === 'pending'));
  pending = computed(() => this.queue()?.entries.filter((e) => e.state === 'pending').length ?? 0);
  done = computed(() => this.queue()?.entries.filter((e) => e.state === 'sent').length ?? 0);
  skipped = computed(() => this.queue()?.entries.filter((e) => e.state === 'skipped').length ?? 0);
  currentGuest = computed(() =>
    this.store.people.ledger()?.guests.find((g) => g.id === this.current()?.guestId),
  );
  currentPhone = computed(() => {
    const g = this.currentGuest(),
      phone = g?.whatsapp || g?.phone || '';
    return phone && validPhone(phone) ? phone : '';
  });
  currentText = computed(() => {
    const g = this.currentGuest(),
      q = this.queue();
    return g && q ? renderMessage(q.text, g, q.design) : '';
  });
  currentLink = computed(() =>
    this.currentPhone() ? whatsappUrl(this.currentPhone(), this.currentText()) : '',
  );
  queueRows = computed(
    () =>
      this.queue()?.entries.map((e) => ({
        id: e.id,
        record: e,
        cells: [
          e.label,
          e.state === 'pending'
            ? 'Pendente'
            : e.state === 'sent'
              ? 'Envio informado por você'
              : 'Pulado',
        ],
      })) ?? [],
  );
  template = computed(
    () => this.customText() || messageActions.find((a) => a.id === this.action())!.text,
  );
  family(id: string) {
    return this.store.people.ledger()?.families.find((f) => f.id === id)?.name ?? 'Individual';
  }
  rows = computed(() =>
    (this.store.people.ledger()?.guests ?? [])
      .filter(
        (g) =>
          (!this.onlyUnsent() || !g.invitationSent) &&
          searchText(
            [g.name, this.family(g.familyId), g.whatsapp, g.phone, g.status].join(' '),
          ).includes(searchText(this.query())),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((g) => ({
        id: g.id,
        record: g,
        cells: [
          g.name,
          this.family(g.familyId),
          g.whatsapp || g.phone || 'Sem contato',
          g.status,
          g.invitationSent ? 'Sim' : 'Não',
        ],
      })),
  );
  plan = computed(() => {
    const p = this.store.people.ledger();
    const entries: WhatsappQueue['entries'] = [],
      excluded: string[] = [];
    const units = new Set<string>();
    let grouped = 0;
    if (p)
      for (const g of p.guests.filter((g) => this.selected().has(g.id))) {
        const phone = g.whatsapp || g.phone;
        if (!phone || !validPhone(phone)) {
          excluded.push(g.name);
          continue;
        }
        const group = recipientGroup(p, g.id),
          key = this.onePerFamily() ? group.key : g.id;
        // A shared telephone can represent different invite units; do not silently merge them.
        if (units.has(key)) {
          grouped++;
          continue;
        }
        units.add(key);
        entries.push({
          id: g.id,
          guestId: g.id,
          label: this.onePerFamily() ? group.label : g.name,
          recipientIds: this.onePerFamily() ? group.members.map((m) => m.id) : [g.id],
          state: 'pending',
        });
      }
    return { entries, excluded, grouped };
  });
  constructor() {
    effect(() => {
      this.store.weddings.active()?.id;
      this.selected.set(new Set());
      this.error.set('');
      this.message.set('');
      this.designId.set('');
    });
  }
  recipientNames(ids: string[]) {
    return (this.store.people.ledger()?.guests ?? [])
      .filter((g) => ids.includes(g.id))
      .map((g) => g.name)
      .join(', ');
  }
  async run(work: () => Promise<unknown>) {
    this.busy.set(true);
    this.error.set('');
    try {
      await work();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      this.busy.set(false);
    }
  }
  async prepare() {
    const design = this.store.ledger()?.designs.find((d) => d.id === this.designId()),
      plan = this.plan(),
      weddingId = this.store.weddings.active()!.id;
    if (!design || !plan.entries.length) return;
    const yes = await firstValueFrom(
      this.dialogs
        .open(ConfirmDialog, {
          data: {
            title: `Preparar ${plan.entries.length} conversas?`,
            message: `${this.onePerFamily() ? 'Cada conversa incluirá os integrantes da família ou convite compartilhado, mesmo os não selecionados individualmente.' : 'Cada conversa corresponde à pessoa selecionada.'} ${plan.excluded.length} pessoas sem contato válido ficarão fora. Nenhuma mensagem será enviada automaticamente.`,
          },
        })
        .afterClosed(),
    );
    if (yes)
      await this.run(async () => {
        await this.store.saveWhatsappQueue(
          {
            id: crypto.randomUUID(),
            design: structuredClone(design),
            action: this.action(),
            text: this.template(),
            entries: structuredClone(plan.entries),
          },
          weddingId,
        );
        this.message.set('Fila salva. Abra a primeira conversa e confirme o envio no WhatsApp.');
      });
  }
  async finish(state: 'sent' | 'skipped') {
    const q = this.queue(),
      e = this.current(),
      weddingId = this.store.weddings.active()!.id;
    if (!q || !e) return;
    if (
      state === 'sent' &&
      !(await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Confirmar envio realizado?',
              message: `Você já enviou a mensagem${q.action === 'invite' ? ' e o convite' : ''} para ${e.label} no WhatsApp? O sistema não consegue verificar a entrega.`,
            },
          })
          .afterClosed(),
      ))
    )
      return;
    await this.run(() => this.store.updateWhatsappEntry(q.id, e.id, state, weddingId));
  }
  async closeQueue() {
    const id = this.store.weddings.active()!.id;
    if (
      await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Encerrar fila?',
              message:
                'Os destinatários pendentes ficarão como pulados. Os envios já informados serão preservados.',
            },
          })
          .afterClosed(),
      )
    )
      await this.run(() => this.store.closeWhatsappQueue(id));
  }
  downloadQueue() {
    const q = this.queue();
    if (q)
      this.dialogs.open(BatchExportDialog, {
        width: '600px',
        maxWidth: '96vw',
        data: {
          format: 'png',
          items: q.entries.map((e) => ({ design: structuredClone(q.design), label: e.label })),
        },
      });
  }
}
