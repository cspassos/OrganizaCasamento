import { test, expect, Page } from '@playwright/test';
const id = '10000000-0000-4000-8000-000000000099';
const user = {
  id,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'gestor@example.com',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
async function mock(page: Page, isAdmin = true) {
  let mustChangePassword = true,
    accountCalls = 0,
    recoveries = 0;
  const token = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        sub: id,
        aud: 'authenticated',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url'),
    'test',
  ].join('.');
  await page.route('https://luhamomwwsiqxodwjodo.supabase.co/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const reply = (data: any, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (req.method() === 'OPTIONS') return reply({});
    if (path.endsWith('/token'))
      return reply({
        access_token: token,
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        expires_in: 3600,
        user,
      });
    if (path.endsWith('/user')) return reply(user);
    if (path.endsWith('/logout')) return reply({});
    if (path.endsWith('/preferencias_usuario') || path.endsWith('/espacos_casamento'))
      return reply([]);
    if (path.endsWith('/functions/v1/administration')) {
      const body = req.postDataJSON();
      if (body.action === 'me')
        return reply({ isAdmin, mustChangePassword: isAdmin && mustChangePassword });
      if (!isAdmin) return reply({ error: 'Acesso restrito.' }, 403);
      if (body.action === 'change-initial-password') {
        mustChangePassword = false;
        return reply({ message: 'Nova senha salva.' });
      }
      if (body.action === 'accounts') {
        accountCalls++;
        return reply({
          total: 1,
          users: [
            {
              id,
              email: 'ana@example.com',
              created_at: '2026-01-01',
              email_confirmed_at: '2026-01-01',
              weddings: 1,
            },
          ],
        });
      }
      if (body.action === 'account') return reply({ email: 'ana@example.com', workspaces: [] });
      if (body.action === 'recovery-link') {
        recoveries++;
        return reply({
          email: 'ana@example.com',
          link: 'https://example.test/verify?token=one-use',
        });
      }
    }
    return reply({});
  });
  return { accountCalls: () => accountCalls, recoveries: () => recoveries };
}
async function login(page: Page) {
  await page.goto('/acesso/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('gestor@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('SenhaFicticia123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
test('administrador troca senha inicial, consulta contas e gera recuperação por ação explícita', async ({
  page,
}) => {
  const state = await mock(page);
  await login(page);
  await expect(page).toHaveURL(/administracao$/);
  await expect(
    page.getByRole('heading', { name: 'Primeiro, escolha uma senha só sua' }),
  ).toBeVisible();
  expect(state.accountCalls()).toBe(0);
  await page.screenshot({ path: 'artifacts/admin-primeiro-acesso.png', fullPage: true });
  await page.getByLabel('Nova senha', { exact: true }).fill('UmaSenhaForte123!');
  await page.getByLabel('Confirme a nova senha').fill('UmaSenhaForte123!');
  await page.getByRole('button', { name: 'Salvar nova senha e continuar' }).click();
  await expect(page.locator('tbody')).toContainText('ana@example.com');
  await page.getByRole('button', { name: 'Recuperar acesso', exact: true }).click();
  expect(state.recoveries()).toBe(0);
  await page.getByRole('button', { name: 'Gerar link de recuperação' }).click();
  await expect(page.getByLabel('Link para ana@example.com')).toHaveValue(
    /https:\/\/example.test\/verify/,
  );
  expect(state.recoveries()).toBe(1);
  await page.getByRole('button', { name: 'Ver casamentos', exact: true }).click();
  await expect(page.getByText('Esta conta ainda não cadastrou um casamento.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/admin-celular.png', fullPage: true });
});
test('usuário comum não abre a administração', async ({ page }) => {
  await mock(page, false);
  await login(page);
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/administracao');
  await expect(page).toHaveURL(/dashboard$/);
  await expect(page.getByRole('link', { name: 'Administração', exact: true })).toHaveCount(0);
});
