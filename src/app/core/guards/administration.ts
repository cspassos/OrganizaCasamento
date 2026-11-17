import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdministrationService } from '../services/administration';
export const administrationGuard: CanActivateFn = async () => {
  const administration = inject(AdministrationService),
    router = inject(Router);
  try {
    await administration.load();
    return administration.isAdmin() || router.parseUrl('/dashboard');
  } catch {
    return router.parseUrl('/acesso/entrar');
  }
};
