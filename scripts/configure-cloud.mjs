import fs from 'node:fs/promises';
let local = '';
try {
  local = await fs.readFile('.env.local', 'utf8');
} catch {}
const values = Object.fromEntries(
  local
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).trim()];
    }),
);
const url = process.env.SUPABASE_URL || values.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || values.SUPABASE_PUBLISHABLE_KEY;
if (!url || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !key?.startsWith('sb_publishable_'))
  throw new Error(
    'Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em .env.local ou no ambiente. Nunca use chave secreta.',
  );
await fs.mkdir('src/environments', { recursive: true });
await fs.writeFile(
  'src/environments/cloud.generated.ts',
  `// Generated public browser configuration; no secret keys.\nexport const cloudConfig = ${JSON.stringify({ url, key })};\n`,
);
