import { inject, signal } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog } from './confirm-dialog';
export abstract class LocalEditorDialog {
  ref = inject(MatDialogRef);
  dialogs = inject(MatDialog);
  saving = signal(false);
  error = signal('');
  savedCount = signal(0);
  abstract dirty(): boolean;
  constructor() {
    this.ref.disableClose = true;
    this.ref.backdropClick().subscribe(() => void this.cancel());
    this.ref.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') void this.cancel();
    });
  }
  async cancel() {
    if (this.saving()) return;
    if (
      this.dirty() &&
      !(await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Descartar alterações?',
              message: 'As alterações do cadastro atual não foram salvas.',
            },
          })
          .afterClosed(),
      ))
    )
      return;
    this.ref.close(this.savedCount() > 0);
  }
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) event.preventDefault();
  }
}
