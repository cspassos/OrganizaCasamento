import { Component, computed, effect, input, output, signal, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';

export interface CollectionRow {
  id: string;
  cells: string[];
  record: any;
  tone?: string;
}
export const searchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s()+-]/g, '')
    .toLocaleLowerCase('pt-BR');

@Component({
  selector: 'oc-collection-table',
  imports: [FormsModule, NgTemplateOutlet, MatMenuModule],
  template: `
    <div class="collection-toolbar">
      <span>{{ rows().length }} registros · {{ start() }}–{{ end() }}</span>
      @if (!compact() || rows().length > 25) {
        <label
          >Por página
          <select [ngModel]="size()" (ngModelChange)="size.set(+$event); page.set(1)">
            @for (n of [10, 25, 50, 100]; track n) {
              <option [ngValue]="n">{{ n }}</option>
            }
          </select></label
        >
      }
    </div>
    @if (!compact()) {
      <p class="collection-hint muted">
        Clique no título de uma coluna para ordenar. Em telas pequenas, deslize a tabela para ver as
        demais colunas e ações.
      </p>
    }
    @if (selectable() && (!compact() || selected().size)) {
      <div class="collection-selection" aria-live="polite">
        <strong>{{ selected().size }} selecionados</strong>
        <button class="button secondary" (click)="selectFiltered()" [disabled]="disabled()">
          Selecionar todos os {{ rows().length }} do filtro
        </button>
        <button
          class="button secondary"
          (click)="selectionChange.emit([])"
          [disabled]="disabled() || !selected().size"
        >
          Limpar seleção
        </button>
        <span class="muted">A seleção é mantida ao trocar de página ou filtrar.</span>
      </div>
    }
    <div
      class="collection-scroll"
      tabindex="0"
      [attr.aria-label]="label() + ' — tabela com rolagem horizontal'"
    >
      <table class="collection-table">
        <caption class="visually-hidden">
          {{
            label()
          }}
        </caption>
        <thead>
          <tr>
            @if (selectable()) {
              <th>
                <input
                  type="checkbox"
                  aria-label="Selecionar esta página"
                  [checked]="allPage()"
                  [indeterminate]="somePage() && !allPage()"
                  [disabled]="disabled() || !visible().length"
                  (change)="togglePage($any($event.target).checked)"
                />
              </th>
            }
            @for (h of headers(); track $index; let col = $index) {
              <th
                [attr.aria-sort]="
                  sort() === col ? (descending() ? 'descending' : 'ascending') : 'none'
                "
              >
                <button class="collection-sort" (click)="order(col)">
                  {{ h }} {{ sort() === col ? (descending() ? '↓' : '↑') : '↕' }}
                </button>
              </th>
            }
            @if (actions()) {
              <th class="collection-action-column">Ações</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (r of visible(); track r.id) {
            <tr
              [class.is-selected]="selected().has(r.id)"
              [class.overdue-row]="r.tone === 'danger'"
              [class.collection-paid]="r.tone === 'paid'"
            >
              @if (selectable()) {
                <td>
                  <input
                    type="checkbox"
                    [attr.aria-label]="'Selecionar ' + r.cells[0]"
                    [checked]="selected().has(r.id)"
                    [disabled]="disabled()"
                    (change)="toggle(r.id, $any($event.target).checked)"
                  />
                </td>
              }
              @for (cell of r.cells; track $index) {
                <td>
                  @if (cellTemplates()[$index]; as template) {
                    <ng-container
                      [ngTemplateOutlet]="template"
                      [ngTemplateOutletContext]="{ $implicit: r.record }"
                    />
                  } @else {
                    <span class="collection-cell" [title]="cell">{{ cell || '—' }}</span>
                  }
                </td>
              }
              @if (actions(); as template) {
                <td class="collection-action-column">
                  <div class="collection-actions">
                    <button
                      class="table-action-trigger"
                      [matMenuTriggerFor]="rowActions"
                      [attr.aria-label]="'Ações de ' + r.cells[0]"
                    >
                      Ações <span aria-hidden="true">⋮</span>
                    </button>
                    <mat-menu #rowActions="matMenu" class="collection-action-menu">
                      <ng-template matMenuContent
                        ><ng-container
                          [ngTemplateOutlet]="template"
                          [ngTemplateOutletContext]="{ $implicit: r.record }"
                      /></ng-template>
                    </mat-menu>
                  </div>
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="headers().length + 2">
                Nenhum registro encontrado. Ajuste a busca ou os filtros.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (!compact() || pages() > 1) {
      <nav class="collection-pagination" [attr.aria-label]="'Páginas de ' + label()">
        <button class="button secondary" [disabled]="current() <= 1" (click)="page.set(1)">
          Primeira
        </button>
        <button
          class="button secondary"
          [disabled]="current() <= 1"
          (click)="page.set(current() - 1)"
        >
          Anterior
        </button>
        <label
          >Página
          <input
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
          (click)="page.set(current() + 1)"
        >
          Próxima
        </button>
        <button
          class="button secondary"
          [disabled]="current() >= pages()"
          (click)="page.set(pages())"
        >
          Última
        </button>
      </nav>
    }
  `,
})
export class CollectionTable {
  rows = input.required<CollectionRow[]>();
  headers = input.required<string[]>();
  label = input('Resultados');
  actions = input<TemplateRef<any> | null>(null);
  cellTemplates = input<Record<number, TemplateRef<any>>>({});
  compact = input(false);
  selectable = input(false);
  disabled = input(false);
  selected = input<Set<string>>(new Set());
  selectionChange = output<string[]>();
  size = signal(25);
  page = signal(1);
  sort = signal(-1);
  descending = signal(false);
  pages = computed(() => Math.max(1, Math.ceil(this.rows().length / this.size())));
  current = computed(() => Math.min(this.page(), this.pages()));
  ordered = computed(() =>
    this.sort() < 0
      ? this.rows()
      : [...this.rows()].sort((a, b) => {
          const left = a.cells[this.sort()] ?? '',
            right = b.cells[this.sort()] ?? '';
          let comparison: number;
          if (/^R\$/.test(left) && /^R\$/.test(right))
            comparison =
              Number(left.replace(/[^\d,-]/g, '').replace(',', '.')) -
              Number(right.replace(/[^\d,-]/g, '').replace(',', '.'));
          else if (/^\d{2}\/\d{2}\/\d{4}$/.test(left) && /^\d{2}\/\d{2}\/\d{4}$/.test(right))
            comparison = left
              .split('/')
              .reverse()
              .join('')
              .localeCompare(right.split('/').reverse().join(''));
          else comparison = left.localeCompare(right, 'pt-BR', { numeric: true });
          return comparison * (this.descending() ? -1 : 1);
        }),
  );
  visible = computed(() =>
    this.ordered().slice((this.current() - 1) * this.size(), this.current() * this.size()),
  );
  start = computed(() => (this.rows().length ? (this.current() - 1) * this.size() + 1 : 0));
  end = computed(() => Math.min(this.current() * this.size(), this.rows().length));
  allPage = computed(
    () => !!this.visible().length && this.visible().every((r) => this.selected().has(r.id)),
  );
  somePage = computed(() => this.visible().some((r) => this.selected().has(r.id)));
  private rowIds = '';
  constructor() {
    effect(() => {
      const ids = this.rows()
        .map((row) => row.id)
        .join('|');
      if (ids !== this.rowIds) this.page.set(1);
      this.rowIds = ids;
    });
  }
  go(value: string) {
    this.page.set(Math.min(this.pages(), Math.max(1, Math.trunc(Number(value)) || 1)));
  }
  order(col: number) {
    this.descending.set(this.sort() === col && !this.descending());
    this.sort.set(col);
    this.page.set(1);
  }
  toggle(id: string, checked: boolean) {
    const ids = new Set(this.selected());
    checked ? ids.add(id) : ids.delete(id);
    this.selectionChange.emit([...ids]);
  }
  selectFiltered() {
    this.selectionChange.emit([...new Set([...this.selected(), ...this.rows().map((r) => r.id)])]);
  }
  togglePage(checked: boolean) {
    const ids = new Set(this.selected());
    for (const row of this.visible()) checked ? ids.add(row.id) : ids.delete(row.id);
    this.selectionChange.emit([...ids]);
  }
}
