import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { PeopleService } from '../../core/services/people';
import { LocalEditorDialog } from '../../shared/components/local-editor-dialog';
import { reviewGuestNames } from '../../core/utils/people';
import { SearchPicker } from '../../shared/components/search-picker';
@Component({
  selector: 'oc-quick-guests-dialog',
  imports: [FormsModule, MatDialogModule, SearchPicker],
  template: `<h2 mat-dialog-title>Adicionar lista de convidados</h2>
    <mat-dialog-content>
      <p>
        Cole ou digite um nome por linha. Só o nome é necessário; os contatos e as confirmações
        podem ser preenchidos depois.
      </p>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      <oc-search-picker
        #familyPicker
        class="form-field"
        label="Família (opcional)"
        placeholder="Digite para buscar uma família"
        clearLabel="Sem família — convidados individuais"
        [options]="families()"
        [ngModel]="familyId()"
        (ngModelChange)="familyId.set($event)"
        [disabled]="saving()"
      />
      <p id="quick-family-help" class="muted">
        Se escolher uma família, todos os nomes abaixo entrarão nela e compartilharão o convite. A
        confirmação continua individual.
      </p>
      <label class="form-field quick-names-label"
        >Nomes dos convidados<textarea
          rows="10"
          [value]="text()"
          (input)="changeText($any($event.target).value)"
          [disabled]="saving()"
          placeholder="Maria Souza&#10;Carlos Souza&#10;Ana Silva"
        ></textarea>
      </label>
      <p role="status">{{ names().length }} pessoa(s) para adicionar.</p>
      @if (review(); as r) {
        <section class="feedback" role="alert">
          <strong>Confira os nomes repetidos antes de adicionar:</strong>
          <ul>
            @for (d of r.duplicates; track d.name) {
              <li>
                <strong>{{ d.name }}</strong>: {{ d.occurrences }} nesta lista{{
                  d.existing.length ? ' e ' + d.existing.length + ' já cadastrado(s)' : ''
                }}.
              </li>
            }
          </ul>
          <p>Pode ser um nome colado duas vezes ou pessoas diferentes com o mesmo nome.</p>
          <label class="people-check"
            ><input
              type="checkbox"
              [checked]="accept()"
              (change)="accept.set($any($event.target).checked)"
            />São pessoas diferentes. Quero adicionar todos os nomes.</label
          >
        </section>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button class="button secondary" [disabled]="saving()" (click)="cancel()">Cancelar</button
      ><button
        class="button primary"
        [disabled]="saving() || !names().length || (!!review() && !accept())"
        (click)="save()"
      >
        {{ saving() ? 'Adicionando…' : 'Adicionar à lista' }}
      </button></mat-dialog-actions
    >`,
  styles: [
    ':host { display:flex; flex-direction:column; min-height:0; overflow:hidden; } .quick-names-label { display:flex; flex-direction:column; gap:8px; } textarea { width:100%; } #quick-family-help { font-size:12px; line-height:1.5; margin:8px 0 20px; }',
  ],
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class QuickGuestsDialog extends LocalEditorDialog {
  store = inject(PeopleService);
  weddingId = this.store.weddings.active()!.id;
  text = signal('');
  familyId = signal('');
  families = computed(() =>
    (this.store.ledger()?.families ?? []).map((f) => ({ id: f.id, name: f.name })),
  );
  @ViewChild(SearchPicker) familyPicker?: SearchPicker;
  review = signal<ReturnType<typeof reviewGuestNames> | null>(null);
  accept = signal(false);
  changeText(value: string) {
    this.text.set(value);
    this.review.set(null);
    this.accept.set(false);
    this.error.set('');
  }
  names = computed(() =>
    this.text()
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  dirty() {
    return !!this.text().trim() || !!this.familyId() || !!this.familyPicker?.term().trim();
  }
  async save() {
    if (this.saving()) return;
    if (this.familyPicker?.term().trim() && !this.familyId()) {
      this.error.set(
        'Escolha uma família nos resultados da busca ou limpe o campo para adicionar sem família.',
      );
      return;
    }
    const review = reviewGuestNames(this.names(), this.store.ledger()?.guests ?? []);
    if (review.signature && (review.signature !== this.review()?.signature || !this.accept())) {
      this.review.set(review);
      this.accept.set(false);
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.store.addNames(
        this.names(),
        this.weddingId,
        this.accept() ? this.review()?.signature : '',
        this.familyId(),
      );
      this.ref.close(this.names().length);
    } catch (error) {
      await this.store.refresh();
      const latest = reviewGuestNames(this.names(), this.store.ledger()?.guests ?? []);
      this.review.set(latest.signature ? latest : null);
      this.accept.set(false);
      this.error.set(
        error instanceof Error ? error.message : 'Não foi possível adicionar os convidados.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
