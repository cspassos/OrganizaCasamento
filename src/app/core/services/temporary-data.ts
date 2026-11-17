import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class TemporaryDataService {
  marker = signal<{ id: string; weddingId: string; previousId: string | null } | null>(null);
  busy = signal(false);
  ready = signal(true);
  error = signal('');
  initialized = Promise.resolve();
  refresh() {
    return Promise.resolve();
  }
  private disabled(): Promise<void> {
    return Promise.reject(new Error('A massa local existe somente nos testes isolados.'));
  }
  create() {
    return this.disabled();
  }
  remove() {
    return this.disabled();
  }
  select() {
    return this.disabled();
  }
}
