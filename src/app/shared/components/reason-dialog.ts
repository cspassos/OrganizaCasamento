import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
@Component({
  selector: 'oc-reason-dialog',
  imports: [FormsModule, MatDialogModule],
  template: `<h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content
      ><p>{{ data.message }}</p>
      <label class="collection-search"
        >Motivo *<textarea
          [(ngModel)]="reason"
          rows="4"
          maxlength="2000"
          autofocus
        ></textarea></label></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button class="button secondary" (click)="ref.close()">Voltar</button
      ><button
        class="button primary"
        [disabled]="!reason.trim()"
        (click)="ref.close(reason.trim())"
      >
        Confirmar cancelamento
      </button></mat-dialog-actions
    >`,
})
export class ReasonDialog {
  data = inject<{ title: string; message: string }>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef);
  reason = '';
}
