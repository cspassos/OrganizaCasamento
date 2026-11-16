import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuppliersService } from '../../core/services/suppliers';
import { CollectionTable } from '../../shared/components/collection-table';
import { money } from '../../core/utils/finance';

@Component({
  selector: 'oc-previous-team',
  imports: [RouterLink, CollectionTable],
  template: `<h1>Cadastros anteriores de equipe</h1>
    <p>
      O controle do casamento foi simplificado. Estes registros foram mantidos para consulta. Os
      valores já lançados continuam em Gastos e pagamentos.
    </p>
    <a class="button primary" routerLink="/financeiro/despesas">Ver gastos e pagamentos</a>
    @if (store.loading()) {
      <p role="status">Carregando…</p>
    } @else if (store.error()) {
      <p role="alert" class="feedback error">{{ store.error() }}</p>
    } @else {
      <oc-collection-table
        label="Profissionais cadastrados anteriormente"
        [headers]="['Nome', 'Função', 'Valor combinado']"
        [rows]="rows()"
      />
      @if (shifts().length) {
        <details class="optional-details">
          <summary>Consultar escalas anteriores</summary>
          <oc-collection-table
            label="Escalas anteriores"
            [headers]="['Profissional', 'Início', 'Fim', 'Local']"
            [rows]="shifts()"
          />
        </details>
      }
    }`,
})
export class PreviousTeam {
  store = inject(SuppliersService);
  rows = computed(() =>
    (this.store.ledger()?.professionals ?? []).map((p) => ({
      id: p.id,
      record: p,
      cells: [p.name, p.role, money(p.agreedCents)],
    })),
  );
  shifts = computed(() =>
    (this.store.ledger()?.shifts ?? []).map((s) => ({
      id: s.id,
      record: s,
      cells: [
        this.store.ledger()?.professionals.find((p) => p.id === s.professionalId)?.name ??
          'Profissional',
        s.start.replace('T', ' '),
        s.end.replace('T', ' '),
        s.location,
      ],
    })),
  );
}
