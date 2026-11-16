import { Component, input, output, signal } from '@angular/core';
import { LocalAttachment } from '../../core/models/finance';
import { Icon } from './icon';
@Component({
  selector: 'oc-attachment',
  imports: [Icon],
  template: `<div class="attachment-control">
    <div class="attachment-picker">
      <span class="attachment-icon"><oc-icon name="upload_file" /></span>
      <div class="attachment-description">
        <strong>{{ value() ? 'Arquivo anexado' : 'Adicionar documento' }}</strong
        ><small>PDF, JPG, PNG ou WebP · até 1 MB</small>
      </div>
      <label class="button secondary attachment-upload"
        ><oc-icon name="attach_file" />{{ value() ? 'Trocar arquivo' : 'Escolher arquivo'
        }}<input
          class="visually-hidden-file"
          aria-label="Anexar PDF ou imagem (até 1 MB)"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          (change)="read($event)"
      /></label>
    </div>
    @if (value()) {
      <div class="attachment-file">
        <oc-icon name="description" /><span>{{ value()!.name }}</span>
        <button type="button" class="button secondary" (click)="changed.emit(undefined)">
          Remover anexo
        </button>
      </div>
    }
    @if (error()) {
      <small class="field-error" role="alert">{{ error() }}</small>
    }
  </div>`,
})
export class AttachmentInput {
  value = input<LocalAttachment>();
  changed = output<LocalAttachment | undefined>();
  error = signal('');
  async read(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (
      file.size > 1024 * 1024 ||
      !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      this.error.set('Escolha um PDF ou imagem de até 1 MB.');
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject();
        r.readAsDataURL(file);
      });
      this.changed.emit({ name: file.name, type: file.type, data });
      this.error.set('');
    } catch {
      this.error.set('Não foi possível ler o arquivo.');
    }
  }
}
export function downloadAttachment(file: LocalAttachment) {
  const a = document.createElement('a');
  a.href = file.data;
  a.download = file.name;
  a.click();
}
