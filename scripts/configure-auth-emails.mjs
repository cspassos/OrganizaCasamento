import { readFile } from 'node:fs/promises';

const project = 'luhamomwwsiqxodwjodo';
const payload = JSON.parse(
  await readFile(new URL('../supabase/templates/auth-config.json', import.meta.url), 'utf8'),
);
for (const [type, file] of [
  ['confirmation', 'confirmation.html'],
  ['recovery', 'recovery.html'],
  ['password_changed_notification', 'password-changed.html'],
]) {
  payload[`mailer_templates_${type}_content`] = await readFile(
    new URL(`../supabase/templates/${file}`, import.meta.url),
    'utf8',
  );
}
if (!process.argv.includes('--apply')) {
  console.log('Revisão: projeto', project);
  console.log(Object.keys(payload).join('\n'));
  console.log(
    'Nenhuma alteração remota. Use --apply com SUPABASE_ACCESS_TOKEN no ambiente autorizado.',
  );
  process.exit(0);
}
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token)
  throw new Error('SUPABASE_ACCESS_TOKEN não está disponível. Nenhuma alteração aplicada.');
const endpoint = `https://api.supabase.com/v1/projects/${project}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const response = await fetch(endpoint, { method: 'PATCH', headers, body: JSON.stringify(payload) });
if (!response.ok) throw new Error(`Não foi possível aplicar os modelos: HTTP ${response.status}.`);
const verification = await fetch(endpoint, { headers });
if (!verification.ok)
  throw new Error(`Não foi possível conferir os modelos: HTTP ${verification.status}.`);
const actual = await verification.json();
const mismatch = Object.keys(payload).filter((key) => actual[key] !== payload[key]);
if (mismatch.length) throw new Error('Configuração não confirmada: ' + mismatch.join(', '));
console.log('Os três modelos de e-mail foram aplicados e conferidos no OrganizaCasamento.');
