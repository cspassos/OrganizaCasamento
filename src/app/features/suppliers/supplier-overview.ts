import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Supplier } from '../../core/models/suppliers';
import { FinanceService } from '../../core/services/finance';
import { SuppliersService } from '../../core/services/suppliers';
import { downloadAttachment } from '../../shared/components/attachment';
import { money } from '../../core/utils/finance';

@Component({
  imports: [MatDialogModule, RouterLink],
  template: `<h2 mat-dialog-title>{{ supplier.name }}</h2>
    <mat-dialog-content>
      <p>{{ supplier.category }} · {{ supplier.service || 'Serviço não informado' }}</p>
      <p>
        WhatsApp: {{ supplier.whatsapp || 'Não informado' }}<br />Telefone:
        {{ supplier.phone || 'Não informado' }}<br />E-mail: {{ supplier.email || 'Não informado' }}
      </p>
      @if (supplier.notes) {
        <p>{{ supplier.notes }}</p>
      }
      @if (supplier.company || supplier.document || supplier.address || supplier.responsible) {
        <details><summary>Outros dados do contato</summary>
          @if (supplier.company) { <p>Empresa: {{ supplier.company }}</p> }
          @if (supplier.document) { <p>CPF/CNPJ: {{ supplier.document }}</p> }
          @if (supplier.responsible) { <p>Responsável: {{ supplier.responsible }}</p> }
          @if (supplier.address) { <p>Endereço: {{ supplier.address }}</p> }
        </details>
      }
      <h3>Gastos e documentos deste fornecedor</h3>
      <p class="muted">São os mesmos registros de Gastos e pagamentos. Não é outro lançamento.</p>
      @if (supplier.attachment) {
        <button class="button secondary" (click)="download(supplier.attachment)">
          Baixar {{ supplier.attachment.name }}
        </button>
      }
      @for (expense of expenses; track expense.id) {
        <section class="supplier-expense">
          <strong>{{ expense.description }}</strong>
          <p>
            {{ expense.situation }} ·
            {{ money(expense.status === 'planned' ? expense.plannedCents : expense.due) }}
          </p>
          <a
            class="button secondary"
            [routerLink]="['/financeiro/despesas', expense.id]"
            [mat-dialog-close]="true"
            >Ver gasto e pagamentos</a
          >
          @if (expense.attachment) {
            <button class="button secondary" (click)="download(expense.attachment)">
              Baixar {{ expense.attachment.name }}
            </button>
          }
        </section>
      } @empty {
        <p>Nenhum gasto vinculado ainda.</p>
      }
      @for (contract of contracts; track contract.id) {
        @if (contract.attachment) {
          <p>
            <button class="button secondary" (click)="download(contract.attachment)">
              Baixar contrato: {{ contract.title }}
            </button>
          </p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button class="button secondary" mat-dialog-close>Fechar</button></mat-dialog-actions
    >`,
  styles: `
    .supplier-expense {
      padding: 16px 0;
      border-top: 1px solid var(--border);
    }
    .button {
      margin: 4px 8px 4px 0;
    }
  `,
})
export class SupplierOverview {
  supplier = inject<Supplier>(MAT_DIALOG_DATA);
  expenses = inject(FinanceService)
    .expenseRows()
    .filter((e) => e.supplierId === this.supplier.id);
  contracts =
    inject(SuppliersService)
      .ledger()
      ?.contracts.filter((c) => c.supplierId === this.supplier.id) ?? [];
  download = downloadAttachment;
  money = money;
}
