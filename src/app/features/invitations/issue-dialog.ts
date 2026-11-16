import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InvitationsService } from '../../core/services/invitations';
import { GuestPicker } from '../../shared/components/guest-picker';
import { recipientGroup } from '../../core/utils/invitations';
@Component({
  selector: 'oc-issue-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, GuestPicker],
  template: `
    <h2 mat-dialog-title>Criar convite para convidados</h2>
    <mat-dialog-content>
      <p>
        Escolha o modelo e uma pessoa. Os integrantes da família ou acompanhantes dela receberão o
        mesmo convite, com confirmação individual.
      </p>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      <form [formGroup]="form" class="people-form" id="issue-form" (ngSubmit)="save()">
        <label class="full"
          >Convite salvo *<select formControlName="designId">
            @for (d of store.ledger()?.designs; track d.id) {
              <option [value]="d.id">{{ d.title }}</option>
            }
          </select></label
        >
        <oc-guest-picker
          class="full"
          formControlName="guestId"
          [guests]="store.people.ledger()?.guests ?? []"
          [families]="store.people.ledger()?.families ?? []"
        />
        @if (group(); as g) {
          <div class="full">
            <strong>Este convite incluirá {{ g.members.length }} pessoa(s):</strong>
            <p>{{ g.members.map(memberName).join(', ') }}</p>
          </div>
        }
      </form> </mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button class="button secondary" [disabled]="saving()" (click)="ref.close()">Cancelar</button
      ><button class="button primary" type="submit" form="issue-form" [disabled]="saving()">
        {{ saving() ? 'Criando…' : 'Criar convite' }}
      </button></mat-dialog-actions
    >
  `,
})
export class IssueDialog {
  store = inject(InvitationsService);
  ref = inject(MatDialogRef<IssueDialog>);
  data = inject<{ designId?: string }>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  weddingId = this.store.weddings.active()!.id;
  form = this.fb.nonNullable.group({
    designId: [
      this.data.designId ?? this.store.ledger()?.designs[0]?.id ?? '',
      Validators.required,
    ],
    guestId: ['', Validators.required],
  });
  value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  error = signal('');
  saving = signal(false);
  memberName = (g: { name: string }) => g.name;
  group = computed(() => {
    const id = this.value().guestId,
      p = this.store.people.ledger();
    if (!id || !p) return null;
    try {
      return recipientGroup(p, id);
    } catch {
      return null;
    }
  });
  async save() {
    if (this.form.invalid) {
      this.error.set('Escolha um convite e selecione uma pessoa nos resultados da busca.');
      return;
    }
    this.saving.set(true);
    this.ref.disableClose = true;
    try {
      const v = this.form.getRawValue();
      const i = await this.store.issue(v.designId, v.guestId, this.weddingId);
      this.ref.close(i);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível criar o convite.');
    } finally {
      this.saving.set(false);
      this.ref.disableClose = false;
    }
  }
}
