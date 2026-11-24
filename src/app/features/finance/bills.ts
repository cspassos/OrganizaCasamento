import { MatMenuModule } from '@angular/material/menu';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { DatePicker } from '../../shared/components/date-picker';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../core/services/finance';
import { localToday, money } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
@Component({
  selector: 'oc-bills',
  imports: [MatMenuModule, CollectionTable, DatePicker, FormsModule, RouterLink],
  template: `<section class="card form-section">
    <h2>{{ all() ? 'Parcelamentos' : 'Contas a pagar' }}</h2>
    <p class="muted">
      Entrada e parcelas estão separadas. Cada baixa deve ser registrada no detalhe da despesa.
    </p>
    <div class="finance-filters">
      <div class="form-field">
        <label for="billStatus">Filtrar contas</label
        ><select
          id="billStatus"
          [ngModel]="filter()"
          (ngModelChange)="filter.set($event); page.set(0)"
        >
          <option value="open">Em aberto</option>
          <option value="overdue">Vencidas</option>
          <option value="paid">Quitadas</option>
          <option value="all">Todas</option>
        </select>
      </div>
      <div class="form-field">
        <label for="billFrom">Vencimento a partir de</label
        ><oc-date-picker
          [iso]="true"
          label="Vencimento a partir de"
          inputId="billFrom"
          [ngModel]="from()"
          (ngModelChange)="from.set($event); page.set(0)"
        />
      </div>
      <div class="form-field">
        <label for="billTo">Vencimento até</label
        ><oc-date-picker
          [iso]="true"
          label="Vencimento até"
          inputId="billTo"
          [ngModel]="to()"
          (ngModelChange)="to.set($event); page.set(0)"
        />
      </div>
    </div>
    <p class="muted">Saldo das contas filtradas: {{ money(total()) }}</p>
    <label class="collection-search"
      >Buscar despesa ou parcela<input
        type="search"
        [ngModel]="query()"
        (ngModelChange)="query.set($event)" /></label
    ><ng-template #rowActions let-i
      ><a
        mat-menu-item
        class="button secondary"
        [routerLink]="['/financeiro/despesas', i.expenseId]"
        >Abrir despesa</a
      ></ng-template
    ><oc-collection-table
      label="Contas e parcelas"
      [headers]="['Despesa', 'Valor', 'Pago', 'Parcela', 'Vencimento', 'Situação', 'Saldo']"
      [rows]="tableRows()"
      [actions]="rowActions"
    />
  </section>`,
})
export class BillsPage {
  finance = inject(FinanceService);
  query = signal('');
  tableRows = computed(() =>
    this.filtered()
      .filter((i) =>
        searchText(this.description(i.expenseId) + ' ' + i.label).includes(
          searchText(this.query()),
        ),
      )
      .map((i) => ({
        id: i.id,
        record: i,
        tone: i.open > 0 && i.dueDate < this.today ? 'danger' : i.open === 0 ? 'paid' : '',
        cells: [
          this.description(i.expenseId) ?? '',
          this.money(i.due),
          this.money(i.paid),
          i.label,
          this.date(i.dueDate),
          i.open === 0 ? 'Pago' : i.dueDate < this.today ? 'Vencida' : 'Em aberto',
          this.money(i.open),
        ],
      })),
  );
  all = input(false);
  filter = signal('open');
  from = signal('');
  to = signal('');
  page = signal(0);
  get today() {
    return this.finance.today();
  }
  money = money;
  date = formatCalendarDate;
  filtered = computed(() =>
    (this.finance.summary()?.bills ?? [])
      .filter(
        (i) =>
          (this.filter() === 'all' ||
            (this.filter() === 'open' && i.open > 0) ||
            (this.filter() === 'overdue' && i.open > 0 && i.dueDate < this.today) ||
            (this.filter() === 'paid' && i.open === 0)) &&
          (!this.from() || i.dueDate >= this.from()) &&
          (!this.to() || i.dueDate <= this.to()),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  );
  total = computed(() => this.filtered().reduce((s, i) => s + i.open, 0));
  visible = computed(() => this.filtered().slice(this.page() * 10, (this.page() + 1) * 10));
  description(id: string) {
    return this.finance.ledger()?.expenses.find((e) => e.id === id)?.description;
  }
}
