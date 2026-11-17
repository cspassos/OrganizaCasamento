import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { cloudClient } from '../../core/repositories/cloud-backend';
import { AuthService } from '../../core/services/auth';
import { validEmail } from '../../core/utils/contact';

@Component({
  imports: [FormsModule, RouterLink],
  template: `<main class="access-page">
    <section class="access-card card">
      <a class="access-brand" routerLink="/acesso/entrar">♡ organiza casamento</a>
      <h1>
        {{
          mode === 'criar-conta'
            ? 'Vamos começar?'
            : mode === 'recuperar'
              ? 'Recuperar acesso'
              : mode === 'nova-senha'
                ? 'Sua nova senha'
                : 'Seu casamento, com você'
        }}
      </h1>
      <p class="muted">
        {{
          mode === 'entrar'
            ? 'Entre para acompanhar seu casamento em qualquer aparelho.'
            : mode === 'criar-conta'
              ? 'Crie sua conta. Seus cadastros ficam separados e protegidos.'
              : mode === 'recuperar'
                ? 'Enviaremos um link para você escolher uma nova senha.'
                : 'Escolha uma senha de pelo menos 8 caracteres.'
        }}
      </p>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      @if (message()) {
        <p class="feedback success" role="status">{{ message() }}</p>
      }
      <form (ngSubmit)="submit()" novalidate>
        @if (mode !== 'nova-senha') {
          <label
            >E-mail<input
              type="email"
              aria-label="E-mail"
              name="email"
              [(ngModel)]="email"
              (ngModelChange)="emailError.set('')"
              [attr.aria-invalid]="emailError() ? true : null"
              aria-describedby="access-email-help"
              autocomplete="email"
              required
              maxlength="254"
            />
            <small
              id="access-email-help"
              [class.field-error]="emailError()"
              [attr.role]="emailError() ? 'alert' : null"
              >{{
                emailError() || 'Use um e-mail ao qual você tenha acesso. Ex.: nome@exemplo.com'
              }}</small
            ></label
          >
        }
        @if (mode !== 'recuperar') {
          <label
            >{{ mode === 'nova-senha' ? 'Nova senha' : 'Senha'
            }}<input
              type="password"
              name="password"
              [(ngModel)]="password"
              [autocomplete]="mode === 'entrar' ? 'current-password' : 'new-password'"
              required
              [minlength]="mode === 'entrar' ? 1 : 8"
              maxlength="128"
          /></label>
        }
        @if (mode === 'criar-conta' || mode === 'nova-senha') {
          <label
            >Confirme a senha<input
              type="password"
              name="confirm"
              [(ngModel)]="confirm"
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="128"
          /></label>
        }
        <button class="button primary" type="submit" [disabled]="busy()">
          {{
            busy()
              ? 'Aguarde…'
              : mode === 'criar-conta'
                ? 'Criar minha conta'
                : mode === 'recuperar'
                  ? 'Enviar link de recuperação'
                  : mode === 'nova-senha'
                    ? 'Salvar nova senha'
                    : 'Entrar'
          }}
        </button>
      </form>
      <nav aria-label="Opções de acesso">
        @if (mode === 'entrar') {
          <a routerLink="/acesso/recuperar">Esqueci minha senha</a
          ><a routerLink="/acesso/criar-conta">Ainda não tenho conta</a>
        } @else {
          <a routerLink="/acesso/entrar">Voltar para entrar</a>
        }
      </nav>
    </section>
  </main>`,
  styles: `
    :host {
      display: block;
    }
    .access-page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: linear-gradient(140deg, var(--bg), var(--sage-light));
    }
    .access-card {
      width: min(100%, 470px);
      padding: 36px;
    }
    .access-brand {
      display: block;
      color: var(--sage);
      font-size: 22px;
      text-decoration: none;
      margin-bottom: 28px;
    }
    .access-card h1 {
      font-size: 28px;
      line-height: 1.2;
    }
    .access-card p {
      line-height: 1.6;
    }
    .access-card form {
      display: grid;
      gap: 18px;
      margin-top: 24px;
    }
    .access-card label {
      display: grid;
      gap: 8px;
    }
    .access-card input {
      width: 100%;
      min-height: 46px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
    }
    .access-card input:focus-visible {
      outline: 2px solid var(--sage);
      outline-offset: 2px;
    }
    .access-card nav {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 16px;
      margin-top: 24px;
      font-size: 13px;
    }
    .access-card nav a {
      color: var(--sage);
    }
    @media (max-width: 480px) {
      .access-card {
        padding: 24px;
      }
    }
  `,
})
export class AuthPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  mode = 'entrar';
  email = '';
  password = '';
  confirm = '';
  busy = signal(false);
  error = signal('');
  message = signal('');
  emailError = signal('');
  constructor() {
    this.route.paramMap.subscribe((p) => {
      this.mode = p.get('action') ?? 'entrar';
      if (!['entrar', 'criar-conta', 'recuperar', 'nova-senha', 'confirmar'].includes(this.mode))
        this.mode = 'entrar';
      this.password = '';
      this.confirm = '';
      this.error.set('');
      this.message.set('');
      this.emailError.set('');
      void this.handleSession();
    });
  }
  async handleSession() {
    try {
      await this.auth.initialized;
      if (this.mode === 'confirmar') {
        if (this.auth.user()) await this.router.navigateByUrl('/dashboard');
        else {
          this.mode = 'entrar';
          this.message.set(
            'Se o e-mail já foi confirmado, entre com sua senha. Se o link expirou, solicite um novo acesso em Esqueci minha senha.',
          );
        }
      } else if (this.auth.recovery() && this.mode !== 'nova-senha')
        await this.router.navigateByUrl('/acesso/nova-senha');
    } catch {
      this.error.set('Não foi possível recuperar a sessão. Confira sua conexão.');
    }
  }
  async submit() {
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    if (this.mode !== 'nova-senha') {
      this.email = this.email.trim();
      if (!this.email || !validEmail(this.email)) {
        this.emailError.set(
          this.email
            ? 'Informe um e-mail válido, como nome@exemplo.com.'
            : 'Informe seu e-mail para continuar.',
        );
        return;
      }
    }
    if (this.mode === 'entrar' && !this.password) {
      this.error.set('Informe sua senha para entrar.');
      return;
    }
    if (
      this.mode !== 'recuperar' &&
      this.mode !== 'entrar' &&
      (this.password.length < 8 || this.password !== this.confirm)
    ) {
      this.error.set('Use pelo menos 8 caracteres e repita a mesma senha.');
      return;
    }
    this.busy.set(true);
    try {
      const client = cloudClient();
      if (this.mode === 'criar-conta') {
        const { data, error } = await client.auth.signUp({
          email: this.email.trim(),
          password: this.password,
          options: { emailRedirectTo: window.location.origin + '/acesso/confirmar' },
        });
        if (error) throw error;
        if (data.session) await this.router.navigateByUrl('/dashboard');
        else
          this.message.set(
            'Enviamos um link para confirmar seu e-mail. Abra a mensagem do OrganizaCasamento e clique em Confirmar meu e-mail. Confira também o spam. O acesso será liberado após a confirmação.',
          );
      } else if (this.mode === 'recuperar') {
        const { error } = await client.auth.resetPasswordForEmail(this.email.trim(), {
          redirectTo: window.location.origin + '/acesso/nova-senha',
        });
        if (error) throw error;
        this.message.set(
          'Se houver uma conta com esse e-mail, você receberá as instruções. Confira também o spam.',
        );
      } else if (this.mode === 'nova-senha') {
        await this.auth.initialized;
        if (!this.auth.user())
          throw new Error(
            'Abra o link de recuperação recebido por e-mail antes de definir a nova senha.',
          );
        const { error } = await client.auth.updateUser({ password: this.password });
        if (error) throw error;
        this.auth.recovery.set(false);
        this.mode = 'entrar';
        this.password = '';
        this.confirm = '';
        this.message.set(
          'Sua senha foi alterada. Guarde sua nova senha e use-a nos próximos acessos.',
        );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: this.email.trim(),
          password: this.password,
        });
        if (error) throw error;
        await this.router.navigateByUrl('/dashboard');
      }
    } catch (e: any) {
      const m = String(e?.message ?? '');
      const code = String(e?.code ?? '');
      this.error.set(
        code === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(m)
          ? 'Informe um e-mail válido, como nome@exemplo.com.'
          : /email_address_not_authorized|email.*not.*authorized/i.test(code + ' ' + m)
            ? 'O envio de e-mails ainda não está liberado para este endereço. A configuração de envio do sistema precisa ser concluída.'
            : /error sending|smtp/i.test(m)
              ? 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.'
              : /invalid login/i.test(m)
                ? 'E-mail ou senha incorretos.'
                : /email not confirmed/i.test(m)
                  ? 'Confirme sua conta pelo e-mail antes de entrar.'
                  : /rate|too many/i.test(m)
                    ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
                    : /fetch|network|timeout/i.test(m)
                      ? 'Não foi possível conectar. Confira sua internet e tente novamente.'
                      : m || 'Não foi possível concluir. Tente novamente.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
