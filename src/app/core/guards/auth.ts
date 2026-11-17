import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { cloudEnabled } from '../repositories/cloud-backend';
import { AuthService } from '../services/auth';
export const authGuard: CanActivateFn = async () => {
  if (!cloudEnabled) return true;
  const auth = inject(AuthService),
    router = inject(Router);
  try {
    await auth.initialized;
  } catch {
    return router.parseUrl('/acesso/entrar');
  }
  if (!auth.user()) return router.parseUrl('/acesso/entrar');
  if (auth.recovery()) return router.parseUrl('/acesso/nova-senha');
  return true;
};
