// Migração de dados preexistentes em Postgres isolado; não acessa produção.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '../artifacts/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js';
import { tabelas, colunas } from './nomes-banco-portugues.mjs';
const db = new PGlite();
const usuario = '10000000-0000-4000-8000-000000000001';
const casamento = '20000000-0000-4000-8000-000000000001';
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text, created_at timestamptz default now(), email_confirmed_at timestamptz,last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:greatest(array_length(string_to_array($1,'/'),1)-1,0)]$$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated; grant execute on function storage.foldername(text) to anon,authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
    insert into auth.users(id,email) values('${usuario}','teste@example.com');`);
  const files = (await fs.readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
  const migration = files.find((f) => f.endsWith('_nomes_em_portugues.sql'));
  for (const f of files.filter((f) => f < migration))
    await db.exec(await fs.readFile('supabase/migrations/' + f, 'utf8'));
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [usuario]);
  const estado = {
    wedding: { id: casamento, name: 'Casamento preservado', brideName: 'Ana', groomName: 'Pedro' },
    finance: null,
    people: null,
    suppliers: null,
    invitations: null,
    gifts: null,
  };
  await db.query('select public.save_workspace($1,null,$2,false)', [casamento, estado]);
  await db.query('select public.save_preference($1,$2)', [
    'appearance',
    { id: 'appearance', dark: true, collapsed: false },
  ]);
  await db.query('insert into public.app_administrators(user_id) values($1)', [usuario]);
  const before = {};
  for (const old of Object.keys(tabelas))
    before[old] = (await db.query(`select * from public.${old} order by 1`)).rows;
  const policies = (
    await db.query("select count(*)::int n from pg_policies where schemaname='public'")
  ).rows[0].n;
  await db.exec(await fs.readFile('supabase/migrations/' + migration, 'utf8'));
  for (const f of files.filter((f) => f > migration))
    await db.exec(await fs.readFile('supabase/migrations/' + f, 'utf8'));
  for (const [old, next] of Object.entries(tabelas)) {
    const after = (await db.query(`select * from public.${next} order by 1`)).rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          Object.keys(colunas).find((k) => colunas[k] === key) ?? key,
          value,
        ]),
      ),
    );
    assert.deepEqual(after, before[old], `Dados preservados em ${next}`);
  }
  const physical = (
    await db.query("select tablename,rowsecurity from pg_tables where schemaname='public'")
  ).rows;
  assert.equal(physical.length, 26);
  assert(physical.every((t) => Object.values(tabelas).includes(t.tablename) && t.rowsecurity));
  assert.equal(
    (await db.query("select count(*)::int n from pg_policies where schemaname='public'")).rows[0].n,
    policies,
  );
  await db.exec('set role authenticated');
  assert.equal(
    (await db.query('select nome from public.casamentos')).rows[0].nome,
    'Casamento preservado',
  );
  assert.equal(
    (await db.query('select wedding from public.wedding_workspaces')).rows[0].wedding.name,
    'Casamento preservado',
  );
  estado.wedding.name = 'Atualizado após migração';
  assert.equal(
    Number(
      (await db.query('select public.save_workspace($1,1,$2,false) r', [casamento, estado])).rows[0]
        .r,
    ),
    2,
  );
  await db.exec('reset role');
  assert.equal(
    (await db.query('select nome from public.casamentos')).rows[0].nome,
    'Atualizado após migração',
  );
  console.log(
    '26 tabelas em português: registros, IDs, políticas, leitura antiga e gravação após migração preservados.',
  );
} finally {
  await db.close();
}
