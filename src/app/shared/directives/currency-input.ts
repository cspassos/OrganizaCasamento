import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  Validator,
} from '@angular/forms';

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function parseReais(raw: string): number | null {
  let value = raw
    .trim()
    .replace(/^R\$\s*/, '')
    .replace(/[\s\u00a0]/g, '');
  if (!value) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value))
    value = value.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d+(,\d{1,2})?$/.test(value)) value = value.replace(',', '.');
  else if (!/^-?\d+\.\d{1,2}$/.test(value)) return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

@Directive({
  selector: 'input[ocCurrency]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CurrencyInput), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => CurrencyInput), multi: true },
  ],
  host: {
    inputmode: 'decimal',
    '(beforeinput)': 'beforeInput($event)',
    '(input)': 'input()',
    '(focus)': 'focus()',
    '(blur)': 'blur()',
  },
})
export class CurrencyInput implements ControlValueAccessor, Validator {
  private element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private changed: (value: number | null) => void = () => {};
  private touched: () => void = () => {};
  writeValue(value: number | null) {
    this.element.nativeElement.value =
      value !== null && Number.isFinite(value) ? reais.format(value) : '';
  }
  registerOnChange(fn: (value: number | null) => void) {
    this.changed = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean) {
    this.element.nativeElement.disabled = disabled;
  }
  validate(_: AbstractControl) {
    return Number.isNaN(parseReais(this.element.nativeElement.value)) ? { currency: true } : null;
  }
  input() {
    const input = this.element.nativeElement;
    const raw = input.value;
    const cursor = input.selectionStart ?? raw.length;
    const comma = raw.indexOf(',');
    const fractional = comma >= 0 && cursor > comma;
    const digitsBefore = (raw.slice(0, cursor).match(/\d/g) ?? []).length;
    const value = parseReais(raw.startsWith('R$') && comma >= 0 ? raw.replace(/\./g, '') : raw);
    if (value !== null && Number.isFinite(value)) {
      input.value = reais.format(value);
      let next = input.value.indexOf(',');
      if (fractional) next += Math.min(2, cursor - comma - 1) + 1;
      else {
        let digits = 0;
        for (let i = 0; i < input.value.indexOf(','); i++)
          if (/\d/.test(input.value[i]) && ++digits === digitsBefore) {
            next = i + 1;
            break;
          }
      }
      input.setSelectionRange(next, next);
    }
    this.changed(value);
  }
  beforeInput(event: InputEvent) {
    if (event.inputType !== 'insertText' || !event.data || event.data.length !== 1) return;
    const input = this.element.nativeElement,
      comma = input.value.indexOf(',');
    if (comma < 0) return;
    if (event.data === ',' || event.data === '.') {
      event.preventDefault();
      input.setSelectionRange(comma + 1, input.value.length);
    } else if (
      /\d/.test(event.data) &&
      (input.selectionStart ?? 0) > comma &&
      input.selectionStart === input.selectionEnd
    ) {
      const start = input.selectionStart!;
      if (start >= input.value.length) {
        event.preventDefault();
        return;
      }
      input.setSelectionRange(start, start + 1);
    }
  }
  focus() {
    this.element.nativeElement.select();
  }
  blur() {
    const value = parseReais(this.element.nativeElement.value);
    if (value !== null && Number.isFinite(value))
      this.element.nativeElement.value = reais.format(value);
    this.touched();
  }
}
