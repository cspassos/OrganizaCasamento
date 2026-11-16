import { MatMenuModule } from '@angular/material/menu';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { DatePicker } from '../../shared/components/date-picker';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../core/services/finance';
import { transactionLabels } from '../../core/models/finance';
import { money } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
import { FinanceChart } from '../../shared/components/finance-chart';
@Component({
  selector: 'oc-payments',
  imports: [MatMenuModule, CollectionTable, DatePicker, FormsModule, RouterLink, FinanceChart],
  template: `<div class="dashboard-grid">
      <section class="card form-section">
        <h2>Pagos e pendentes</h2>
        <oc-finance-chart
          [labels]="['Pago líquido', 'Em aberto']"
          [values]="[finance.summary()!.paid, finance.summary()!.open]"
          label="Pagos e pendentes"
        />
      </section>
      <section class="card form-section">
        <h2>Evolução dos pagamentos</h2>
        <oc-finance-chart
          type="bar"
          [labels]="months()"
          [values]="values()"
          label="Pagamentos líquidos por mês"
        />
      </section>
    </div>
    <section class="card form-section">
      <h2>Histórico de operações</h2>
      <p class="muted">
        {{ finance.weddings.active()?.name }} · {{ filtered().length }} operação(ões) neste filtro
      </p>
      <p class="muted">Para registrar ou desfazer uma operação, abra a despesa vinculada.</p>
      <div class="finance-filters">
        @if (from() || to() || showVoided()) {
          <button
            class="button secondary"
            (click)="from.set(''); to.set(''); showVoided.set(false); page.set(0)"
          >
            Limpar filtros
          </button>
        }
        <div class="form-field">
          <label for="paymentFrom">De</label
          ><oc-date-picker
            [iso]="true"
            label="De"
            inputId="paymentFrom"
            [ngModel]="from()"
            (ngModelChange)="from.set($event); page.set(0)"
          />
        </div>
        <div class="form-field">
          <label for="paymentTo">Até</label
          ><oc-date-picker
            [iso]="true"
            label="Até"
            inputId="paymentTo"
            [ngModel]="to()"
            (ngModelChange)="to.set($event); page.set(0)"
          />
        </div>
        <label class="check-label"
          ><input
            type="checkbox"
            [ngModel]="showVoided()"
            (ngModelChange)="showVoided.set($event); page.set(0)"
          />Incluir operações desfeitas</label
        >
      </div>
      <label class="collection-search"
        >Buscar operação, despesa ou forma de pagamento<input
          type="search"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)" /></label
      ><ng-template #rowActions let-t
        ><a
          mat-menu-item
          class="button secondary"
          [routerLink]="['/financeiro/despesas', t.expenseId]"
          >Abrir despesa</a
        ></ng-template
      ><oc-collection-table
        label="Pagamentos"
        [headers]="[
          'Operação',
          'Despesa',
          'Data',
          'Forma de pagamento',
          'Valor',
          'Situação / motivo',
        ]"
        [rows]="tableRows()"
        [actions]="rowActions"
      />
    </section>`,
})
export class PaymentsPage {
  finance = inject(FinanceService);
  query = signal('');
  tableRows = computed(() =>
    this.filtered()
      .filter((t) =>
        searchText(
          this.labels[t.kind] +
            ' ' +
            this.description(t.expenseId) +
            ' ' +
            t.method +
            ' ' +
            t.notes,
        ).includes(searchText(this.query())),
      )
      .map((t) => ({
        id: t.id,
        record: t,
        cells: [
          this.labels[t.kind],
          this.description(t.expenseId) ?? '',
          this.date(t.date),
          t.method,
          this.money(t.amountCents),
          t.voidedAt ? 'Desfeita: ' + t.voidReason : 'Ativa',
        ],
      })),
  );
  from = signal('');
  to = signal('');
  showVoided = signal(false);
  page = signal(0);
  money = money;
  date = formatCalendarDate;
  labels = transactionLabels;
  filtered = computed(() =>
    (this.finance.ledger()?.transactions ?? [])
      .filter(
        (t) =>
          (this.showVoided() || !t.voidedAt) &&
          (!this.from() || t.date >= this.from()) &&
          (!this.to() || t.date <= this.to()),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  visible = computed(() => this.filtered().slice(this.page() * 10, (this.page() + 1) * 10));
  monthly = computed(() => {
    const months = new Map<string, number>();
    for (const t of this.filtered().filter(
      (t) => !t.voidedAt && (t.kind === 'payment' || t.kind === 'refund'),
    ))
      months.set(
        t.date.slice(0, 7),
        (months.get(t.date.slice(0, 7)) ?? 0) +
          (t.kind === 'payment' ? t.amountCents : -t.amountCents),
      );
    return [...months].sort(([a], [b]) => a.localeCompare(b));
  });
  months = computed(() => this.monthly().map(([m]) => m.split('-').reverse().join('/')));
  values = computed(() => this.monthly().map(([, v]) => v));
  description(id: string) {
    return this.finance.ledger()?.expenses.find((e) => e.id === id)?.description;
  }
}
