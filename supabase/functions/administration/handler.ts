type Client = any;
type Dependencies = {
  privileged: Client;
  authenticate: (token: string) => Promise<{ data: { user: any }; error: any }>;
};
const site = 'https://organizacasamento.vercel.app';
const origins = new Set([
  site,
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:4301',
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function administrationHandler({ privileged: db, authenticate }: Dependencies) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
      'access-control-allow-methods': 'POST, OPTIONS',
      vary: 'Origin',
    };
    if (origin && origins.has(origin)) headers['access-control-allow-origin'] = origin;
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    if (origin && !origins.has(origin)) return reply({ error: 'Origem não permitida.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405);
    const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!bearer) return reply({ error: 'Entre na sua conta para continuar.' }, 401);
    try {
      const { data: identity, error: identityError } = await authenticate(bearer);
      if (identityError || !identity.user)
        return reply({ error: 'Sessão inválida. Entre novamente.' }, 401);
      const actor = identity.user;
      const body = await req.json();
      const { data: membership, error: memberError } = await db
        .from('app_administrators')
        .select('must_change_password')
        .eq('user_id', actor.id)
        .maybeSingle();
      if (memberError) throw memberError;
      if (body.action === 'me')
        return reply({
          isAdmin: !!membership,
          mustChangePassword: membership?.must_change_password ?? false,
        });
      if (!membership) return reply({ error: 'Esta área é exclusiva da administração.' }, 403);
      const audit = async (action: string, target: string | null = actor.id) => {
        const { error } = await db
          .from('administration_audit')
          .insert({ administrator_id: actor.id, target_user_id: target, action });
        if (error) throw error;
      };
      if (body.action === 'change-initial-password') {
        const password = String(body.password ?? '');
        if (
          password.length < 12 ||
          password.length > 128 ||
          !/[a-zA-Z]/.test(password) ||
          !/[0-9]/.test(password)
        )
          return reply(
            {
              error: 'Escolha uma senha com pelo menos 12 caracteres, incluindo letras e números.',
            },
            400,
          );
        const { error } = await db.auth.admin.updateUserById(actor.id, { password });
        if (error)
          return reply(
            {
              error: 'Não foi possível alterar a senha. Use uma senha diferente e tente novamente.',
            },
            400,
          );
        const update = await db
          .from('app_administrators')
          .update({ must_change_password: false })
          .eq('user_id', actor.id);
        if (update.error) throw update.error;
        await audit('initial_password_changed');
        return reply({ message: 'Nova senha salva. Seu acesso administrativo está liberado.' });
      }
      if (membership.must_change_password)
        return reply({ error: 'Troque a senha inicial antes de acessar a administração.' }, 403);
      if (body.action === 'accounts') {
        const { data, error } = await db.rpc('administration_accounts', {
          p_query: String(body.query ?? '').slice(0, 200),
          p_page: Math.max(1, Math.min(Number(body.page) || 1, 100000)),
        });
        if (error) throw error;
        return reply(data);
      }
      const target = String(body.userId ?? '');
      if (!uuid.test(target)) return reply({ error: 'Escolha um usuário válido.' }, 400);
      const { data: targetData, error: targetError } = await db.auth.admin.getUserById(target);
      if (targetError || !targetData.user?.email)
        return reply({ error: 'Usuário não encontrado.' }, 404);
      if (body.action === 'account') {
        const { data, error } = await db
          .from('wedding_workspaces')
          .select('wedding_id,wedding,finance,people,suppliers,invitations,gifts,updated_at')
          .eq('owner_id', target)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        await audit('view_account', target);
        return reply({ email: targetData.user.email, workspaces: data ?? [] });
      }
      if (body.action === 'recovery-link') {
        // No automatic email: the administrator explicitly requests and shares this one-use link.
        await audit('password_reset_link', target);
        const { data, error } = await db.auth.admin.generateLink({
          type: 'recovery',
          email: targetData.user.email,
          options: { redirectTo: site + '/acesso/nova-senha' },
        });
        if (error || !data.properties?.action_link)
          return reply(
            { error: 'Não foi possível gerar o link de recuperação. Tente novamente.' },
            502,
          );
        return reply({ link: data.properties.action_link, email: targetData.user.email });
      }
      return reply({ error: 'Ação não reconhecida.' }, 400);
    } catch {
      return reply(
        { error: 'Não foi possível concluir. Confira sua conexão e tente novamente.' },
        500,
      );
    }
  };
}
