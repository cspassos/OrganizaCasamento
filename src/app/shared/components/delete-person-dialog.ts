import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
@Component({
  selector: 'oc-delete-person-dialog',
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>Excluir pessoa e acompanhantes?</h2>
    <mat-dialog-content>
      <p>{{ data.name }} possui acompanhantes vinculados. Você pode excluir todos juntos.</p>
      <p>
        <strong>Serão excluídos {{ data.companions.length + 1 }} cadastros:</strong>
      </p>
      <ul>
        <li>{{ data.name }}</li>
        @for (person of data.companions; track person.id) {
          <li>{{ person.name }}</li>
        }
      </ul>
      <p>Os outros integrantes da família serão mantidos. Esta exclusão não pode ser desfeita.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button class="button secondary" [mat-dialog-close]="false">Cancelar</button
      ><button class="button primary" [mat-dialog-close]="true">
        Excluir pessoa e acompanhantes
      </button></mat-dialog-actions
    >
  `,
})
export class DeletePersonDialog {
  data = inject<{ name: string; companions: { id: string; name: string }[] }>(MAT_DIALOG_DATA);
}
