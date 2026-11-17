import { test, expect } from '@playwright/test';
test('apresentação pública, fotos, ajuda, contato e acesso funcionam no computador e celular', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Mais leveza para viver o seu sim.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Criar minha conta', exact: true }).first(),
  ).toHaveAttribute('href', '/acesso/criar-conta');
  expect(
    await page
      .locator('.lp-hero img')
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  await page.getByRole('link', { name: 'Ajuda', exact: true }).first().click();
  await page.locator('.lp-faq summary').first().click();
  await expect(page.locator('.lp-faq details').first()).toHaveAttribute('open', '');
  await expect(page.locator('.lp-contact-link')).toHaveAttribute(
    'href',
    'mailto:organizacasamento.oficial@gmail.com',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Abrir ou fechar navegação' }).click();
  await page
    .locator('#home-nav')
    .getByRole('link', { name: /Entrar/ })
    .click();
  await expect(page).toHaveURL(/acesso\/entrar$/);
});
