import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  Validator,
  AbstractControl,
} from '@angular/forms';
import { formatPhone, validPhone } from '../../core/utils/contact';
@Directive({
  selector: 'input[ocPhone]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneInput), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => PhoneInput), multi: true },
  ],
  host: { '(input)': 'input()', '(blur)': 'touched()' },
})
export class PhoneInput implements ControlValueAccessor, Validator {
  private element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private change: (value: string) => void = () => {};
  touched = () => {};
  writeValue(value: string | null) {
    this.element.nativeElement.value = formatPhone(value ?? '');
  }
  registerOnChange(fn: (value: string) => void) {
    this.change = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean) {
    this.element.nativeElement.disabled = disabled;
  }
  validate(control: AbstractControl) {
    return validPhone(control.value ?? '') ? null : { phone: true };
  }
  input() {
    const input = this.element.nativeElement,
      raw = input.value,
      cursor = input.selectionStart ?? raw.length;
    const count = raw.slice(0, cursor).replace(/\D/g, '').length;
    const formatted = formatPhone(raw);
    input.value = formatted;
    let position = formatted.length;
    if (cursor < raw.length) {
      let digits = 0;
      position = 0;
      while (position < formatted.length && digits < count) {
        if (/\d/.test(formatted[position])) digits++;
        position++;
      }
    }
    input.setSelectionRange(position, position);
    // Keep invalid pasted letters in the model so validation cannot silently accept them.
    this.change(/[^\d\s()+.-]/.test(raw) ? raw : formatted);
  }
}
