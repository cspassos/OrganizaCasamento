import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { InvitationsService } from '../../core/services/invitations';
import { recipientGroup } from '../../core/utils/invitations';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';

@Component({
  selector: 'oc-batch-issue-dialog',
  imports: [FormsModule, MatDialogModule, CollectionTable],
  template: `
    <h2 mat-dialog-title>Criar vários convites</h2>
    <mat-dialog-content>
      <p>
        Cada família ou grupo de acompanhantes recebe um único convite. As confirmações continuam
        individuais. Convites ativos existentes serão mantidos.
      </p>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      <label
        >Modelo do convite<select [ngModel]="designId()" (ngModelChange)="designId.set($event)">
          @for (d of store.ledger()?.designs; track d.id) {
            <option [value]="d.id">{{ d.title }}</option>
          }
        </select></label
      >
      <label
        >Buscar pessoa, família ou contato<input
          type="search"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
      /></label>
      <oc-collection-table
        label="Destinatários dos convites"
        [headers]="['Destinatário', 'Pessoas incluídas', 'Situação']"
        [rows]="rows()"
        [selectable]="true"
        [selected]="selected()"
        (selectionChange)="selected.set(toSet($event))"
        [disabled]="saving()"
      />
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button class="button secondary" [disabled]="saving()" (click)="ref.close()">Cancelar</button
      ><button
        class="button primary"
        [disabled]="saving() || !selected().size || !designId()"
        (click)="save()"
      >
        {{ saving() ? 'Criando…' : 'Criar convites selecionados (' + selected().size + ')' }}
      </button></mat-dialog-actions
    >
  `,
})
export class BatchIssueDialog {
  store = inject(InvitationsService);
  ref = inject(MatDialogRef<BatchIssueDialog>);
  data = inject<{ designId?: string }>(MAT_DIALOG_DATA);
  dialogs = inject(MatDialog);
  weddingId = this.store.weddings.active()!.id;
  designId = signal(this.data.designId ?? this.store.ledger()?.designs[0]?.id ?? '');
  query = signal('');
  selected = signal(new Set<string>());
  saving = signal(false);
  error = signal('');
  toSet = (ids: string[]) => new Set(ids);
  groups = computed(() => {
    const p = this.store.people.ledger();
    if (!p) return [];
    const groups = new Map<string, ReturnType<typeof recipientGroup>>();
    for (const g of p.guests) {
      const group = recipientGroup(p, g.id);
      groups.set(group.key, group);
    }
    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  });
  rows = computed(() =>
    this.groups()
      .filter((g) =>
        searchText(
          g.label + ' ' + g.members.map((m) => [m.name, m.phone, m.whatsapp].join(' ')).join(' '),
        ).includes(searchText(this.query())),
      )
      .map((g) => ({
        id: g.members[0].id,
        record: g,
        cells: [
          g.label,
          g.members.map((m) => m.name).join(', '),
          this.store.ledger()?.issues.some((i) => i.active && i.unitKey === g.key)
            ? 'Já tem convite ativo — será mantido'
            : 'Novo convite',
        ],
      })),
  );
  async save() {
    const ids = [...this.selected()],
      designId = this.designId();
    const yes = await firstValueFrom(
      this.dialogs
        .open(ConfirmDialog, {
          data: {
            title: `Preparar ${ids.length} convites?`,
            message: `Serão consideradas todas as famílias e pessoas selecionadas, inclusive em outras páginas e fora do filtro atual. O sistema criará os convites; nenhum envio será feito automaticamente.`,
          },
        })
        .afterClosed(),
    );
    if (!yes) return;
    this.saving.set(true);
    this.ref.disableClose = true;
    try {
      this.ref.close(await this.store.issueMany(designId, ids, this.weddingId));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível criar os convites.');
    } finally {
      this.saving.set(false);
      this.ref.disableClose = false;
    }
  }
}
