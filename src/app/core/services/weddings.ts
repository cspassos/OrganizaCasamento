import { Injectable, computed, signal } from '@angular/core';
import { Wedding } from '../models/models';
import { AppRepository } from '../repositories/app.repository';
import { validateWedding } from '../utils/wedding';
import { deleteWeddingData } from '../repositories/delete-wedding';
import { cloudEnabled } from '../repositories/cloud-backend';

interface Selection {
  id: string;
  weddingId: string | null;
}
@Injectable({ providedIn: 'root' })
export class WeddingsService {
  private repository = new AppRepository<Wedding>('weddings');
  private selections = new AppRepository<Selection>('preferences');
  private records = signal<Wedding[]>([]);
  private selectedId = signal<string | null>(null);
  readonly weddings = computed(() => this.records().filter((w) => !w.archived && !w.demo));
  readonly archived = computed(() => this.records().filter((w) => w.archived && !w.demo));
  readonly active = computed(() => this.weddings().find((w) => w.id === this.selectedId()) ?? null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly initialized: Promise<void>;

  constructor() {
    this.initialized = this.load();
  }
  private async load() {
    try {
      const [records, selection] = await Promise.all([
        this.repository.list(),
        this.selections.list(),
      ]);
      this.records.set(records);
      const id = selection.find((p) => p.id === 'active-wedding')?.weddingId;
      this.selectedId.set(
        this.weddings().find((w) => w.id === id)?.id ?? this.weddings()[0]?.id ?? null,
      );
      this.error.set('');
    } catch {
      this.error.set(
        'Não foi possível carregar os casamentos. Recarregue a página para tentar novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  async select(id: string | null): Promise<void> {
    await this.initialized;
    if (id && !this.weddings().some((w) => w.id === id))
      throw new Error('Casamento não encontrado.');
    await this.selections.save({ id: 'active-wedding', weddingId: id });
    this.selectedId.set(id);
  }
  async save(wedding: Wedding): Promise<void> {
    await this.initialized;
    if (this.error()) throw new Error(this.error());
    if (this.busy()) throw new Error('Aguarde a operação em andamento.');
    const invalid = validateWedding(wedding);
    if (invalid) throw new Error(invalid);
    this.busy.set(true);
    try {
      const existing = this.records().find((w) => w.id === wedding.id);
      const now = new Date().toISOString();
      const value: Wedding = {
        ...wedding,
        temporarySeed: existing?.temporarySeed ?? wedding.temporarySeed,
        name: wedding.name.trim(),
        brideName: wedding.brideName!.trim(),
        groomName: wedding.groomName!.trim(),
        demo: false,
        archived: false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await this.repository.save(value);
      this.records.update((items) => [...items.filter((w) => w.id !== value.id), value]);
      try {
        await this.select(value.id);
      } catch {
        throw new Error(
          'O casamento foi salvo, mas não foi possível selecioná-lo. Acesse Meus casamentos e tente selecionar novamente.',
        );
      }
    } finally {
      this.busy.set(false);
    }
  }
  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.initialized;
    if (this.busy()) throw new Error('Aguarde a operação em andamento.');
    const current = this.records().find((w) => w.id === id);
    if (!current) throw new Error('Casamento não encontrado.');
    this.busy.set(true);
    try {
      const value = { ...current, archived, updatedAt: new Date().toISOString() };
      await this.repository.save(value);
      this.records.update((items) => items.map((w) => (w.id === id ? value : w)));
      if (archived && this.selectedId() === id) await this.select(this.weddings()[0]?.id ?? null);
      if (!archived && !this.active()) await this.select(value.id);
    } finally {
      this.busy.set(false);
    }
  }
  find(id: string) {
    return this.records().find((w) => w.id === id);
  }
  async deletePermanently(id: string) {
    await this.initialized;
    if (this.error()) throw new Error(this.error());
    if (this.busy()) throw new Error('Aguarde a operação em andamento.');
    this.busy.set(true);
    try {
      await deleteWeddingData(id);
      await this.load();
    } catch (error) {
      // The database deletion can finish before a Storage cleanup/network error.
      if (cloudEnabled) await this.load();
      throw error;
    } finally {
      this.busy.set(false);
    }
  }
  async refresh() {
    await this.initialized;
    await this.load();
  }
}
