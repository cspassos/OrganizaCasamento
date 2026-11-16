import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SuppliersService } from '../../core/services/suppliers';
import { WorkShift } from '../../core/models/suppliers';
import { localDateTime, newShift } from '../../core/utils/suppliers';
import { localToday } from '../../core/utils/finance';
import { LocalEditorDialog } from '../../shared/components/local-editor-dialog';
import { SearchPicker } from '../../shared/components/search-picker';
import { DatePicker } from '../../shared/components/date-picker';

@Component({
  selector: 'oc-shift-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, SearchPicker, DatePicker],
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  template: `
    <h2 mat-dialog-title>
      {{
        source
          ? 'Editar escala'
          : data.professionalIds?.length
            ? 'Criar escalas para os selecionados'
            : 'Nova escala'
      }}
    </h2>
    <mat-dialog-content>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      @if (savedCount()) {
        <p class="feedback success" role="status">
          {{ savedCount() }} escala(s) salva(s). Preencha a próxima ou conclua.
        </p>
      }
      <form class="people-form" id="shift-form" [formGroup]="form" (ngSubmit)="save()">
        @if (data.professionalIds?.length) {
          <p class="full">
            Uma escala com os horários abaixo será criada para cada um dos
            {{ data.professionalIds!.length }} profissionais selecionados. Se houver conflito,
            nenhuma será salva.
          </p>
          <details class="full">
            <summary>Ver profissionais selecionados</summary>
            <p>{{ selectedNames() }}</p>
          </details>
        } @else {
          <oc-search-picker
            class="full"
            label="Profissional da escala *"
            [required]="true"
            formControlName="professionalId"
            placeholder="Buscar por nome, função ou telefone"
            [options]="options()"
          />
        }
        <label
          >Data de início *<oc-date-picker
            [iso]="true"
            label="Data de início"
            formControlName="startDate"
        /></label>
        <label>Horário de início *<input type="time" formControlName="startTime" /></label>
        <label
          >Data de término *<oc-date-picker
            [iso]="true"
            label="Data de término"
            formControlName="endDate"
        /></label>
        <label>Horário de término *<input type="time" formControlName="endTime" /></label>
        <p class="full muted">
          Se terminar depois da meia-noite, escolha a data do dia seguinte. O sistema verifica
          conflitos por profissional.
        </p>
        @if (!source?.arrivedAt) {
          <label
            >Situação<select formControlName="status">
              <option value="planned">Planejada</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
            </select></label
          >
        }
        <label class="full"
          >Local / setor<input
            formControlName="location"
            maxlength="300"
            placeholder="Ex.: recepção, cozinha, entrada principal"
        /></label>
        <label class="full"
          >Tarefas desta escala<textarea
            formControlName="tasks"
            rows="4"
            maxlength="4000"
            placeholder="Uma tarefa por linha. Ex.:&#10;Conferir as mesas&#10;Recepcionar os convidados"
          ></textarea
          ><small>As tarefas aparecerão como lista para marcar na escala.</small></label
        >
        <label class="full"
          >Observações<textarea formControlName="notes" rows="2" maxlength="4000"></textarea>
        </label>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button class="button secondary" [disabled]="saving()" (click)="cancel()">
        {{ savedCount() ? 'Concluir' : 'Cancelar' }}
      </button>
      @if (!source && !data.professionalIds?.length) {
        <button class="button secondary" [disabled]="saving()" (click)="save(true)">
          Salvar e adicionar outra
        </button>
      }
      <button class="button primary" type="submit" form="shift-form" [disabled]="saving()">
        {{ saving() ? 'Salvando…' : 'Salvar escala' }}
      </button></mat-dialog-actions
    >
  `,
})
export class ShiftDialog extends LocalEditorDialog {
  store = inject(SuppliersService);
  data = inject<{ value?: WorkShift; professionalId?: string; professionalIds?: string[] }>(
    MAT_DIALOG_DATA,
  );
  fb = inject(FormBuilder);
  weddingId = this.store.weddings.active()!.id;
  source = this.data.value;
  id = this.source?.id ?? crypto.randomUUID();
  day = this.store.weddings.active()?.date || localToday();
  form = this.fb.nonNullable.group({
    professionalId: [
      this.source?.professionalId ?? this.data.professionalId ?? '',
      this.data.professionalIds?.length ? [] : Validators.required,
    ],
    startDate: [this.source?.start.slice(0, 10) ?? this.day, Validators.required],
    startTime: [this.source?.start.slice(11) ?? '09:00', Validators.required],
    endDate: [this.source?.end.slice(0, 10) ?? this.day, Validators.required],
    endTime: [this.source?.end.slice(11) ?? '17:00', Validators.required],
    location: [this.source?.location ?? ''],
    tasks: [this.source?.tasks ?? ''],
    status: [this.source?.status ?? 'planned'],
    notes: [this.source?.notes ?? ''],
  });
  options = computed(() =>
    (this.store.ledger()?.professionals ?? [])
      .filter((p) => p.status !== 'unavailable' || p.id === this.source?.professionalId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        detail: [p.role, p.phone, p.company].filter(Boolean).join(' · '),
      })),
  );
  selectedNames() {
    return this.options()
      .filter((p) => this.data.professionalIds?.includes(p.id))
      .map((p) => p.name)
      .join(', ');
  }
  constructor() {
    super();
    if (this.source?.arrivedAt) {
      for (const key of ['professionalId', 'startDate', 'startTime', 'endDate', 'endTime'] as const)
        this.form.controls[key].disable();
    }
  }
  dirty() {
    return this.form.dirty;
  }
  async save(another = false) {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Selecione um profissional e informe datas e horários.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      const ids = this.data.professionalIds ?? [v.professionalId];
      await this.store.saveShifts(
        ids.map((professionalId, index) => ({
          ...newShift(this.weddingId),
          ...this.source,
          id: this.data.professionalIds ? crypto.randomUUID() : this.id,
          professionalId,
          start: v.startDate + 'T' + v.startTime,
          end: v.endDate + 'T' + v.endTime,
          status: v.status as WorkShift['status'],
          location: v.location,
          tasks: v.tasks,
          notes: v.notes,
        })),
        this.weddingId,
      );
      this.savedCount.update((n) => n + ids.length);
      if (another) {
        this.source = undefined;
        this.id = crypto.randomUUID();
        this.form.reset({ ...v, professionalId: '', notes: '' });
        document.querySelector('oc-shift-dialog mat-dialog-content')?.scrollTo(0, 0);
      } else this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar a escala.');
    } finally {
      this.saving.set(false);
    }
  }
}

@Component({
  selector: 'oc-presence-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, DatePicker],
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  template: `<h2 mat-dialog-title>
      {{ data.kind === 'arrival' ? 'Registrar chegada' : 'Registrar saída' }}
    </h2>
    <mat-dialog-content
      ><p>{{ data.name }}</p>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      <form class="people-form" id="presence-form" [formGroup]="form" (ngSubmit)="save()">
        <label
          >Data *<oc-date-picker
            [iso]="true"
            label="Data do registro"
            formControlName="date" /></label
        ><label
          >Horário *<input type="time" formControlName="time"
        /></label></form></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button class="button secondary" [disabled]="saving()" (click)="cancel()">Cancelar</button
      ><button class="button primary" type="submit" form="presence-form" [disabled]="saving()">
        Registrar
      </button></mat-dialog-actions
    >`,
})
export class PresenceDialog extends LocalEditorDialog {
  store = inject(SuppliersService);
  data = inject<{ id: string; weddingId: string; kind: 'arrival' | 'departure'; name: string }>(
    MAT_DIALOG_DATA,
  );
  fb = inject(FormBuilder);
  now = localDateTime();
  form = this.fb.nonNullable.group({
    date: [this.now.slice(0, 10), Validators.required],
    time: [this.now.slice(11), Validators.required],
  });
  dirty() {
    return this.form.dirty;
  }
  async save() {
    if (this.saving() || this.form.invalid) return;
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      await this.store.presence(
        this.data.id,
        this.data.weddingId,
        this.data.kind,
        v.date + 'T' + v.time,
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível registrar.');
    } finally {
      this.saving.set(false);
    }
  }
}
