import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WeddingsService } from '../../core/services/weddings';
import { money } from '../../core/utils/finance';
import { planningFields, planningKeys, planningVersion } from '../../core/utils/planning';
import { formatCalendarDate } from '../../core/utils/wedding';

@Component({
  selector: 'oc-planning-history',
  imports: [DatePipe, RouterLink],
  templateUrl: './planning-history.html',
})
export class PlanningHistory {
  store = inject(WeddingsService);
  private params = toSignal(inject(ActivatedRoute).paramMap);
  wedding = computed(() => {
    const id = this.params()?.get('id');
    const wedding = id ? this.store.find(id) : undefined;
    return wedding?.demo ? undefined : wedding;
  });
  versions = computed(() => {
    const wedding = this.wedding();
    if (!wedding) return [];
    return [planningVersion(wedding), ...(wedding.planningHistory ?? [])].map((version) => ({
      savedAt: version.savedAt,
      fields: planningKeys.flatMap((key) => {
        const value = version.details[key];
        if (value == null || value === '' || (Array.isArray(value) && !value.length)) return [];
        const display =
          key === 'initialBudget' && typeof value === 'number'
            ? money(Math.round(value * 100))
            : key === 'date' && typeof value === 'string'
              ? formatCalendarDate(value)
              : Array.isArray(value)
                ? value.join(', ')
                : String(value);
        return [{ key, label: planningFields[key], value: display }];
      }),
    }));
  });
}
