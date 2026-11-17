import { administrationHandler } from '../../../../supabase/functions/administration/handler';
const id = '10000000-0000-4000-8000-000000000001';
const target = '10000000-0000-4000-8000-000000000002';
function setup(member: any = null) {
  const operations: any[] = [];
  const db: any = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: member, error: null }),
          order: async () => ({ data: [], error: null }),
        }),
      }),
      insert: async (value: any) => {
        operations.push({ table, value });
        return { error: null };
      },
      update: (value: any) => ({
        eq: async (_key: string, user: string) => {
          operations.push({ table, value, user });
          return { error: null };
        },
      }),
    }),
    rpc: async () => ({
      data: { users: [{ id: target, email: 'ana@example.com' }], total: 1 },
      error: null,
    }),
    auth: {
      admin: {
        updateUserById: async (user: string, value: any) => {
          operations.push({ user, value });
          return { error: null };
        },
        getUserById: async () => ({
          data: { user: { id: target, email: 'ana@example.com' } },
          error: null,
        }),
        generateLink: async () => ({
          data: { properties: { action_link: 'https://example.com/verify?token=one-use' } },
          error: null,
        }),
      },
    },
  };
  const handler = administrationHandler({
    privileged: db,
    authenticate: async (token: string) =>
      token === 'valid'
        ? { data: { user: { id, user_metadata: { admin: true } } }, error: null }
        : { data: { user: null }, error: { message: 'Invalid' } },
  });
  const request = (
    action: string,
    values: any = {},
    token = 'valid',
    origin = 'https://organizacasamento.vercel.app',
  ) =>
    handler(
      new Request('https://example.com/functions/v1/administration', {
        method: 'POST',
        headers: {
          authorization: token ? 'Bearer ' + token : '',
          origin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action, ...values }),
      }),
    );
  return { request, operations };
}
describe('Administração no servidor', () => {
  it('rejeita sessão ausente, inválida e origem externa', async () => {
    const s = setup();
    expect((await s.request('accounts', {}, '')).status).toBe(401);
    expect((await s.request('accounts', {}, 'invalid')).status).toBe(401);
    expect((await s.request('accounts', {}, 'valid', 'https://evil.example')).status).toBe(403);
  });
  it('não concede privilégio por metadados editáveis ou por uma rota conhecida', async () => {
    const s = setup();
    expect(await (await s.request('me')).json()).toEqual({
      isAdmin: false,
      mustChangePassword: false,
    });
    expect((await s.request('accounts')).status).toBe(403);
    expect((await s.request('recovery-link', { userId: target })).status).toBe(403);
    expect(s.operations).toHaveLength(0);
  });
  it('bloqueia consultas e recuperação até trocar a senha inicial', async () => {
    const s = setup({ must_change_password: true });
    expect((await s.request('accounts')).status).toBe(403);
    expect((await s.request('recovery-link', { userId: target })).status).toBe(403);
    expect(s.operations).toHaveLength(0);
  });
  it('valida a senha e só troca a senha do próprio administrador', async () => {
    const s = setup({ must_change_password: true });
    expect((await s.request('change-initial-password', { password: 'curta' })).status).toBe(400);
    expect(
      (
        await s.request('change-initial-password', {
          userId: target,
          password: 'NovaSenhaForte123!',
        })
      ).status,
    ).toBe(200);
    expect(s.operations[0].user).toBe(id);
    expect(s.operations.at(-1).value.action).toBe('initial_password_changed');
  });
  it('lista contas e gera recuperação registrada sem retornar a senha da pessoa', async () => {
    const s = setup({ must_change_password: false });
    expect((await s.request('accounts')).status).toBe(200);
    expect((await s.request('recovery-link', { userId: 'invalid' })).status).toBe(400);
    const result = await (await s.request('recovery-link', { userId: target })).json();
    expect(result.link).toContain('verify');
    expect(result).not.toHaveProperty('password');
    expect(s.operations.at(-1).value).toMatchObject({
      administrator_id: id,
      target_user_id: target,
      action: 'password_reset_link',
    });
  });
});
