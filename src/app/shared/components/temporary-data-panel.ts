import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { TemporaryDataService } from '../../core/services/temporary-data';
import { ConfirmDialog } from './confirm-dialog';
import { cloudEnabled } from '../../core/repositories/cloud-backend';
@Component({
  selector: 'oc-temporary-data-panel',
  template: `@if (!cloud) {
    <section class="card form-section" aria-label="Massa temporária de teste">
      <h2>Massa de teste — temporário</h2>
      <p class="muted">
        Casamento fictício com orçamento, despesas, parcelas pagas e vencidas, pagamentos,
        descontos, juros, devolução e histórico. Até a etapa 03, sem preencher Pessoas.
      </p>
      <p>Os testes ficam em um casamento separado. Seus outros casamentos são preservados.</p>
      @if (store.error()) {
        <p class="feedback error" role="alert">{{ store.error() }}</p>
      }
      @if (message()) {
        <p class="feedback success" role="status">{{ message() }}</p>
      }
      <div class="people-actions">
        @if (store.marker()) {
          <button class="button primary" (click)="select()" [disabled]="store.busy()">
            Usar massa de teste</button
          ><button class="button secondary" (click)="remove()" [disabled]="store.busy()">
            Remover massa de teste
          </button>
        } @else {
          <button
            class="button primary"
            (click)="create()"
            [disabled]="store.busy() || !store.ready()"
          >
            {{ store.busy() ? 'Criando…' : 'Criar massa de teste' }}
          </button>
        }
      </div>
    </section>
  }`,
})
export class TemporaryDataPanel {
  cloud = cloudEnabled;
  store = inject(TemporaryDataService);
  private dialog = inject(MatDialog);
  message = signal('');
  async create() {
    this.message.set('');
    try {
      await this.store.create();
      this.message.set('Massa criada e selecionada. Abra Financeiro para testar.');
    } catch {}
  }
  async select() {
    try {
      await this.store.select();
      this.message.set('Casamento de teste selecionado.');
    } catch {
      this.message.set('Atualize a página e tente novamente.');
    }
  }
  async remove() {
    if (
      !(await firstValueFrom(
        this.dialog
          .open(ConfirmDialog, {
            data: {
              title: 'Remover massa de teste?',
              message:
                'O casamento fictício e todos os dados que você adicionou nele serão excluídos, inclusive convidados de teste. Os demais casamentos serão preservados. Você pode criar a massa novamente depois.',
            },
          })
          .afterClosed(),
      ))
    )
      return;
    this.message.set('');
    try {
      await this.store.remove();
      this.message.set('Massa removida. Os demais casamentos foram preservados.');
    } catch {}
  }
}
