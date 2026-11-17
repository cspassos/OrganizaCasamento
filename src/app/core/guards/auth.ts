import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { cloudEnabled } from '../repositories/cloud-backend';
import { AuthService } from '../services/auth';
import { AdministrationService } from '../services/administration';
export const authGuard: CanActivateFn = async (_route, state) => {
  if (!cloudEnabled) return true;
  const auth = inject(AuthService),
    router = inject(Router),
    administration = inject(AdministrationService);
  try {
    await auth.initialized;
  } catch {
    return router.parseUrl('/acesso/entrar');
  }
  if (!auth.user()) return router.parseUrl('/acesso/entrar');
  if (auth.recovery()) return router.parseUrl('/acesso/nova-senha');
  try {
    await administration.load();
    if (administration.mustChangePassword() && !state.url.startsWith('/administracao'))
      return router.parseUrl('/administracao');
  } catch {
    return router.parseUrl('/acesso/entrar');
  }
  return true;
};
