import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { InvitationsService } from '../../core/services/invitations';
import { InvitationDesign, invitationStyles, InvitationStyle } from '../../core/models/invitations';
import { newDesign, validateDesign } from '../../core/utils/invitations';
import { InvitationPreview } from '../../shared/components/invitation-preview';
import { DatePicker } from '../../shared/components/date-picker';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import {
  downloadInvitationFile,
  invitationPdf,
  invitationPng,
} from '../../core/utils/invitation-export';
@Component({
  selector: 'oc-invitation-editor',
  imports: [ReactiveFormsModule, RouterLink, InvitationPreview, DatePicker],
  templateUrl: './invitation-editor.html',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class InvitationEditor {
  store = inject(InvitationsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialogs = inject(MatDialog);
  private fb = inject(FormBuilder);
  styles = invitationStyles;
  design = signal<InvitationDesign | null>(null);
  loading = signal(true);
  error = signal('');
  busy = signal(false);
  message = signal(
    this.router.getCurrentNavigation()?.extras.state?.['designSaved']
      ? 'Convite salvo com sucesso.'
      : '',
  );
  private base?: InvitationDesign;
  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    style: ['Clássico' as InvitationStyle],
    font: ['serif' as InvitationDesign['font']],
    bride: ['', Validators.required],
    groom: ['', Validators.required],
    date: [''],
    time: [''],
    venue: [''],
    address: [''],
    reception: [''],
    receptionTime: [''],
    message: [''],
    footer: [''],
    background: ['#fcf9f1'],
    color: ['#31392f'],
    accent: ['#b09252'],
    photo: [''],
  });
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.base) this.design.set({ ...this.base, ...this.form.getRawValue() });
    });
    void this.load();
  }
  private async load() {
    try {
      await Promise.all([this.store.weddings.initialized, this.store.initialized]);
      const w = this.store.weddings.active();
      if (!w)
        throw new Error('Selecione um casamento em Meus casamentos antes de criar o convite.');
      const id = this.route.snapshot.paramMap.get('id');
      const style = this.route.snapshot.queryParamMap.get('estilo');
      this.base = id
        ? this.store.ledger()?.designs.find((d) => d.id === id)
        : newDesign(
            w,
            invitationStyles.includes(style as InvitationStyle)
              ? (style as InvitationStyle)
              : 'Clássico',
          );
      if (!this.base) throw new Error('Convite não encontrado neste casamento.');
      this.form.patchValue(this.base);
      this.design.set({ ...this.base });
      this.form.markAsPristine();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível abrir o convite.');
    } finally {
      this.loading.set(false);
    }
  }
  changeStyle() {
    const w = this.store.weddings.active();
    if (!w) return;
    const palette = newDesign(w, this.form.controls.style.value);
    this.form.patchValue({
      background: palette.background,
      color: palette.color,
      accent: palette.accent,
    });
    this.form.markAsDirty();
  }
  async save() {
    this.error.set('');
    if (!this.design() || this.busy()) return;
    try {
      this.form.markAllAsTouched();
      if (this.form.invalid) throw new Error('Preencha o título e os nomes dos noivos.');
      const snapshot = structuredClone(this.design()!);
      validateDesign(snapshot);
      this.busy.set(true);
      this.form.disable({ emitEvent: false });
      await this.store.saveDesign(snapshot);
      this.form.markAsPristine();
      await this.router.navigate(['/convites/modelos', snapshot.id, 'editar'], {
        replaceUrl: true,
        state: { designSaved: true },
      });
      this.message.set('Convite salvo com sucesso.');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      this.form.enable({ emitEvent: false });
      this.busy.set(false);
    }
  }
  async export(format: 'png' | 'pdf') {
    const d = this.design();
    if (!d || this.busy()) return;
    this.error.set('');
    try {
      validateDesign(d);
      this.busy.set(true);
      downloadInvitationFile(
        format === 'png' ? await invitationPng(d) : await invitationPdf(d),
        'convite.' + format,
      );
      this.message.set('Arquivo preparado para download.');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível exportar o convite.');
    } finally {
      this.busy.set(false);
    }
  }
  async photo(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 2 * 1024 * 1024
      )
        throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 2 MB.');
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = data;
      await image.decode();
      this.form.controls.photo.setValue(data);
      this.form.markAsDirty();
      this.error.set('');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Imagem inválida.');
    }
  }
  useWeddingPhoto() {
    const photo = this.store.weddings.active()?.photo;
    if (photo) {
      this.form.controls.photo.setValue(photo);
      this.form.markAsDirty();
    }
  }
  beforeUnload(e: BeforeUnloadEvent) {
    if (this.form.dirty) e.preventDefault();
  }
  async canLeave() {
    return (
      !this.form.dirty ||
      !!(await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Descartar alterações do convite?',
              message: 'As alterações ainda não salvas serão perdidas.',
            },
          })
          .afterClosed(),
      ))
    );
  }
}
