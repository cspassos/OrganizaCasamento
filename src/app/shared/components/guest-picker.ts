import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Family, Guest } from '../../core/models/people';
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
@Component({
  selector: 'oc-guest-picker',
  imports: [MatAutocompleteModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => GuestPicker), multi: true },
  ],
  template: `
    <label [for]="inputId">Pessoa da lista de convidados *</label>
    <input
      [id]="inputId"
      type="text"
      autocomplete="off"
      placeholder="Buscar por nome, telefone ou família"
      [value]="displayValue()"
      [disabled]="disabled()"
      [matAutocomplete]="options"
      (input)="search($any($event.target).value)"
      (blur)="touched()"
      [attr.aria-describedby]="inputId + '-help'"
    />
    <small [id]="inputId + '-help'">{{
      selected()
        ? description(selected()!)
        : 'Digite para buscar e selecione a pessoa nos resultados.'
    }}</small>
    <mat-autocomplete
      #options="matAutocomplete"
      [displayWith]="displayName"
      (optionSelected)="choose($event.option.value)"
    >
      @for (guest of matches().slice(0, 30); track guest.id) {
        <mat-option [value]="guest"
          ><span class="guest-picker-name">{{ guest.name }}</span
          ><small class="guest-picker-detail">{{ description(guest) }}</small></mat-option
        >
      } @empty {
        <mat-option disabled>Nenhum convidado encontrado.</mat-option>
      }
      @if (matches().length > 30) {
        <mat-option disabled
          >Mostrando 30 de {{ matches().length }} pessoas. Digite mais para refinar.</mat-option
        >
      }
    </mat-autocomplete>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    :host small {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.5;
    }
  `,
})
export class GuestPicker implements ControlValueAccessor {
  guests = input<Guest[]>([]);
  families = input<Family[]>([]);
  inputId = 'guest-picker-' + crypto.randomUUID();
  selectedId = signal('');
  term = signal('');
  disabled = signal(false);
  selected = computed(() => this.guests().find((g) => g.id === this.selectedId()));
  displayValue = computed(() => this.selected()?.name ?? this.term());
  matches = computed(() => {
    const term = normalize(this.term()),
      digits = term.replace(/\D/g, '');
    return this.guests()
      .filter(
        (g) =>
          !term ||
          normalize(g.name + ' ' + g.phone + ' ' + g.whatsapp + ' ' + this.familyName(g)).includes(
            term,
          ) ||
          (/^[\d\s()+.-]+$/.test(term) &&
            digits.length > 0 &&
            (g.phone + ' ' + g.whatsapp).replace(/\D/g, '').includes(digits)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });
  private change: (id: string) => void = () => {};
  touched = () => {};
  displayName = (guest: Guest | null) => guest?.name ?? '';
  familyName(g: Guest) {
    return this.families().find((f) => f.id === g.familyId)?.name ?? 'Individual';
  }
  description(g: Guest) {
    return [this.familyName(g), g.phone || g.whatsapp || 'Sem telefone', g.side].join(' · ');
  }
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
  choose(guest: Guest) {
    this.selectedId.set(guest.id);
    this.term.set('');
    this.change(guest.id);
    this.touched();
  }
}
