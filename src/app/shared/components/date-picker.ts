import { Component, forwardRef, Injectable, signal, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerIntl, MatDatepickerModule } from '@angular/material/datepicker';
import { formatCalendarDate, parseDisplayDate, isCalendarDate } from '../../core/utils/wedding';
const inputFormat = { day: '2-digit', month: '2-digit', year: 'numeric' };
function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
@Injectable()
class BrazilianDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return null;
    const iso = parseDisplayDate(value);
    if (!iso) return value ? this.invalid() : null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  override format(date: Date, format: object): string {
    if (format === inputFormat) return formatCalendarDate(toIso(date));
    return super.format(date, format);
  }
}
function portugueseLabels() {
  const labels = new MatDatepickerIntl();
  Object.assign(labels, {
    openCalendarLabel: 'Abrir calendário',
    closeCalendarLabel: 'Fechar calendário',
    prevMonthLabel: 'Mês anterior',
    nextMonthLabel: 'Próximo mês',
    prevYearLabel: 'Ano anterior',
    nextYearLabel: 'Próximo ano',
    prevMultiYearLabel: 'Anos anteriores',
    nextMultiYearLabel: 'Próximos anos',
    switchToMonthViewLabel: 'Escolher data',
    switchToMultiYearViewLabel: 'Escolher mês e ano',
    calendarLabel: 'Calendário do casamento',
  });
  return labels;
}
@Component({
  selector: 'oc-date-picker',
  imports: [MatDatepickerModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePicker), multi: true },
    { provide: DateAdapter, useClass: BrazilianDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: MatDatepickerIntl, useFactory: portugueseLabels },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: { dateInput: inputFormat },
        display: {
          dateInput: inputFormat,
          monthYearLabel: { year: 'numeric', month: 'long' },
          dateA11yLabel: inputFormat,
          monthYearA11yLabel: { year: 'numeric', month: 'long' },
        },
      },
    },
  ],
  template: `<div class="date-picker-field">
    <input
      [id]="inputId()"
      [attr.aria-label]="label()"
      placeholder="DD/MM/AAAA"
      [matDatepicker]="calendar"
      [value]="value()"
      [min]="min"
      [max]="max"
      [disabled]="disabled()"
      (click)="calendar.open()"
      (dateInput)="change($event.value, $any($event.targetElement).value)"
      (blur)="touched()"
    /><mat-datepicker-toggle [for]="calendar" [disabled]="disabled()" /><mat-datepicker
      #calendar
      (closed)="touched()"
    />
  </div>`,
})
export class DatePicker implements ControlValueAccessor {
  inputId = input('date');
  label = input('Data do casamento');
  iso = input(false);
  value = signal<Date | null>(null);
  disabled = signal(false);
  min = new Date(1900, 0, 1);
  max = new Date(2200, 11, 31);
  private changed: (value: string) => void = () => {};
  touched: () => void = () => {};
  writeValue(value: string) {
    const iso = this.iso()
      ? isCalendarDate(value ?? '')
        ? value
        : ''
      : parseDisplayDate(value ?? '');
    if (iso) {
      const [y, m, d] = iso.split('-').map(Number);
      this.value.set(new Date(y, m - 1, d));
    } else this.value.set(null);
  }
  registerOnChange(fn: (value: string) => void) {
    this.changed = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState(value: boolean) {
    this.disabled.set(value);
  }
  change(date: Date | null, raw: string) {
    this.changed(
      date && !isNaN(date.getTime())
        ? this.iso()
          ? toIso(date)
          : formatCalendarDate(toIso(date))
        : raw,
    );
  }
}
