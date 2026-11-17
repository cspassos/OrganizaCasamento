import { cloudEnabled } from '../../core/repositories/cloud-backend';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FinanceService } from '../../core/services/finance';
import { money, localToday } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
import { BudgetPage } from './budget';
import { ExpenseList } from './expense-list';
import { BillsPage } from './bills';
import { FinanceReports } from './reports';
import { PaymentsPage } from './payments';
import { SuppliersPage } from '../suppliers/suppliers-page';
@Component({
  selector: 'oc-finance-page',
  imports: [
    RouterLink,
    RouterLinkActive,
    BudgetPage,
    ExpenseList,
    BillsPage,
    FinanceReports,
    PaymentsPage,
    SuppliersPage,
  ],
  templateUrl: './finance-page.html',
})
export class FinancePage {
  cloud = cloudEnabled;
  finance = inject(FinanceService);
  private params = toSignal(inject(ActivatedRoute).paramMap);
  section = computed(() => this.params()?.get('section') ?? 'orcamento');
  money = money;
  date = formatCalendarDate;
  tabs = [
    { path: 'orcamento', name: 'Orçamento' },
    { path: 'despesas', name: 'Despesas' },
    { path: 'contas', name: 'Contas a pagar' },
    { path: 'fornecedores', name: 'Fornecedores' },
    { path: 'relatorios', name: 'Relatórios' },
  ];
  upcoming = computed(() => {
    const now = localToday();
    const limit = new Date(now + 'T12:00:00');
    limit.setDate(limit.getDate() + 7);
    const end = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`;
    return (this.finance.summary()?.bills ?? [])
      .filter((i) => i.open > 0 && i.dueDate >= now && i.dueDate <= end)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  });
}
