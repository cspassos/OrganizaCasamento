import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'oc-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content><mat-dialog-actions align="end"
      ><button mat-button [mat-dialog-close]="false">Cancelar</button
      ><button mat-flat-button [class.destructive]="data.danger" [mat-dialog-close]="true">
        {{ data.confirmLabel || 'Confirmar' }}
      </button></mat-dialog-actions
    >`,
})
export class ConfirmDialog {
  data = inject<{ title: string; message: string; confirmLabel?: string; danger?: boolean }>(
    MAT_DIALOG_DATA,
  );
}
