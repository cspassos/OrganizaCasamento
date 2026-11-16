import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'oc-list-pager',
  imports: [FormsModule],
  template: `<nav class="collection-pagination" aria-label="Paginação dos resultados">
    <span>{{ total() }} registros</span
    ><label
      >Por página<select
        [ngModel]="size()"
        (ngModelChange)="sizeChange.emit(+$event); pageChange.emit(1)"
      >
        @for (n of [10, 25, 50, 100]; track n) {
          <option [ngValue]="n">{{ n }}</option>
        }
      </select></label
    >
    <button class="button secondary" [disabled]="current() <= 1" (click)="pageChange.emit(1)">
      Primeira</button
    ><button
      class="button secondary"
      [disabled]="current() <= 1"
      (click)="pageChange.emit(current() - 1)"
    >
      Anterior
    </button>
    <label
      >Página<input
        type="number"
        min="1"
        [max]="pages()"
        [ngModel]="current()"
        (change)="go($any($event.target).value)"
      />
      de {{ pages() }}</label
    >
    <button
      class="button secondary"
      [disabled]="current() >= pages()"
      (click)="pageChange.emit(current() + 1)"
    >
      Próxima</button
    ><button
      class="button secondary"
      [disabled]="current() >= pages()"
      (click)="pageChange.emit(pages())"
    >
      Última
    </button>
  </nav>`,
})
export class ListPager {
  page = input(1);
  total = input(0);
  size = input(25);
  pageChange = output<number>();
  sizeChange = output<number>();
  pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  current = computed(() => Math.min(this.pages(), this.page()));
  go(value: string) {
    this.pageChange.emit(Math.min(this.pages(), Math.max(1, Math.trunc(Number(value)) || 1)));
  }
}
