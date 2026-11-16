import { DatePicker } from '../../shared/components/date-picker';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../core/services/finance';
import {
  buildFinanceReport,
  reportCsv,
  ReportKind,
  reportNames,
} from '../../core/utils/finance-reports';
import { localToday, money, periodError } from '../../core/utils/finance';
import { formatCalendarDate } from '../../core/utils/wedding';
import { ReportTable } from '../../shared/components/report-table';
@Component({
  selector: 'oc-finance-reports',
  imports: [DatePicker, FormsModule, ReportTable],
  templateUrl: './reports.html',
})
export class FinanceReports {
  finance = inject(FinanceService);
  kind = signal<ReportKind>('expenses');
  from = signal('');
  to = signal('');
  category = signal('');
  status = signal('');
  page = signal(0);
  exporting = signal(false);
  error = signal('');
  expanded = signal(false);
  names = {
    ...reportNames,
    expenses: 'Gastos do casamento',
    payments: 'Pagamentos e ajustes',
    pending: 'O que falta pagar',
    overdue: 'Contas vencidas',
  };
  kinds = Object.keys(reportNames) as ReportKind[];
  money = money;
  invalidPeriod = computed(() =>
    this.kind() === 'budget' ? '' : periodError(this.from(), this.to()),
  );
  report = computed(() =>
    buildFinanceReport(
      this.finance.ledger()!,
      this.finance.weddings.active()?.initialBudget ?? 0,
      this.kind(),
      { from: this.from(), to: this.to(), categoryId: this.category(), status: this.status() },
    ),
  );
  rows = computed(() => this.report().rows.slice(this.page() * 15, (this.page() + 1) * 15));
  reset() {
    this.page.set(0);
  }
  filters() {
    const category =
      this.finance.ledger()?.categories.find((c) => c.id === this.category())?.name ?? 'Todas';
    return this.kind() === 'budget'
      ? `Categoria: ${category} | Visão geral, sem período ou situação`
      : `Período: ${this.from() ? formatCalendarDate(this.from()) : 'sem limite inicial'} a ${this.to() ? formatCalendarDate(this.to()) : 'sem limite final'} | Categoria: ${category} | Situação: ${this.status() || 'Todas'}`;
  }
  private download(blob: Blob, extension: string, kind = this.kind()) {
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `financeiro-${kind}-${localToday()}.${extension}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  csv() {
    if (this.invalidPeriod()) return;
    this.download(
      new Blob(
        [
          reportCsv(this.report(), [
            `Casamento: ${this.finance.weddings.active()?.name}`,
            this.filters(),
          ]),
        ],
        { type: 'text/csv;charset=utf-8' },
      ),
      'csv',
    );
  }
  async pdf() {
    if (this.invalidPeriod()) return;
    const report = this.report(),
      name = this.finance.weddings.active()!.name,
      filters = this.filters(),
      kind = this.kind();
    this.exporting.set(true);
    this.error.set('');
    try {
      const { financeReportPdf } = await import('../../core/utils/finance-report-pdf');
      this.download(await financeReportPdf(report, name, filters), 'pdf', kind);
    } catch {
      this.error.set('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      this.exporting.set(false);
    }
  }
}
