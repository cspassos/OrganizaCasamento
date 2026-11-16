import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
@Component({
  selector: 'oc-notice-dialog',
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content
      ><p style="white-space:pre-line;line-height:1.6">{{ data.message }}</p></mat-dialog-content
    >
    <mat-dialog-actions align="end"
      ><button class="button primary" mat-dialog-close>Entendi</button></mat-dialog-actions
    >
  `,
})
export class NoticeDialog {
  data = inject<{ title: string; message: string }>(MAT_DIALOG_DATA);
}
