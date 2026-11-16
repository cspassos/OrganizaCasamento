import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { searchText } from './collection-table';
export interface SearchOption {
  id: string;
  name: string;
  detail?: string;
}
@Component({
  selector: 'oc-search-picker',
  imports: [MatAutocompleteModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchPicker), multi: true },
  ],
  template: `<label [for]="inputId">{{ label() }}</label
    ><input
      [id]="inputId"
      type="text"
      autocomplete="off"
      [placeholder]="placeholder()"
      [value]="display()"
      [disabled]="disabled()"
      [matAutocomplete]="choices"
      (input)="search($any($event.target).value)"
      (blur)="touched()"
      [attr.aria-describedby]="inputId + '-help'"
    />
    <small [id]="inputId + '-help'">{{
      selected()?.detail || 'Digite para buscar e selecione um resultado da lista.'
    }}</small>
    <mat-autocomplete
      #choices="matAutocomplete"
      [displayWith]="displayName"
      (optionSelected)="choose($event.option.value)"
    >
      @for (option of matches().slice(0, 30); track option.id) {
        <mat-option [value]="option"
          ><span class="guest-picker-name">{{ option.name }}</span
          ><small class="guest-picker-detail">{{ option.detail }}</small></mat-option
        >
      } @empty {
        <mat-option disabled>Nenhum resultado encontrado.</mat-option>
      }
      @if (matches().length > 30) {
        <mat-option disabled
          >Mostrando 30 de {{ matches().length }}. Digite mais para refinar.</mat-option
        >
      }
      @if (!required()) {
        <mat-option [value]="null">{{ clearLabel() }}</mat-option>
      }
    </mat-autocomplete>`,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    :host small {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.5;
    }
  `,
})
export class SearchPicker implements ControlValueAccessor {
  options = input<SearchOption[]>([]);
  label = input('Selecionar');
  placeholder = input('Buscar por nome, empresa ou contato');
  required = input(false);
  clearLabel = input('Sem vínculo / limpar escolha');
  inputId = 'search-picker-' + crypto.randomUUID();
  selectedId = signal('');
  term = signal('');
  disabled = signal(false);
  selected = computed(() => this.options().find((o) => o.id === this.selectedId()));
  display = computed(() => this.selected()?.name ?? this.term());
  matches = computed(() =>
    this.options()
      .filter((o) => searchText(o.name + ' ' + (o.detail ?? '')).includes(searchText(this.term())))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
  private change: (id: string) => void = () => {};
  touched = () => {};
  displayName = (o: SearchOption | null) => o?.name ?? '';
  writeValue(id: string | null) {
    this.selectedId.set(id ?? '');
    this.term.set('');
  }
  registerOnChange(fn: (id: string) => void) {
    this.change = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState(value: boolean) {
    this.disabled.set(value);
  }
  search(value: string) {
    this.term.set(value);
    this.selectedId.set('');
    this.change('');
  }
  choose(value: SearchOption | null) {
    this.selectedId.set(value?.id ?? '');
    this.term.set('');
    this.change(value?.id ?? '');
    this.touched();
  }
}
