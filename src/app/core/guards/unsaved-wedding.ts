import { CanDeactivateFn } from '@angular/router';
export const unsavedWeddingGuard: CanDeactivateFn<{ canLeave(): Promise<boolean> }> = (component) =>
  component.canLeave();
