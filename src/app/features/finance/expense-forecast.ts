import { Component, computed, inject, signal } from '@angular/core';
import { FinanceService } from '../../core/services/finance';
import { money } from '../../core/utils/finance';
import { searchText } from '../../shared/components/collection-table';

@Component({
  selector: 'oc-expense-forecast',
  templateUrl: './expense-forecast.html',
  styleUrl: './expense-forecast.scss',
})
export class ExpenseForecast {
  private finance = inject(FinanceService);
  money = money;
  choosing = signal(false);
  query = signal('');
  limit = signal(10);
  excluded = signal(new Set<string>());
  expenses = computed(() =>
    this.finance
      .expenseRows()
      .filter((expense) => expense.status !== 'cancelled')
      .map((expense) => ({
        ...expense,
        amount: expense.status === 'contracted' ? expense.due : expense.plannedCents,
      })),
  );
  total = computed(() => this.expenses().reduce((sum, expense) => sum + expense.amount, 0));
  selected = computed(() => this.expenses().filter((expense) => !this.excluded().has(expense.id)));
  selectedTotal = computed(() => this.selected().reduce((sum, expense) => sum + expense.amount, 0));
  matches = computed(() => {
    const query = searchText(this.query().trim());
    return this.expenses().filter((expense) =>
      searchText(expense.description + ' ' + expense.supplier).includes(query),
    );
  });
  visible = computed(() => this.matches().slice(0, this.limit()));

  setQuery(query: string) {
    this.query.set(query);
    this.limit.set(10);
  }

  showMore() {
    this.limit.update((limit) => limit + 10);
  }

  select(id: string, selected: boolean) {
    const excluded = new Set(this.excluded());
    if (selected) excluded.delete(id);
    else excluded.add(id);
    this.excluded.set(excluded);
  }

  selectAll(selected: boolean) {
    this.excluded.set(new Set(selected ? [] : this.expenses().map((expense) => expense.id)));
  }
}
