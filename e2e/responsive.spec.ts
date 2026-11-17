import { test, expect } from '@playwright/test';
for (const width of [320, 390, 667, 768]) {
  test(`telas e janelas cabem em ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: width === 667 ? 390 : 740 });
    await page.goto('/casamentos/novo');
    await page.getByLabel('Nome do casamento', { exact: true }).fill('Controle responsivo');
    await page.getByLabel('Nome completo da noiva').fill('Ana');
    await page.getByLabel('Nome completo do noivo').fill('Joao');
    await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
    await expect(page).toHaveURL(/dashboard$/);
    await page.goto('/pessoas/convidados');
    await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
    await page.getByLabel('Nomes dos convidados').fill('Maria Souza');
    await page.getByRole('button', { name: 'Adicionar \u00e0 lista', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const routes = [
      '/dashboard',
      '/casamentos',
      '/financeiro/orcamento',
      '/financeiro/despesas',
      '/financeiro/despesas/nova',
      '/financeiro/contas',
      '/financeiro/relatorios',
      '/financeiro/fornecedores',
      '/pessoas/convidados',
      '/pessoas/familias',
      '/pessoas/padrinhos',
      '/convites/modelos',
      '/convites/enviados',
      '/convites/whatsapp',
      '/convites/confirmacoes',
      '/convites/criar',
      '/presentes',
      '/lembretes',
    ];
    for (const route of routes) {
      await page.goto(route);
      await page.locator('main').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), {
          message: route,
        })
        .toBe(true);
    }
    const cases = [
      ['/pessoas/convidados', /Adicionar convidados/],
      ['/pessoas/familias', /Nova fam/],
      ['/pessoas/padrinhos', /Adicionar participa/],
      ['/financeiro/fornecedores', /Novo fornecedor/],
      ['/presentes', /Adicionar presente/],
      ['/lembretes', /Novo lembrete/],
      ['/lembretes', /Nova anota/],
    ] as const;
    for (const [route, name] of cases) {
      await page.goto(route);
      await page.getByRole('button', { name }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(bounds!.height).toBeLessThanOrEqual(width === 667 ? 390 : 740);
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeInViewport();
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
  });
}
