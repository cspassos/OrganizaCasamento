import { Injectable, signal } from '@angular/core';
import { cloudClient, cloudEnabled } from '../repositories/cloud-backend';

@Injectable({ providedIn: 'root' })
export class AdministrationService {
  isAdmin = signal(false);
  mustChangePassword = signal(false);
  private account = '';
  private pending?: Promise<void>;
  async call<T = any>(action: string, values: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await cloudClient().functions.invoke('administration', {
      body: { action, ...values },
    });
    if (error) {
      let message = 'Não foi possível acessar a administração. Tente novamente.';
      try {
        message = (await error.context.json()).error || message;
      } catch {}
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data as T;
  }
  async load(force = false) {
    if (!cloudEnabled) return;
    const { data, error } = await cloudClient().auth.getSession();
    if (error) throw error;
    const id = data.session?.user.id ?? '';
    if (!id) {
      this.account = '';
      this.isAdmin.set(false);
      this.mustChangePassword.set(false);
      return;
    }
    if (!force && this.account === id) return this.pending;
    this.account = id;
    this.pending = this.call('me')
      .then((status) => {
        this.isAdmin.set(status.isAdmin === true);
        this.mustChangePassword.set(status.mustChangePassword === true);
      })
      .catch((error) => {
        this.account = '';
        throw error;
      });
    return this.pending;
  }
}
