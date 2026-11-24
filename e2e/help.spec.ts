import { expect, test } from '@playwright/test';

test('alinha os cards da primeira linha e mantém o menu lateral inteiro no desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/ajuda');
  await expect(page.getByRole('heading', { name: 'Ajuda', exact: true })).toBeVisible();
  const cards = await page.locator('.help-topic').evaluateAll((elements) =>
    elements.slice(0, 3).map((element) => {
      const { top, height } = element.getBoundingClientRect();
      return { top, height };
    }),
  );
  expect(cards).toHaveLength(3);
  expect(cards[1]).toEqual(cards[0]);
  expect(cards[2]).toEqual(cards[0]);
  const sidebar = page.getByRole('complementary', { name: 'Menu principal' });
  await expect(sidebar.getByRole('link', { name: 'Meu casamento' })).toBeInViewport();
  await expect(sidebar.getByRole('link', { name: 'Ajuda' })).toBeInViewport();
  expect(
    await sidebar
      .locator('.sidebar-menu')
      .evaluate((menu) => menu.scrollHeight <= menu.clientHeight),
  ).toBe(true);
});

test('a ajuda abre pelo menu móvel e encontra respostas sem acentos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('link', { name: 'Ajuda', exact: true }).click();
  await expect(page).toHaveURL(/\/ajuda$/);
  await expect(page.getByRole('heading', { name: 'Ajuda', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lista de presentes' })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Buscar na ajuda' });
  await search.fill('historico planejamento');
  const question = page.getByText('Como vejo o histórico do planejamento?', { exact: true });
  await question.click();
  await expect(page.getByText('A página mostra os dados atuais', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lista de presentes' })).toHaveCount(0);
  await search.fill('semresultado123');
  await expect(page.getByRole('status')).toContainText('Nenhuma resposta encontrada');
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Abrir lista de presentes' }).click();
  await expect(page).toHaveURL(/\/presentes$/);
});
