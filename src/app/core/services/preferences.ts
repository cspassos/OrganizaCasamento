import { Injectable, signal } from '@angular/core';
import { IndexedDbRepository } from '../repositories/indexed-db.repository';
import { Preferences } from '../models/models';
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  dark = signal(false);
  collapsed = signal(false);
  ready = signal(false);
  error = signal('');
  private repo = new IndexedDbRepository<Preferences>('preferences');
  private queue = Promise.resolve();
  constructor() {
    void this.load();
  }
  private async load() {
    try {
      const p = (await this.repo.list()).find((p) => p.id === 'appearance');
      if (p) {
        this.dark.set(p.dark);
        this.collapsed.set(p.collapsed);
      }
      this.apply();
    } catch {
      this.error.set('Armazenamento local indisponível. As preferências não serão preservadas.');
    } finally {
      this.ready.set(true);
    }
  }
  toggleTheme() {
    this.dark.update((v) => !v);
    this.apply();
    this.persist();
  }
  toggleSidebar() {
    this.collapsed.update((v) => !v);
    this.persist();
  }
  private apply() {
    document.documentElement.classList.toggle('dark', this.dark());
  }
  private persist() {
    const p = { id: 'appearance', dark: this.dark(), collapsed: this.collapsed() };
    this.queue = this.queue
      .then(() => this.repo.save(p))
      .catch(() => {
        this.error.set('Não foi possível salvar as preferências.');
      });
  }
}
