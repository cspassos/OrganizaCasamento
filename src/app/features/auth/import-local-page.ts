import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { readLegacyRecords } from './legacy-backup';
import { cloudBackend, cloudEnabled, Workspace } from '../../core/repositories/cloud-backend';
import { AuthService } from '../../core/services/auth';
import { Wedding } from '../../core/models/models';

const stores = [
  'weddings',
  'finance',
  'people',
  'suppliers',
  'invitations',
  'gifts',
  'preferences',
] as const;
@Component({
  imports: [FormsModule],
  template: `<main class="import-page">
    <section class="card form-section">
      <h1>Trazer meus cadastros anteriores</h1>
      <p>
        Você está na conta <strong>{{ auth.user()?.email }}</strong>. Escolha os casamentos deste
        navegador que pertencem a você.
      </p>
      <p class="muted">
        Primeiro, baixe uma cópia de segurança. A importação mantém os identificadores e confere os
        dados no servidor. Os originais não serão apagados.
      </p>
      @if (error()) {
        <p class="feedback error" role="alert">{{ error() }}</p>
      }
      @if (message()) {
        <p class="feedback success" role="status">{{ message() }}</p>
      }
      @if (loading()) {
        <p role="status">Procurando cadastros anteriores…</p>
      }
      @for (wedding of weddings(); track wedding.id) {
        <label class="import-item"
          ><input
            type="checkbox"
            [checked]="selected.has(wedding.id)"
            (change)="toggle(wedding.id)"
            [disabled]="busy()"
          /><span
            ><strong>{{ wedding.name }}</strong
            ><small
              >{{ wedding.archived ? 'Arquivado' : 'Ativo' }} · {{ wedding.brideName }} e
              {{ wedding.groomName }}</small
            ></span
          ></label
        >
      }
      @if (!loading() && !weddings().length) {
        <p>Nenhum casamento anterior encontrado neste navegador. Você já pode começar.</p>
      }
      <div class="import-actions">
        @if (weddings().length) {
          <button class="button secondary" (click)="backup()" [disabled]="busy()">
            1. Baixar backup</button
          ><button
            class="button primary"
            (click)="migrate()"
            [disabled]="!backedUp() || busy() || !selected.size"
          >
            {{ busy() ? 'Importando…' : '2. Importar os selecionados' }}
          </button>
        }
        <button class="button secondary" (click)="continue()" [disabled]="busy()">
          {{
            done() || !weddings().length ? 'Ir para meu casamento' : 'Continuar sem importar agora'
          }}
        </button>
      </div>
      <details>
        <summary>Tenho um arquivo de backup</summary>
        <label class="button secondary"
          >Escolher backup JSON<input
            type="file"
            accept="application/json,.json"
            (change)="readBackup($event)"
            [disabled]="busy()"
        /></label>
      </details>
    </section>
  </main>`,
  styles: `
    .import-page {
      max-width: 900px;
      margin: 40px auto;
      padding: 20px;
    }
    .import-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 0;
      border-bottom: 1px solid var(--border);
    }
    .import-item input {
      width: 20px;
      height: 20px;
    }
    .import-item span {
      display: grid;
      gap: 6px;
    }
    .import-item small {
      color: var(--muted);
    }
    .import-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin: 24px 0;
    }
    details {
      margin-top: 20px;
    }
    details label {
      margin-top: 16px;
    }
  `,
})
export class ImportLocalPage {
  auth = inject(AuthService);
  router = inject(Router);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  message = signal('');
  backedUp = signal(false);
  done = signal(false);
  weddings = signal<Wedding[]>([]);
  selected = new Set<string>();
  snapshot: Record<string, any[]> = {};
  constructor() {
    void this.load();
  }
  async load() {
    if (!cloudEnabled) {
      await this.router.navigateByUrl('/dashboard');
      return;
    }
    try {
      const values = await Promise.all(stores.map((s) => readLegacyRecords(s)));
      this.snapshot = Object.fromEntries(stores.map((s, i) => [s, values[i]]));
      this.showSnapshot();
    } catch {
      this.error.set(
        'Não foi possível ler os dados antigos. Não foram apagados; você pode tentar novamente ou escolher um backup.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  showSnapshot() {
    this.weddings.set(
      (this.snapshot['weddings'] ?? []).filter((w: any) => !w.demo && !w.temporarySeed),
    );
    this.selected = new Set(this.weddings().map((w) => w.id));
    this.backedUp.set(false);
    this.done.set(false);
  }
  toggle(id: string) {
    this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id);
  }
  backup() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: 'organiza-casamento-backup',
            version: 1,
            exportedAt: new Date().toISOString(),
            stores: this.snapshot,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'organiza-casamento-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.backedUp.set(true);
  }
  async readBackup(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error();
      const value = JSON.parse(await file.text());
      if (
        value.format !== 'organiza-casamento-backup' ||
        value.version !== 1 ||
        !Array.isArray(value.stores?.weddings) ||
        stores.some((s) => !Array.isArray(value.stores[s]))
      )
        throw new Error();
      this.snapshot = value.stores;
      this.showSnapshot();
      this.error.set('');
      this.message.set('Backup aberto. Confira os casamentos e baixe a cópia antes de importar.');
    } catch {
      this.error.set(
        'Escolha um backup JSON válido do OrganizaCasamento, de até 100 MB. Nenhum dado foi importado.',
      );
    }
  }
  async migrate() {
    if (this.busy() || !this.backedUp()) return;
    this.busy.set(true);
    this.error.set('');
    let imported = 0;
    try {
      for (const wedding of this.weddings().filter((w) => this.selected.has(w.id))) {
        const state: Workspace = {
          wedding,
          finance: null,
          people: null,
          suppliers: null,
          invitations: null,
          gifts: null,
        };
        for (const s of ['finance', 'people', 'suppliers', 'invitations', 'gifts'] as const)
          state[s] =
            (this.snapshot[s] ?? []).find(
              (v) => v.weddingId === wedding.id || v.id === wedding.id,
            ) ?? null;
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(state))),
          ),
          (v) => v.toString(16).padStart(2, '0'),
        ).join('');
        await cloudBackend.importWorkspace(state, hash);
        imported++;
        this.message.set(`${imported} casamento(s) importado(s) e conferido(s).`);
      }
      this.done.set(true);
      this.message.set(
        `${imported} casamento(s) importado(s) e conferido(s). Os dados agora serão usados no Supabase. O backup original foi preservado.`,
      );
    } catch (e) {
      this.error.set(
        `${imported} casamento(s) concluído(s). ${e instanceof Error ? e.message : 'Não foi possível concluir.'} Você pode repetir: os já importados não serão duplicados.`,
      );
    } finally {
      this.busy.set(false);
    }
  }
  continue() {
    window.location.assign('/dashboard');
  }
}
