import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { PeopleService } from '../../core/services/people';
import { Family, Godparent, Guest, guestStatuses, sides } from '../../core/models/people';
import { copyFamilyMember, duplicates, newGuest } from '../../core/utils/people';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { PhoneInput } from '../../shared/directives/phone-input';
import { GuestPicker } from '../../shared/components/guest-picker';
import { SearchPicker } from '../../shared/components/search-picker';
import { validEmail, validPhone } from '../../core/utils/contact';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'oc-person-dialog',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  imports: [ReactiveFormsModule, MatDialogModule, PhoneInput, GuestPicker, SearchPicker],
  templateUrl: './person-dialog.html',
})
export class PersonDialog {
  data = inject<{
    kind: 'guest' | 'family' | 'godparent';
    guest?: Guest;
    family?: Family;
    godparent?: Godparent;
    familyId?: string;
    companionOf?: string;
    copyFrom?: Guest;
    selectedGuestId?: string;
  }>(MAT_DIALOG_DATA);
  store = inject(PeopleService);
  ref = inject(MatDialogRef<PersonDialog>);
  dialogs = inject(MatDialog);
  weddingId = this.store.weddings.active()!.id;
  private fb = inject(FormBuilder);
  source =
    this.data.guest ??
    (this.data.copyFrom ? copyFamilyMember(this.data.copyFrom) : newGuest(this.weddingId));
  id =
    this.data.guest?.id ?? this.data.family?.id ?? this.data.godparent?.id ?? crypto.randomUUID();
  statuses = guestStatuses;
  sides = sides;
  error = signal('');
  saving = signal(false);
  savedCount = signal(0);
  guestForm = this.fb.group({
    name: [this.source.name, [Validators.required, Validators.maxLength(180)]],
    phone: [
      this.source.phone,
      (c: AbstractControl) => (validPhone(c.value ?? '') ? null : { phone: true }),
    ],
    whatsapp: [
      this.source.whatsapp,
      (c: AbstractControl) => (validPhone(c.value ?? '') ? null : { phone: true }),
    ],
    email: [
      this.source.email,
      (c: AbstractControl) => (validEmail(c.value ?? '') ? null : { email: true }),
    ],
    familyId: [this.data.familyId ?? this.source.familyId],
    group: [this.source.group],
    relationship: [this.source.relationship],
    side: [this.source.side],
    child: [this.source.child],
    age: [this.source.age, [Validators.min(0), Validators.max(17)]],
    companionOf: [this.data.companionOf ?? this.source.companionOf],
    diet: [this.source.diet],
    accessibility: [this.source.accessibility],
    table: [this.source.table],
    invitationSent: [this.source.invitationSent],
    sentDate: [this.source.sentDate],
    status: [this.source.status],
    notes: [this.source.notes],
  });
  familyForm = this.fb.nonNullable.group({
    name: [this.data.family?.name ?? '', Validators.required],
    notes: [this.data.family?.notes ?? ''],
  });
  gp = this.data.godparent;
  godparentForm = this.fb.nonNullable.group({
    guestId: [this.gp?.guestId ?? this.data.selectedGuestId ?? '', Validators.required],
    partnerId: [this.gp?.partnerId ?? ''],
    participation: [this.gp?.participation ?? 'Padrinho', Validators.required],
    attireColor: [this.gp?.attireColor ?? ''],
    attireModel: [this.gp?.attireModel ?? ''],
    size: [this.gp?.size ?? ''],
    arrival: [this.gp?.arrival ?? ''],
    responsibilities: [this.gp?.responsibilities ?? ''],
    gift: [this.gp?.gift ?? ''],
    position: [this.gp?.position ?? ''],
    entryOrder: [this.gp?.entryOrder ?? 0, [Validators.min(0), Validators.required]],
    notes: [this.gp?.notes ?? ''],
  });
  get families() {
    return this.store.ledger()?.families ?? [];
  }
  participationTypes = [
    'Padrinho',
    'Madrinha',
    'Debutante',
    'Noivinho',
    'Noivinha',
    'Daminha',
    'Pajem',
    'Florista',
    'Porta-alianças',
    'Testemunha',
    'Celebrante',
  ];
  participationChoice = this.fb.nonNullable.control(
    this.participationTypes.includes(this.godparentForm.controls.participation.value)
      ? this.godparentForm.controls.participation.value
      : '__custom',
  );
  changeParticipation() {
    this.godparentForm.controls.participation.setValue(
      this.participationChoice.value === '__custom' ? '' : this.participationChoice.value,
    );
    this.godparentForm.markAsDirty();
    if (!['Padrinho', 'Madrinha'].includes(this.participationChoice.value))
      this.godparentForm.controls.partnerId.setValue('');
  }
  get guests() {
    return this.store.ledger()?.guests ?? [];
  }
  get hosts() {
    return this.guests.filter((g) => g.id !== this.id && !g.companionOf);
  }
  get candidates() {
    return this.guests.filter(
      (g) => !this.store.ledger()?.godparents.some((p) => p.guestId === g.id && p.id !== this.id),
    );
  }
  get partners() {
    return (
      this.store
        .ledger()
        ?.godparents.filter((p) => p.id !== this.id && (!p.partnerId || p.partnerId === this.id)) ??
      []
    );
  }
  get partnerOptions() {
    return this.partners
      .filter(
        (p) =>
          ['Padrinho', 'Madrinha'].includes(p.participation) ||
          p.id === this.godparentForm.controls.partnerId.value,
      )
      .map((p) => ({ id: p.id, name: this.name(p.guestId), detail: p.participation }));
  }
  get hasOtherGodparents() {
    return this.store.ledger()?.godparents.some((p) => p.id !== this.id) ?? false;
  }
  name(id: string) {
    return this.guests.find((g) => g.id === id)?.name ?? '';
  }
  constructor() {
    this.ref.disableClose = true;
    this.ref.backdropClick().subscribe(() => void this.cancel());
    this.ref.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') void this.cancel();
    });
  }
  hostChanged() {
    const host = this.guests.find((g) => g.id === this.guestForm.controls.companionOf.value);
    if (host) this.guestForm.controls.familyId.setValue(host.familyId);
  }
  async cancel() {
    if (this.saving()) return;
    const dirty =
      this.data.kind === 'guest'
        ? this.guestForm.dirty
        : this.data.kind === 'family'
          ? this.familyForm.dirty
          : this.godparentForm.dirty;
    if (
      dirty &&
      !(await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Descartar alterações?',
              message: 'As alterações deste formulário não foram salvas.',
            },
          })
          .afterClosed(),
      ))
    )
      return;
    this.ref.close(this.savedCount() > 0);
  }
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.guestForm.dirty || this.familyForm.dirty || this.godparentForm.dirty)
      event.preventDefault();
  }
  async save(another = false) {
    const form =
      this.data.kind === 'guest'
        ? this.guestForm
        : this.data.kind === 'family'
          ? this.familyForm
          : this.godparentForm;
    if (form.invalid) {
      form.markAllAsTouched();
      this.error.set('Confira os campos obrigatórios, e-mail e valores informados.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    try {
      if (this.data.kind === 'guest') {
        const guest = {
          ...this.source,
          ...this.guestForm.getRawValue(),
          id: this.id,
          weddingId: this.weddingId,
        } as Guest;
        const found = duplicates(guest, this.guests);
        if (
          found.length &&
          !(await firstValueFrom(
            this.dialogs
              .open(ConfirmDialog, {
                data: {
                  title: 'Possível cadastro duplicado',
                  message: `Nome, telefone ou e-mail coincide com: ${found.map((g) => g.name).join(', ')}. São pessoas diferentes e deseja salvar mesmo assim?`,
                },
              })
              .afterClosed(),
          ))
        )
          return;
        await this.store.saveGuest(guest);
      } else if (this.data.kind === 'family')
        await this.store.saveFamily({
          ...this.familyForm.getRawValue(),
          id: this.id,
          weddingId: this.weddingId,
        });
      else
        await this.store.saveGodparent({
          ...this.godparentForm.getRawValue(),
          id: this.id,
          weddingId: this.weddingId,
        });
      this.savedCount.update((n) => n + 1);
      if (another) {
        const familyId = this.guestForm.controls.familyId.value;
        const side = this.guestForm.controls.side.value;
        this.source = newGuest(this.weddingId);
        this.id = crypto.randomUUID();
        this.guestForm.reset({ ...this.source, familyId, side });
        this.familyForm.reset({ name: '', notes: '' });
        this.godparentForm.controls.guestId.setValue('');
        this.godparentForm.controls.partnerId.setValue('');
        this.godparentForm.markAsPristine();
        this.data = { kind: this.data.kind, familyId: familyId ?? undefined };
        setTimeout(() => {
          const content = document.querySelector('oc-person-dialog mat-dialog-content');
          content?.scrollTo(0, 0);
          (document.querySelector('oc-person-dialog input') as HTMLInputElement | null)?.focus();
        });
      } else this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      this.saving.set(false);
    }
  }
}
