import { test, expect } from '@playwright/test';
test('menu direto destaca o destino em acesso direto, atualização e volta', async ({ page }) => {
  await page.goto('/pessoas/familias');
  const menu = page.getByRole('navigation', { name: 'Seções do casamento' });
  await expect(menu.getByRole('link', { name: 'Convidados', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.reload();
  await menu.getByRole('link', { name: 'Gastos e pagamentos', exact: true }).click();
  await expect(
    menu.getByRole('link', { name: 'Gastos e pagamentos', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(menu.getByRole('link', { name: 'Convidados', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(menu.getByRole('link')).toHaveCount(7);
});
test('tema e menu recolhido persistem no navegador', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const r = indexedDB.open('organiza-casamento');
            r.onsuccess = () => {
              const db = r.result;
              const q = db.transaction('preferences').objectStore('preferences').get('appearance');
              q.onsuccess = () => {
                db.close();
                resolve(!!q.result?.dark);
              };
            };
          }),
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.getByRole('button', { name: 'Recolher menu', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/compact/);
  await expect(
    page.getByRole('link', { name: 'Gastos e pagamentos', exact: true }),
  ).toHaveAttribute('title', 'Gastos e pagamentos');
  await page.getByRole('button', { name: 'Expandir menu', exact: true }).click();
  await page.getByRole('button', { name: 'Ativar tema claro', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass('dark');
});
test('menu no celular abre, navega e fecha sem ultrapassar a tela', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Seu casamento, sem complicação' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Seções do casamento' })
    .getByRole('link', { name: 'Convidados', exact: true })
    .click();
  await expect(page).toHaveURL(/pessoas\/convidados$/);
  await expect(page.locator('.sidebar')).not.toHaveClass(/mobile-open/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
