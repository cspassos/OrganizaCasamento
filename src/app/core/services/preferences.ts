import { Injectable, signal } from '@angular/core';
import { AppRepository } from '../repositories/app.repository';
import { Preferences } from '../models/models';
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  dark = signal(false);
  collapsed = signal(false);
  ready = signal(false);
  error = signal('');
  peopleView = signal<'table' | 'cards'>('table');
  invitationsView = signal<'table' | 'cards'>('table');
  private repo = new AppRepository<Preferences>('preferences');
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
        this.peopleView.set(p.peopleView === 'cards' ? 'cards' : 'table');
        this.invitationsView.set(p.invitationsView === 'cards' ? 'cards' : 'table');
      }
      this.apply();
    } catch {
      this.error.set('Não foi possível carregar suas preferências da conta.');
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
    const p = {
      id: 'appearance',
      dark: this.dark(),
      collapsed: this.collapsed(),
      peopleView: this.peopleView(),
      invitationsView: this.invitationsView(),
    };
    this.queue = this.queue
      .then(() => this.repo.save(p))
      .catch(() => {
        this.error.set('Não foi possível salvar as preferências.');
      });
  }
  setCollectionView(collection: 'people' | 'invitations', value: string) {
    const view = value === 'cards' ? 'cards' : 'table';
    (collection === 'people' ? this.peopleView : this.invitationsView).set(view);
    this.persist();
  }
}
