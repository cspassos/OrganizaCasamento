import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { OrganizerItem } from '../../core/models/models';
import { OrganizerService } from '../../core/services/organizer';
import { LocalEditorDialog } from '../../shared/components/local-editor-dialog';
import { DatePicker } from '../../shared/components/date-picker';

@Component({
  selector: 'oc-organizer-dialog',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  imports: [ReactiveFormsModule, MatDialogModule, DatePicker],
  template: `
    <h2 mat-dialog-title>
      {{ data.item ? 'Editar' : 'Adicionar' }}
      {{ form.controls.kind.value === 'note' ? 'anotação' : 'lembrete' }}
    </h2>
    <mat-dialog-content>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      <form id="organizer-form" class="dialog-form" [formGroup]="form" (ngSubmit)="save()">
        <label class="form-field"
          >O que você quer guardar?
          <select formControlName="kind">
            <option value="reminder">Lembrete — algo para fazer em uma data</option>
            <option value="note">Anotação — uma ideia ou informação</option>
          </select>
        </label>
        <label class="form-field"
          >Título *<input
            formControlName="title"
            maxlength="120"
            placeholder="Ex.: buscar as alianças ou ideias para a decoração"
        /></label>
        <label class="form-field"
          >Detalhes (opcional)<textarea
            rows="5"
            formControlName="text"
            maxlength="5000"
            placeholder="Escreva o que você não quer esquecer…"
          ></textarea>
        </label>
        @if (form.controls.kind.value === 'reminder') {
          <div class="form-grid">
            <div class="form-field">
              <label for="reminder-date">Data do lembrete *</label
              ><oc-date-picker
                inputId="reminder-date"
                label="Data do lembrete"
                [iso]="true"
                formControlName="date"
              />
            </div>
            <label class="form-field"
              >Horário (opcional)<input type="time" formControlName="time"
            /></label>
          </div>
          <p class="muted">
            O aviso aparece no sino e na visão geral, dentro do sistema. Não enviamos e-mail ou
            notificação com o site fechado.
          </p>
        }
        <label class="organizer-check"
          ><input type="checkbox" formControlName="important" />Destacar como importante</label
        >
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button class="button secondary" (click)="cancel()" [disabled]="saving()">Cancelar</button
      ><button class="button primary" type="submit" form="organizer-form" [disabled]="saving()">
        {{ saving() ? 'Salvando…' : 'Salvar' }}
      </button></mat-dialog-actions
    >
  `,
})
export class OrganizerDialog extends LocalEditorDialog {
  data = inject<{ weddingId: string; kind: 'note' | 'reminder'; item?: OrganizerItem }>(
    MAT_DIALOG_DATA,
  );
  store = inject(OrganizerService);
  form = inject(FormBuilder).nonNullable.group({
    kind: [this.data.item?.kind ?? this.data.kind],
    title: [this.data.item?.title ?? '', [Validators.required, Validators.maxLength(120)]],
    text: [this.data.item?.text ?? '', Validators.maxLength(5000)],
    date: [this.data.item?.date ?? ''],
    time: [this.data.item?.time ?? ''],
    important: [this.data.item?.important ?? false],
  });
  dirty() {
    return this.form.dirty;
  }
  async save() {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Dê um título para encontrar este item depois.');
      return;
    }
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      await this.store.save(this.data.weddingId, {
        ...value,
        date: value.kind === 'note' ? '' : value.date,
        time: value.kind === 'note' ? '' : value.time,
        id: this.data.item?.id ?? crypto.randomUUID(),
        completed: this.data.item?.completed ?? false,
        updatedAt: new Date().toISOString(),
      });
      this.form.markAsPristine();
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      this.saving.set(false);
    }
  }
}
