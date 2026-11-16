import { MatMenuModule } from '@angular/material/menu';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../core/services/finance';
import { FinanceCategory } from '../../core/models/finance';
import { expenseBalance, money } from '../../core/utils/finance';
import { CurrencyInput } from '../../shared/directives/currency-input';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { FinanceChart } from '../../shared/components/finance-chart';
import { CollectionTable, searchText } from '../../shared/components/collection-table';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'oc-budget',
  imports: [
    MatMenuModule,
    ReactiveFormsModule,
    FormsModule,
    CurrencyInput,
    FinanceChart,
    CollectionTable,
  ],
  templateUrl: './budget.html',
})
export class BudgetPage {
  finance = inject(FinanceService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  weddingId = this.finance.weddings.active()!.id;
  money = money;
  error = signal('');
  message = signal('');
  editing = signal<string | null>(null);
  page = signal(0);
  query = signal('');
  tableRows = computed(() =>
    this.categories()
      .filter((c) => searchText(c.name).includes(searchText(this.query())))
      .map((c) => ({
        id: c.id,
        record: c,
        cells: [
          c.name,
          money(c.budgetCents),
          money(c.planned),
          money(c.contracted),
          c.contracted > c.budgetCents && c.budgetCents > 0
            ? 'Acima da meta em ' + money(c.contracted - c.budgetCents)
            : 'Dentro da meta',
        ],
      })),
  );
  form = this.fb.nonNullable.group({
    total: [this.finance.summary()!.budget / 100, [Validators.required, Validators.min(0)]],
    reserve: [this.finance.summary()!.reserve / 100, [Validators.required, Validators.min(0)]],
  });
  categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    budget: [0, [Validators.required, Validators.min(0)]],
  });
  categories = computed(() => {
    const l = this.finance.ledger()!;
    return l.categories.map((c) => ({
      ...c,
      contracted: l.expenses
        .filter((e) => e.categoryId === c.id && e.status === 'contracted')
        .reduce((s, e) => s + expenseBalance(l, e).due, 0),
      planned: l.expenses
        .filter((e) => e.categoryId === c.id && e.status !== 'cancelled')
        .reduce((s, e) => s + e.plannedCents, 0),
    }));
  });
  visible = computed(() => this.categories().slice(this.page() * 8, (this.page() + 1) * 8));
  allocated = computed(() => this.categories().reduce((s, c) => s + c.budgetCents, 0));
  chartCategories = computed(() => this.categories().filter((c) => c.contracted > 0));
  chartLabels = computed(() => this.chartCategories().map((c) => c.name));
  chartValues = computed(() => this.chartCategories().map((c) => c.contracted));
  async budget() {
    if (this.form.invalid) {
      this.error.set('Informe valores válidos.');
      return;
    }
    try {
      const v = this.form.getRawValue();
      await this.finance.budget(this.weddingId, v.total, v.reserve);
      this.message.set('Orçamento geral atualizado.');
      this.error.set('');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    }
  }
  edit(c: FinanceCategory) {
    this.editing.set(c.id);
    this.categoryForm.setValue({ name: c.name, budget: c.budgetCents / 100 });
    document.getElementById('categoryName')?.focus();
  }
  cancelEdit() {
    this.editing.set(null);
    this.categoryForm.reset({ name: '', budget: 0 });
  }
  async saveCategory() {
    if (this.categoryForm.invalid) {
      this.error.set('Informe nome e orçamento válidos para a categoria.');
      return;
    }
    try {
      const v = this.categoryForm.getRawValue();
      await this.finance.category(this.weddingId, this.editing(), v.name, v.budget);
      this.cancelEdit();
      this.message.set('Categoria salva.');
      this.error.set('');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  }
  async remove(c: FinanceCategory) {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          width: '440px',
          data: {
            title: 'Excluir categoria?',
            message: `A categoria ${c.name} só pode ser excluída se não estiver vinculada a nenhuma despesa.`,
          },
        })
        .afterClosed(),
    );
    if (ok)
      try {
        await this.finance.removeCategory(this.weddingId, c.id);
        this.page.set(0);
        this.message.set('Categoria excluída.');
      } catch (e) {
        this.error.set(e instanceof Error ? e.message : 'Não foi possível excluir.');
      }
  }
}
