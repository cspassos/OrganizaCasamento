import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GiftItem, GiftSite, giftQuantities } from '../../core/models/gifts';
import { GiftsService } from '../../core/services/gifts';
import { LocalEditorDialog } from '../../shared/components/local-editor-dialog';
import { CurrencyInput } from '../../shared/directives/currency-input';

@Component({
  imports: [MatDialogModule, ReactiveFormsModule, CurrencyInput],
  template: `<h2 mat-dialog-title>
      {{
        data.kind === 'settings'
          ? 'Personalizar lista'
          : data.kind === 'site'
            ? 'Vincular lista de loja'
            : data.item
              ? 'Editar presente'
              : 'Adicionar presente'
      }}
    </h2>
    <mat-dialog-content>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      @if (data.kind === 'site') {
        <p>
          Já criou uma lista em uma loja? Cole o endereço público que a loja forneceu. Ele aparecerá
          junto dos presentes.
        </p>
      }
      <form id="gift-form" class="form-grid" [formGroup]="form" (ngSubmit)="save()">
        <label class="form-field full"
          >{{
            data.kind === 'settings'
              ? 'Título da lista *'
              : data.kind === 'site'
                ? 'Nome da loja ou lista *'
                : 'Nome do presente *'
          }}
          <input
            formControlName="name"
            [attr.maxlength]="data.kind === 'settings' ? 100 : 150"
            [placeholder]="
              data.kind === 'site' ? 'Ex.: Nossa lista na loja' : 'Ex.: Jogo de panelas'
            "
        /></label>
        @if (data.kind !== 'site') {
          <label class="form-field full"
            >{{ data.kind === 'settings' ? 'Mensagem para os convidados' : 'Descrição (opcional)'
            }}<textarea
              formControlName="description"
              [attr.maxlength]="data.kind === 'settings' ? 1200 : 1500"
              rows="3"
              placeholder="Escreva uma mensagem ou os detalhes que ajudam na escolha."
            ></textarea>
          </label>
        }
        @if (data.kind !== 'settings') {
          <label class="form-field full"
            >{{ data.kind === 'site' ? 'Link público da lista *' : 'Link para comprar (opcional)'
            }}<input
              formControlName="url"
              type="url"
              maxlength="2000"
              placeholder="https://loja.com.br/..."
          /></label>
        }
        @if (data.kind === 'item') {
          <label class="form-field"
            >Quantidade que queremos
            <input
              aria-label="Quantidade que queremos"
              type="number"
              min="1"
              max="9999"
              step="1"
              formControlName="quantity"
            />
          </label>
          <label class="form-field"
            >Quantidade já recebida
            <input
              aria-label="Quantidade já recebida"
              type="number"
              min="0"
              max="9999"
              step="1"
              formControlName="receivedQuantity"
            />
          </label>
          <small class="muted full"
            >Ex.: queremos 6 toalhas e já recebemos 2. Ainda faltam 4. Você pode atualizar
            depois.</small
          >
          <label class="form-field full"
            >Preço aproximado (opcional)<input
              aria-label="Preço aproximado (opcional)"
              ocCurrency
              formControlName="price"
            /><small class="muted"
              >Valor por unidade. Deixe zero se não quiser mostrar o preço.</small
            ></label
          >
          <div class="full gift-photo-control">
            @if (photo()) {
              <img [src]="photo()" alt="Foto do presente" />
            }
            <label class="button secondary"
              >{{ photo() ? 'Trocar foto' : 'Escolher foto'
              }}<input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Foto do presente"
                (change)="choosePhoto($event)"
                [disabled]="photoBusy() || saving()"
            /></label>
            @if (photo()) {
              <button
                type="button"
                class="button secondary"
                (click)="photo.set(''); form.markAsDirty()"
              >
                Remover foto
              </button>
            }
            <small class="muted">JPG, PNG ou WebP, até 2 MB.</small>
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button class="button secondary" (click)="cancel()" [disabled]="saving() || photoBusy()">
        Cancelar</button
      ><button
        class="button primary"
        type="submit"
        form="gift-form"
        [disabled]="saving() || photoBusy()"
      >
        {{ saving() ? 'Salvando…' : 'Salvar' }}
      </button></mat-dialog-actions
    >`,
  styles: `
    .form-grid {
      margin-top: 16px;
    }
    .full {
      grid-column: 1/-1;
    }
    .gift-photo-control {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .gift-photo-control img {
      width: 96px;
      height: 96px;
      object-fit: contain;
      border-radius: 8px;
      background: var(--bg);
    }
    .gift-photo-control label {
      position: relative;
      overflow: hidden;
    }
    .gift-photo-control input {
      position: absolute;
      opacity: 0;
      inset: 0;
      cursor: pointer;
    }
  `,
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class GiftDialog extends LocalEditorDialog {
  data = inject<{ kind: 'item' | 'site' | 'settings'; item?: GiftItem; site?: GiftSite }>(
    MAT_DIALOG_DATA,
  );
  store = inject(GiftsService);
  weddingId = this.store.weddings.active()!.id;
  private fb = inject(FormBuilder);
  photo = signal(this.data.item?.photo ?? '');
  photoBusy = signal(false);
  form = this.fb.nonNullable.group({
    name: [
      this.data.kind === 'settings'
        ? this.store.list()!.title
        : (this.data.item?.name ?? this.data.site?.name ?? ''),
      [
        Validators.required,
        Validators.maxLength(this.data.kind === 'settings' ? 100 : 150),
        Validators.pattern(/\S/),
      ],
    ],
    description: [
      this.data.kind === 'settings'
        ? this.store.list()!.message
        : (this.data.item?.description ?? ''),
      Validators.maxLength(this.data.kind === 'settings' ? 1200 : 1500),
    ],
    url: [
      this.data.item?.url ?? this.data.site?.url ?? '',
      this.data.kind === 'site'
        ? [Validators.required, Validators.maxLength(2000)]
        : [Validators.maxLength(2000)],
    ],
    price: [
      (this.data.item?.priceCents ?? 0) / 100,
      [Validators.min(0), Validators.max(999999999.99)],
    ],
    quantity: [
      this.data.item ? giftQuantities(this.data.item).quantity : 1,
      [Validators.required, Validators.min(1), Validators.max(9999), Validators.pattern(/^\d+$/)],
    ],
    receivedQuantity: [
      this.data.item ? giftQuantities(this.data.item).received : 0,
      [Validators.required, Validators.min(0), Validators.max(9999), Validators.pattern(/^\d+$/)],
    ],
  });
  dirty() {
    return this.form.dirty;
  }
  async choosePhoto(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      this.error.set('Escolha uma foto JPG, PNG ou WebP de até 2 MB.');
      return;
    }
    this.photoBusy.set(true);
    let url = '';
    try {
      url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await img.decode();
      if (img.naturalWidth > 12000 || img.naturalHeight > 12000) throw new Error();
      const scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.8);
      if (data.length > 700000) throw new Error();
      this.photo.set(data);
      this.form.markAsDirty();
      this.error.set('');
    } catch {
      this.error.set('Não foi possível abrir esta foto. Escolha outra imagem.');
    } finally {
      if (url) URL.revokeObjectURL(url);
      this.photoBusy.set(false);
    }
  }
  async save() {
    if (this.saving() || this.photoBusy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Confira o nome, o link e os valores informados.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    try {
      if (this.data.kind === 'settings')
        await this.store.configure(this.weddingId, v.name, v.description);
      else if (this.data.kind === 'site')
        await this.store.saveSite(this.weddingId, {
          id: this.data.site?.id ?? crypto.randomUUID(),
          name: v.name,
          url: v.url,
        });
      else
        await this.store.saveItem(this.weddingId, {
          id: this.data.item?.id ?? crypto.randomUUID(),
          name: v.name,
          description: v.description,
          url: v.url,
          priceCents: v.price ? Math.round(v.price * 100) : null,
          photo: this.photo(),
          received: this.data.item?.received ?? false,
          quantity: v.quantity,
          receivedQuantity: v.receivedQuantity,
        });
      this.form.markAsPristine();
      this.ref.close(true);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
