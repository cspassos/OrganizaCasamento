import { Injectable, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { cloudClient, cloudEnabled } from '../repositories/cloud-backend';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);
  ready = signal(false);
  recovery = signal(false);
  initialized = this.initialize();
  private async initialize() {
    if (!cloudEnabled) {
      this.ready.set(true);
      return;
    }
    const client = cloudClient();
    client.auth.onAuthStateChange((event, session) => {
      const previous = this.user()?.id;
      this.user.set(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') this.recovery.set(true);
      if (previous && previous !== session?.user?.id)
        queueMicrotask(() => window.location.assign('/acesso/entrar'));
    });
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      this.user.set(data.session?.user ?? null);
    } finally {
      this.ready.set(true);
    }
  }
  async signOut() {
    const { error } = await cloudClient().auth.signOut();
    if (error) throw error;
    window.location.assign('/acesso/entrar');
  }
}
