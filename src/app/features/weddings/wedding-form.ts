import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WeddingsService } from '../../core/services/weddings';
import { formatCalendarDate, parseDisplayDate } from '../../core/utils/wedding';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { DatePicker } from '../../shared/components/date-picker';
import { CurrencyInput } from '../../shared/directives/currency-input';

const optionalDate = (c: AbstractControl) =>
  !c.value || parseDisplayDate(c.value) ? null : { date: true };
const requiredName = [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)];
const countValidators = [
  Validators.required,
  Validators.min(0),
  Validators.max(100000),
  Validators.pattern(/^\d+$/),
];

interface FormSection {
  title: string;
  description: string;
  fields: { key: string; label: string; type: string; required?: boolean; list?: string }[];
}
@Component({
  selector: 'oc-wedding-form',
  imports: [ReactiveFormsModule, RouterLink, DatePicker, CurrencyInput],
  templateUrl: './wedding-form.html',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class WeddingForm {
  store = inject(WeddingsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  id = this.route.snapshot.paramMap.get('id');
  private draftId = this.id ?? crypto.randomUUID();
  loading = signal(true);
  saving = signal(false);
  photoLoading = signal(false);
  error = signal('');
  missing = signal(false);
  photo = signal('');
  palette = signal<string[]>([]);
  paletteOpen = signal(false);
  clearPalette() {
    this.palette.set([]);
    this.paletteOpen.set(false);
    this.form.controls.colors.setValue('');
    this.form.markAsDirty();
  }
  ceremonyTypes = ['Civil', 'Religiosa', 'Simbólica', 'Personalizada'];
  form = this.fb.nonNullable.group({
    name: ['', requiredName],
    brideName: ['', requiredName],
    groomName: ['', requiredName],
    date: ['', optionalDate],
    ceremonyTime: [''],
    receptionTime: [''],
    ceremonyType: ['Simbólica', Validators.maxLength(100)],
    ceremonyDescription: ['', Validators.maxLength(200)],
    style: ['', Validators.maxLength(120)],
    theme: ['', Validators.maxLength(120)],
    colors: ['', Validators.maxLength(200)],
    initialBudget: [0, [Validators.required, Validators.min(0), Validators.max(999999999.99)]],
    estimatedGuests: [0, countValidators],
    capacity: [0, countValidators],
    city: ['', Validators.maxLength(120)],
    state: ['', Validators.pattern(/^[A-Z]{2}$|^$/)],
    ceremonyVenue: ['', Validators.maxLength(200)],
    ceremonyAddress: ['', Validators.maxLength(500)],
    receptionVenue: ['', Validators.maxLength(200)],
    receptionAddress: ['', Validators.maxLength(500)],
    notes: ['', Validators.maxLength(4000)],
  });
  states = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ];
  sections: FormSection[] = [
    {
      title: 'A história de vocês',
      description: 'Os campos com * são obrigatórios.',
      fields: [
        { key: 'name', label: 'Nome do casamento', type: 'text', required: true },
        { key: 'brideName', label: 'Nome completo da noiva', type: 'text', required: true },
        { key: 'groomName', label: 'Nome completo do noivo', type: 'text', required: true },
      ],
    },
    {
      title: 'O grande dia',
      description: 'A data pode ficar em branco enquanto vocês decidem.',
      fields: [
        { key: 'date', label: 'Data do casamento', type: 'date' },
        { key: 'ceremonyTime', label: 'Horário da cerimônia', type: 'time' },
      ],
    },
    {
      title: 'Orçamento e convidados',
      description:
        'Quanto vocês pretendem gastar e quantas pessoas esperam receber. Pode começar com uma estimativa.',
      fields: [
        { key: 'initialBudget', label: 'Orçamento inicial (R$)', type: 'number', required: true },
        {
          key: 'estimatedGuests',
          label: 'Estimativa de convidados',
          type: 'number',
          required: true,
        },
      ],
    },
    {
      title: 'Onde vamos celebrar',
      description: 'Cerimônia e recepção podem acontecer em locais diferentes.',
      fields: [
        { key: 'city', label: 'Cidade', type: 'text' },
        { key: 'ceremonyVenue', label: 'Local da cerimônia', type: 'text' },
        { key: 'receptionVenue', label: 'Local da recepção', type: 'text' },
      ],
    },
  ];
  constructor() {
    void this.load();
  }
  private async load() {
    await this.store.initialized;
    if (this.id) {
      const wedding = this.store.find(this.id);
      if (!wedding || wedding.archived) this.missing.set(true);
      else {
        // Patch only known controls to retain defaults for records from previous versions.
        for (const key of Object.keys(this.form.controls)) {
          const value = wedding[key as keyof typeof wedding];
          if (value !== undefined)
            this.form
              .get(key)
              ?.setValue(
                (key === 'date' && value ? formatCalendarDate(String(value)) : value) as never,
              );
        }
        this.photo.set(wedding.photo ?? '');
        this.palette.set([...(wedding.colorPalette ?? [])]);
      }
    }
    this.loading.set(false);
  }
  invalid(key: string) {
    const c = this.form.get(key);
    return !!c && c.invalid && c.touched;
  }
  addColor(value: string) {
    if (this.palette().length >= 8 || this.palette().includes(value)) return;
    this.palette.update((colors) => [...colors, value]);
    this.form.markAsDirty();
  }
  changeColor(index: number, value: string) {
    this.palette.update((colors) => colors.map((color, i) => (i === index ? value : color)));
    this.form.markAsDirty();
  }
  removeColor(index: number) {
    this.palette.update((colors) => colors.filter((_, i) => i !== index));
    this.form.markAsDirty();
  }
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.form.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  async canLeave(): Promise<boolean> {
    if (!this.form.dirty) return true;
    if (this.saving()) return false;
    return !!(await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          width: '440px',
          data: {
            title: 'Descartar alterações?',
            message: 'As alterações ainda não foram salvas. Deseja sair desta página?',
          },
        })
        .afterClosed(),
    ));
  }
  async choosePhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      this.error.set('Selecione uma foto JPG, PNG ou WebP de até 2 MB.');
      return;
    }
    this.photoLoading.set(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = data;
      await image.decode();
      if (image.naturalWidth > 12000 || image.naturalHeight > 12000) throw new Error();
      this.photo.set(data);
      this.form.markAsDirty();
      this.error.set('');
    } catch {
      this.error.set('Não foi possível abrir a imagem. Escolha outra foto.');
    } finally {
      this.photoLoading.set(false);
    }
  }
  removePhoto() {
    this.photo.set('');
    this.form.markAsDirty();
  }
  async save() {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid) {
      this.error.set('Revise os campos destacados antes de salvar.');
      return;
    }
    if (this.saving() || this.photoLoading() || this.store.error()) return;
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      await this.store.save({
        ...value,
        date: parseDisplayDate(value.date),
        estimatedGuests: Number(value.estimatedGuests),
        capacity: Number(value.capacity),
        initialBudget: Math.round(value.initialBudget * 100) / 100,
        id: this.draftId,
        demo: false,
        photo: this.photo(),
        colorPalette: this.palette(),
      });
      this.form.markAsPristine();
      await this.router.navigate(['/dashboard'], { state: { weddingSaved: true } });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      this.saving.set(false);
    }
  }
}
