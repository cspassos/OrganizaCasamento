import { createClient } from 'npm:@supabase/supabase-js@2.99.3';
import { administrationHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const privileged = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(
  administrationHandler({
    privileged,
    authenticate: (token) => privileged.auth.getUser(token),
  }),
);
