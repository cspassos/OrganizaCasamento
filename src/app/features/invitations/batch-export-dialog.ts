import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InvitationDesign } from '../../core/models/invitations';
import {
  downloadInvitationFile,
  invitationPdf,
  invitationPng,
} from '../../core/utils/invitation-export';

@Component({
  selector: 'oc-batch-export-dialog',
  imports: [MatDialogModule],
  template: `<h2 mat-dialog-title>Baixar convites selecionados</h2>
    <mat-dialog-content>
      <p>
        {{ data.items.length }} arquivos personalizados serão reunidos em um único ZIP. Extraía a
        pasta para anexar cada convite à conversa correspondente.
      </p>
      <p role="status">{{ progress() }} de {{ data.items.length }} preparados</p>
      <progress
        [value]="progress()"
        [max]="data.items.length"
        aria-label="Progresso dos convites"
      ></progress>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      @if (file()) {
        <p class="feedback success">Arquivos prontos. Baixar não registra envio.</p>
      }</mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button class="button secondary" (click)="cancel()">
        {{ file() ? 'Fechar' : 'Cancelar' }}
      </button>
      @if (file()) {
        <button class="button primary" (click)="download()">Baixar ZIP</button>
      } @else {
        <button class="button primary" (click)="prepare()" [disabled]="working()">
          {{ working() ? 'Preparando…' : 'Preparar ZIP' }}
        </button>
      }
    </mat-dialog-actions>`,
})
export class BatchExportDialog {
  data = inject<{ items: { design: InvitationDesign; label: string }[]; format: 'png' | 'pdf' }>(
    MAT_DIALOG_DATA,
  );
  ref = inject(MatDialogRef<BatchExportDialog>);
  progress = signal(0);
  working = signal(false);
  error = signal('');
  file = signal<Blob | null>(null);
  private cancelled = false;
  constructor() {
    this.ref.disableClose = true;
    this.ref.backdropClick().subscribe(() => this.cancel());
    this.ref.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') this.cancel();
    });
  }
  cancel() {
    this.cancelled = true;
    this.ref.close();
  }
  async prepare() {
    this.working.set(true);
    this.error.set('');
    this.progress.set(0);
    try {
      const { zipSync } = await import('fflate');
      const files: Record<string, Uint8Array> = {};
      for (const [index, item] of this.data.items.entries()) {
        if (this.cancelled) return;
        const blob =
          this.data.format === 'png'
            ? await invitationPng(item.design, item.label)
            : await invitationPdf(item.design, item.label);
        files[
          `${String(index + 1).padStart(3, '0')}-${item.label.replace(/[^\p{L}\p{N} -]/gu, '').slice(0, 80) || 'convite'}.${this.data.format}`
        ] = new Uint8Array(await blob.arrayBuffer());
        this.progress.set(index + 1);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (!this.cancelled)
        this.file.set(
          new Blob([zipSync(files, { level: 0 }).buffer as ArrayBuffer], {
            type: 'application/zip',
          }),
        );
    } catch (e) {
      this.error.set(
        e instanceof Error
          ? e.message
          : 'Não foi possível preparar os arquivos. Tente uma seleção menor.',
      );
    } finally {
      this.working.set(false);
    }
  }
  download() {
    if (this.file()) downloadInvitationFile(this.file()!, `convites-${this.data.format}.zip`);
  }
}
