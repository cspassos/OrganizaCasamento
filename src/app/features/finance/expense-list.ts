import { MatMenuModule } from '@angular/material/menu';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../core/services/finance';
import { money } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
@Component({
  selector: 'oc-expense-list',
  imports: [MatMenuModule, CollectionTable, RouterLink, FormsModule],
  template: `<p class="muted">
      Guarde preços, organize parcelas e registre o que pagou. Informe quem vai receber aqui mesmo; o contato será salvo junto. O contrato é um anexo opcional.
    </p>
    @if (supplierFilter()) {
      <p class="feedback" role="status">
        Mostrando os gastos deste fornecedor.
        <a routerLink="/financeiro/despesas">Ver todos os gastos</a>
      </p>
    }
    <div class="list-toolbar">
      <label class="search-field"
        >Pesquisar despesa<input
          type="search"
          placeholder="Descrição ou fornecedor"
          [ngModel]="query()"
          (ngModelChange)="query.set($event); page.set(0)" /></label
      ><a
        class="button primary"
        routerLink="/financeiro/despesas/nova"
        [queryParams]="supplierFilter() ? { fornecedor: supplierFilter() } : {}"
        >Adicionar gasto</a
      >
    </div>
    <div class="finance-filters">
      <div class="form-field">
        <label for="expenseCategory">Categoria</label
        ><select
          id="expenseCategory"
          [ngModel]="category()"
          (ngModelChange)="category.set($event); page.set(0)"
        >
          <option value="">Todas</option>
          @for (c of finance.ledger()?.categories; track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
      </div>
      <div class="form-field">
        <label for="expenseStatus">Situação</label
        ><select
          id="expenseStatus"
          [ngModel]="status()"
          (ngModelChange)="status.set($event); page.set(0)"
        >
          <option value="">Todas</option>
          @for (s of statuses; track s) {
            <option>{{ s }}</option>
          }
        </select>
      </div>
    </div>
    @if (message()) {
      <p class="feedback success" role="status">{{ message() }}</p>
    }
    @if (error()) {
      <p class="feedback error" role="alert">{{ error() }}</p>
    }
    <section class="card form-section">
      <div class="section-heading">
        <h2>Despesas</h2>
        <span class="pill">{{ filtered().length }} registros</span>
      </div>
      <ng-template #rowActions let-e
        ><a mat-menu-item class="button secondary" [routerLink]="['/financeiro/despesas', e.id]"
          >Abrir despesa</a
        >
        @if (e.status === 'planned' && !e.contractId && !e.professionalId) {
          <button
            mat-menu-item
            (click)="remove(e.id, e.weddingId, e.description)"
            [disabled]="finance.busy()"
          >
            Excluir pesquisa de preço
          </button>
        }</ng-template
      ><oc-collection-table
        label="Despesas"
        [headers]="[
          'Descrição',
          'Fornecedor',
          'Próximo vencimento',
          'Situação',
          'Valor',
          'Já pago',
          'Falta pagar',
        ]"
        [rows]="tableRows()"
        [actions]="rowActions"
      />
    </section>`,
})
export class ExpenseList {
  finance = inject(FinanceService);
  private params = toSignal(inject(ActivatedRoute).queryParamMap);
  supplierFilter = computed(() => this.params()?.get('fornecedor') ?? '');
  private dialogs = inject(MatDialog);
  message = signal('');
  error = signal('');
  async remove(id: string, weddingId: string, name: string) {
    if (
      !(await firstValueFrom(
        this.dialogs
          .open(ConfirmDialog, {
            data: {
              title: 'Excluir pesquisa de preço?',
              message: `Excluir “${name}”? Esse valor guardado para comparação será removido da lista.`,
            },
          })
          .afterClosed(),
      ))
    )
      return;
    this.error.set('');
    try {
      await this.finance.deletePriceResearch(weddingId, id);
      this.message.set('Pesquisa de preço excluída.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível excluir.');
    }
  }
  tableRows = computed(() =>
    this.filtered().map((e) => ({
      id: e.id,
      record: e,
      tone: e.situation === 'Vencida' ? 'danger' : e.situation === 'Paga' ? 'paid' : '',
      cells: [
        e.description,
        e.supplier,
        e.nextDueDate ? this.date(e.nextDueDate) : '—',
        e.situation,
        this.money(e.status === 'planned' ? e.plannedCents : e.due),
        this.money(e.paid),
        this.money(e.open),
      ],
    })),
  );
  query = signal('');
  category = signal('');
  status = signal('');
  page = signal(0);
  money = money;
  date = formatCalendarDate;
  statuses = ['Planejada', 'Contratada', 'Parcialmente paga', 'Paga', 'Vencida', 'Cancelada'];
  filtered = computed(() =>
    this.finance
      .expenseRows()
      .filter(
        (e) =>
          (!this.supplierFilter() || e.supplierId === this.supplierFilter()) &&
          (!this.category() || e.categoryId === this.category()) &&
          (!this.status() || e.situation === this.status()) &&
          `${e.description} ${e.supplier}`
            .toLocaleLowerCase('pt-BR')
            .includes(this.query().toLocaleLowerCase('pt-BR')),
      )
      .sort((a, b) => (a.nextDueDate ?? '9999').localeCompare(b.nextDueDate ?? '9999')),
  );
  visible = computed(() => this.filtered().slice(this.page() * 10, (this.page() + 1) * 10));
}
