import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { WeddingsService } from '../../core/services/weddings';
import { formatCalendarDate } from '../../core/utils/wedding';
import { StatCard } from '../../shared/components/stat-card';
import { FinanceService } from '../../core/services/finance';
import { money } from '../../core/utils/finance';
import { PeopleService } from '../../core/services/people';
import { cloudEnabled } from '../../core/repositories/cloud-backend';

@Component({
  selector: 'oc-dashboard',
  imports: [RouterLink, StatCard],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  cloud = cloudEnabled;
  store = inject(WeddingsService);
  finance = inject(FinanceService);
  people = inject(PeopleService);
  nextBills = computed(() =>
    (this.finance.summary()?.bills ?? [])
      .filter((b) => b.open > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5),
  );
  expenseName(id: string) {
    return this.finance.ledger()?.expenses.find((e) => e.id === id)?.description ?? 'Conta';
  }
  money = money;
  private router = inject(Router);
  saved = signal(!!this.router.getCurrentNavigation()?.extras.state?.['weddingSaved']);
  date = formatCalendarDate;
}
