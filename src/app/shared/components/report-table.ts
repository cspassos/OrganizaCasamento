import { Component, computed, input, signal, effect } from '@angular/core';
import { ReportSection } from '../../core/utils/finance-reports';
import { ListPager } from './list-pager';
import { FormsModule } from '@angular/forms';
import { searchText } from './collection-table';
@Component({
  selector: 'oc-report-table',
  imports: [ListPager, FormsModule],
  template: `@if (section().notes) {
      <p class="muted report-section-note">{{ section().notes }}</p>
    }
    <label class="collection-search"
      >Buscar nesta seção<input
        type="search"
        [ngModel]="query()"
        (ngModelChange)="query.set($event); page.set(0)"
    /></label>
    <div class="report-table" role="region" [attr.aria-label]="section().title" tabindex="0">
      <table>
        <thead>
          <tr>
            @for (col of section().columns; track $index) {
              <th>{{ col }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of visible(); track $index) {
            <tr
              [class.report-overdue]="section().states?.[row.index] === 'Vencida'"
              [class.report-paid]="section().states?.[row.index] === 'Pago'"
              [class.report-voided]="section().states?.[row.index] === 'Desfeita'"
            >
              @for (cell of row.cells; track $index) {
                <td [attr.data-label]="section().columns[$index]">{{ cell }}</td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="section().columns.length">Nenhum registro para este recorte.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <oc-list-pager
      [total]="filtered().length"
      [page]="page() + 1"
      [size]="size()"
      (pageChange)="page.set($event - 1)"
      (sizeChange)="size.set($event)"
    />`,
})
export class ReportTable {
  section = input.required<ReportSection>();
  page = signal(0);
  size = signal(25);
  query = signal('');
  filtered = computed(() =>
    this.section()
      .rows.map((cells, index) => ({ cells, index }))
      .filter((row) => searchText(row.cells.join(' ')).includes(searchText(this.query()))),
  );
  visible = computed(() =>
    this.filtered().slice(this.page() * this.size(), (this.page() + 1) * this.size()),
  );
  constructor() {
    effect(() => {
      this.section();
      this.page.set(0);
    });
  }
}
