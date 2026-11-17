import { test, expect, Page } from '@playwright/test';
const account = '10000000-0000-4000-8000-000000000099';
const user = {
  id: account,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'teste@example.com',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
const token = () =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        sub: account,
        aud: 'authenticated',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url'),
    'test',
  ].join('.');
async function backend(page: Page) {
  const rows = new Map<string, any>(),
    files = new Map<string, Buffer>();
  let prefs: Record<string, any> = {},
    fail = false,
    conflict = false;
  const calls: string[] = [];
  await page.route('https://luhamomwwsiqxodwjodo.supabase.co/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    calls.push(request.method() + ' ' + path);
    const reply = (value: any, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(value),
      });
    if (request.method() === 'OPTIONS') return reply({});
    if (path.endsWith('/functions/v1/administration'))
      return reply({ isAdmin: false, mustChangePassword: false });
    if (path.endsWith('/token'))
      return reply({
        access_token: token(),
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user,
      });
    if (path.endsWith('/user')) return reply(user);
    if (path.endsWith('/signup')) return reply({ user, session: null });
    if (path.endsWith('/recover') || path.endsWith('/logout')) return reply({});
    if (path.includes('/storage/v1/object/')) {
      const key = path.replace('/storage/v1/object/', '').replace(/^authenticated\//, '');
      if (request.method() === 'POST') {
        const body = await new Response(request.postDataBuffer()!, {
          headers: { 'content-type': request.headers()['content-type'] },
        }).formData();
        files.set(key, Buffer.from(await (body.get('') as File).arrayBuffer()));
        return reply({ Key: key });
      }
      if (files.has(key))
        return route.fulfill({ status: 200, contentType: 'image/png', body: files.get(key)! });
      return reply({ message: 'File missing' }, 404);
    }
    if (path.endsWith('/user_preferences'))
      return reply(Object.keys(prefs).length ? [{ data: prefs }] : []);
    if (path.endsWith('/wedding_workspaces')) {
      let result = [...rows.values()];
      const id = url.searchParams.get('wedding_id')?.replace('eq.', '');
      if (id) result = result.filter((r) => r.wedding_id === id);
      return reply(result);
    }
    if (path.includes('/rpc/')) {
      const data = request.postDataJSON();
      if (path.endsWith('/view_invitation'))
        return reply({
          issue: {
            id: '30000000-0000-4000-8000-000000000099',
            weddingId: '20000000-0000-4000-8000-000000000099',
            recipientLabel: 'Maria',
            design: {
              title: 'Convite',
              bride: 'Ana',
              groom: 'Pedro',
              date: '2027-01-01',
              photo: '',
              background: '#ffffff',
              color: '#333333',
              accent: '#64765b',
              style: 'Clássico',
              font: 'serif',
              message: 'Com carinho',
              venue: 'Jardim',
              address: '',
              time: '17:00',
              reception: '',
              receptionTime: '',
              footer: '',
            },
          },
          members: [
            {
              id: '40000000-0000-4000-8000-000000000099',
              name: 'Maria',
              status: 'Aguardando confirmação',
              diet: '',
            },
          ],
        });
      if (path.endsWith('/respond_invitation')) return reply(null);
      if (path.endsWith('/save_preference')) {
        prefs[data.p_key] = data.p_value;
        return reply(null);
      }
      if (path.endsWith('/delete_workspace')) {
        rows.delete(data.p_id);
        return reply(null);
      }
      if (path.endsWith('/save_workspace') || path.endsWith('/import_workspace')) {
        if (fail)
          return reply({ message: 'Não foi possível salvar no servidor', code: 'P0001' }, 500);
        if (conflict) return reply({ message: 'Conflict', code: '40001' }, 409);
        const old = rows.get(data.p_id);
        if (path.endsWith('/import_workspace') && old?.import_hash === data.p_hash)
          return reply(old.revision);
        if (old && old.revision !== data.p_version)
          return reply({ code: '40001', message: 'Conflict' }, 409);
        // JSONB does not preserve object key order. Exercise migration verification.
        const reorder = (v: any): any =>
          Array.isArray(v)
            ? v.map(reorder)
            : v && typeof v === 'object'
              ? Object.fromEntries(
                  Object.entries(v)
                    .reverse()
                    .map(([k, x]) => [k, reorder(x)]),
                )
              : v;
        rows.set(data.p_id, {
          ...reorder(data.p_data),
          owner_id: account,
          wedding_id: data.p_id,
          revision: (old?.revision ?? 0) + 1,
          created_at: new Date().toISOString(),
          import_hash: data.p_hash ?? old?.import_hash ?? null,
        });
        return reply(rows.get(data.p_id).revision);
      }
    }
    return reply({ message: 'Unexpected test request ' + path }, 400);
  });
  return {
    rows,
    preferences: () => prefs,
    files,
    calls,
    fail: (v: boolean) => (fail = v),
    conflict: (v: boolean) => (conflict = v),
  };
}
async function login(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/acesso\/entrar/);
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('SenhaDeTeste123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
async function wedding(page: Page) {
  await page.goto('/casamentos/novo');
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Ana e Pedro');
  await page.getByLabel('Nome completo da noiva').fill('Ana');
  await page.getByLabel('Nome completo do noivo').fill('Pedro');
  await page.getByLabel('Orçamento inicial (R$)').fill('23000');
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
test('login, gasto e parcelas na nuvem; falha e conflito não mostram sucesso; sessão e dados após recarregar', async ({
  page,
}) => {
  const server = await backend(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await wedding(page);
  await page.goto('/financeiro/despesas/nova');
  await page.locator('#supplier').fill('Buffet Ana');
  await page.getByLabel('Descrição *', { exact: true }).fill('Recepção');
  await page.getByLabel('Valor total combinado *', { exact: true }).fill('12000');
  await page.getByLabel('Entrada / sinal', { exact: true }).fill('2000');
  await page.getByLabel('Parcelas do restante').fill('5');
  await page.getByLabel('Vencimento / data da entrada *', { exact: true }).fill('01/01/2026');
  await page.getByLabel('Primeiro vencimento do restante').fill('01/12/2026');
  server.fail(true);
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('servidor');
  expect([...server.rows.values()][0].finance).toBeNull();
  server.fail(false);
  server.conflict(true);
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('outra aba');
  server.conflict(false);
  await page.getByRole('button', { name: 'Salvar gasto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalhes da despesa', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.bill-row')).toHaveCount(6);
  expect([...server.rows.values()][0].finance.installments).toHaveLength(6);
  expect([...server.rows.values()][0].suppliers.suppliers).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.bill-row')).toHaveCount(6);
  expect(
    await page.evaluate(async () =>
      (await indexedDB.databases()).filter((d) => d.name === 'organiza-casamento'),
    ),
  ).toHaveLength(0);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/acesso\/entrar/);
  await page.goto('/financeiro/despesas');
  await expect(page).toHaveURL(/acesso\/entrar/);
  expect(errors).toEqual([]);
});
test('backup obrigatório, importação verificável e original local preservado', async ({ page }) => {
  const server = await backend(page);
  await login(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('organiza-casamento');
        r.onupgradeneeded = () => r.result.createObjectStore('weddings', { keyPath: 'id' });
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction('weddings', 'readwrite');
          tx.objectStore('weddings').put({
            id: '20000000-0000-4000-8000-000000000099',
            name: 'Casamento antigo',
            date: '',
            demo: false,
            brideName: 'Ana',
            groomName: 'Pedro',
            initialBudget: 20000,
            estimatedGuests: 0,
            capacity: 0,
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = reject;
        };
        r.onerror = reject;
      }),
  );
  await page.goto('/importar-dados');
  await expect(page.getByText('Casamento antigo', { exact: true })).toBeVisible();
  const button = page.getByRole('button', { name: '2. Importar os selecionados', exact: true });
  await expect(button).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '1. Baixar backup', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('organiza-casamento-backup.json');
  await button.click();
  await expect(page.getByRole('status')).toContainText('importado(s) e conferido(s)');
  expect(server.rows.size).toBe(1);
  await page.getByRole('button', { name: 'Ir para meu casamento', exact: true }).click();
  await expect(page.getByLabel('Casamento selecionado')).toContainText('Casamento antigo');
  await page.goto('/importar-dados');
  await expect(page.getByText('Casamento antigo', { exact: true })).toBeVisible();
  expect(server.rows.size).toBe(1);
});
test('cadastro e recuperação dão instruções sem enviar e-mails reais; login cabe no celular', async ({
  page,
}) => {
  const server = await backend(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/acesso/criar-conta');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('SenhaDeTeste123');
  await page.getByLabel('Confirme a senha').fill('SenhaDeTeste123');
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Enviamos um link');
  await page.goto('/acesso/recuperar');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByRole('button', { name: 'Enviar link de recuperação', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('instruções');
  expect(server.calls.some((c) => c.endsWith('/signup'))).toBe(true);
  expect(server.calls.some((c) => c.endsWith('/recover'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/login-celular.png', fullPage: true });
});
test('convidados e presentes com foto usam banco e Storage; imagem carrega após recarregar', async ({
  page,
}) => {
  const server = await backend(page);
  await login(page);
  await wedding(page);
  await page.goto('/pessoas/convidados');
  await page.getByRole('button', { name: 'Adicionar convidados', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nomes dos convidados').fill('Maria\nCarlos');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Adicionar à lista', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect([...server.rows.values()][0].people.guests).toHaveLength(2);
  await page.reload();
  await expect(page.locator('tbody')).toContainText('Maria');
  await page.goto('/presentes');
  await page.getByRole('button', { name: 'Adicionar presente', exact: true }).click();
  await page.getByLabel('Nome do presente *', { exact: true }).fill('Jogo de panelas');
  await page.getByLabel('Quantidade que queremos', { exact: true }).fill('3');
  await page.getByLabel('Foto do presente', { exact: true }).setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhWQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(server.files.size).toBe(1);
  const stored = [...server.rows.values()][0].gifts.items[0];
  expect(stored.photo.__oc_file.bucket).toBe('wedding-images');
  expect(JSON.stringify([...server.rows.values()])).not.toContain('data:image');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Jogo de panelas', exact: true })).toBeVisible();
  await expect
    .poll(
      async () =>
        await page
          .locator('.gift-card img')
          .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Registrar 1 recebido', exact: true }).click();
  await expect.poll(() => [...server.rows.values()][0].gifts.items[0].receivedQuantity).toBe(1);
});
test('convidado abre convite e responde sem login ou acesso a dados privados', async ({ page }) => {
  const server = await backend(page);
  await page.goto('/convite/' + 'a'.repeat(64));
  await expect(
    page.getByRole('heading', { name: 'Confirme sua presença', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Maria vai comparecer?').selectOption('yes');
  await page.getByRole('button', { name: 'Confirmar respostas', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('enviadas aos noivos');
  expect(server.calls.some((c) => c.includes('/respond_invitation'))).toBe(true);
  expect(server.calls.some((c) => c.endsWith('/token'))).toBe(false);
});

for (const action of ['entrar', 'criar-conta', 'recuperar']) {
  test('e-mail inválido antes de chamar servidor: ' + action, async ({ page }) => {
    const server = await backend(page);
    await page.goto('/acesso/' + action);
    for (const email of [
      'sem-arroba',
      'ana@dominio',
      'ana..souza@exemplo.com',
      'ana.@exemplo.com',
    ]) {
      await page.getByLabel('E-mail', { exact: true }).fill(email);
      await page.locator('form button[type="submit"]').click();
      await expect(page.getByRole('alert').last()).toContainText('e-mail válido');
    }
    expect(server.calls.some((c) => /\/(token|signup|recover)$/.test(c))).toBe(false);
  });
}

test('preferência de visualização fica na conta e retorna após recarregar', async ({ page }) => {
  const server = await backend(page);
  await login(page);
  await wedding(page);
  await page.goto('/pessoas/convidados');
  await page.locator('.people-list-options > summary').click();
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await expect.poll(() => server.preferences().appearance?.peopleView).toBe('cards');
  await page.reload();
  await page.locator('.people-list-options > summary').click();
  await expect(page.getByRole('button', { name: 'Cartões', exact: true })).toHaveClass(/primary/);
  expect(await page.evaluate(() => localStorage.getItem('oc-people-view'))).toBeNull();
});

test('conta conectada aparece no computador e no celular', async ({ page }) => {
  await backend(page);
  await login(page);
  await expect(page.locator('.account-identity')).toHaveText('teste@example.com');
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByLabel('Conta conectada')).toContainText('teste@example.com');
  await expect(page.getByLabel('Conta conectada')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('anotacoes ficam na conta e falhas nao apagam o conteudo salvo', async ({ page }) => {
  const server = await backend(page);
  await login(page);
  await wedding(page);
  await page.goto('/lembretes');
  await page.getByRole('button', { name: /Nova anota/ }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel(/T.tulo/).fill('Ideia importante');
  await dialog.getByLabel('Detalhes').fill('Guardar esta informacao na conta');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect([...server.rows.values()][0].wedding.organizer[0].title).toBe('Ideia importante');
  await page.reload();
  await expect(page.locator('.organizer-item')).toContainText('Ideia importante');
  await page.getByRole('button', { name: 'Editar Ideia importante', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel(/T.tulo/).fill('Outra ideia');
  server.fail(true);
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  expect([...server.rows.values()][0].wedding.organizer[0].title).toBe('Ideia importante');
  server.fail(false);
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.organizer-item')).toContainText('Outra ideia');
  const row = [...server.rows.values()][0];
  await page.goto(`/casamentos/${row.wedding.id}/editar`);
  await page.getByLabel('Nome do casamento', { exact: true }).fill('Casamento atualizado');
  row.wedding.organizer.push({
    ...row.wedding.organizer[0],
    id: crypto.randomUUID(),
    title: 'Nota de outro aparelho',
  });
  row.revision++;
  await page.getByRole('button', { name: 'Salvar casamento', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto('/lembretes');
  await expect(page.locator('.organizer-item')).toHaveCount(2);
  await expect(page.locator('.organizer-grid')).toContainText('Nota de outro aparelho');
});
