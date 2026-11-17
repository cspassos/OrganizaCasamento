import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdministrationService } from '../../core/services/administration';
import { AuthService } from '../../core/services/auth';
import { money, financeSummary } from '../../core/utils/finance';

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: './administration-page.html',
  styleUrl: './administration-page.scss',
})
export class AdministrationPage {
  admin = inject(AdministrationService);
  auth = inject(AuthService);
  users = signal<any[]>([]);
  total = signal(0);
  page = signal(1);
  query = '';
  password = '';
  confirm = '';
  busy = signal(false);
  error = signal('');
  message = signal('');
  account = signal<any | null>(null);
  recovery = signal<{ link: string; email: string } | null>(null);
  selected = signal<any | null>(null);
  money = money;
  summary = financeSummary;
  Math = Math;
  transactionName = (kind: string) =>
    ({
      payment: 'Pagamento',
      refund: 'Devolução',
      discount: 'Desconto',
      interest: 'Juros',
      fine: 'Multa',
    })[kind] ?? kind;
  date = (value: string) =>
    value
      ? new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00' : value,
        ).toLocaleDateString('pt-BR')
      : '—';
  constructor() {
    if (!this.admin.mustChangePassword()) void this.load();
  }
  async load(page = 1) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.recovery.set(null);
    try {
      const data = await this.admin.call('accounts', { query: this.query, page });
      this.users.set(data.users);
      this.total.set(data.total);
      this.page.set(page);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async initialPassword() {
    this.error.set('');
    this.message.set('');
    if (this.password !== this.confirm) {
      this.error.set('Digite a mesma senha nos dois campos.');
      return;
    }
    if (
      this.password.length < 12 ||
      !/[a-zA-Z]/.test(this.password) ||
      !/[0-9]/.test(this.password)
    ) {
      this.error.set('Use pelo menos 12 caracteres, incluindo letras e números.');
      return;
    }
    this.busy.set(true);
    try {
      const result = await this.admin.call('change-initial-password', { password: this.password });
      this.password = '';
      this.confirm = '';
      await this.admin.load(true);
      this.message.set(result.message);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
    if (!this.admin.mustChangePassword()) await this.load();
  }
  async inspect(user: any) {
    this.busy.set(true);
    this.error.set('');
    this.recovery.set(null);
    try {
      this.account.set(await this.admin.call('account', { userId: user.id }));
      this.selected.set(null);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async generateRecovery(user: any) {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      this.recovery.set(await this.admin.call('recovery-link', { userId: user.id }));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async copy() {
    try {
      await navigator.clipboard.writeText(this.recovery()!.link);
      this.message.set('Link copiado. Compartilhe somente com a pessoa titular da conta.');
    } catch {
      this.error.set('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  }
  async logout() {
    try {
      await this.auth.signOut();
    } catch {
      this.error.set('Não foi possível sair. Tente novamente.');
    }
  }
}
