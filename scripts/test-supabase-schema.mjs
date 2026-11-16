// Isolated Postgres/WASM smoke tests. Does not connect to any hosted project.
// Runtime installed outside the application: npm install --prefix artifacts/sql-runtime
//   --no-save --package-lock=false @electric-sql/pglite@0.5.16
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '../artifacts/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js';

const db = new PGlite();
let checks = 0;
async function query(sql) {
  return (await db.query(sql)).rows;
}
async function denied(sql, code = '42501') {
  await assert.rejects(
    () => db.exec(sql),
    (error) => error.code === code,
  );
  checks++;
}
async function user(id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec('set role authenticated');
}
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const wa = '20000000-0000-4000-8000-000000000001';
const wb = '20000000-0000-4000-8000-000000000002';
const ga = '30000000-0000-4000-8000-000000000001';
try {
  // Supabase-managed schemas are represented by minimal compatible fixtures.
  // This is not a substitute for hosted Storage/Auth endpoint tests or advisors.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);
    create function storage.foldername(text) returns text[] language sql immutable as
      $$select (string_to_array($1,'/'))[1:greatest(array_length(string_to_array($1,'/'),1)-1,0)]$$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant execute on function storage.foldername(text) to anon,authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
    insert into auth.users values ('${a}'),('${b}');
  `);
  const files = (await fs.readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) await db.exec(await fs.readFile(`supabase/migrations/${file}`, 'utf8'));
  const tables = await query(
    "select tablename,rowsecurity from pg_tables where schemaname='public'",
  );
  assert.equal(tables.length, 23);
  assert(tables.every((t) => t.rowsecurity));
  checks++;
  await user(a);
  await db.exec(`insert into public.weddings(id,name) values('${wa}','Teste A')`);
  await denied(`insert into public.weddings(name,owner_id) values('Invasão','${b}')`);
  await db.exec(`insert into public.guests(id,wedding_id,name) values('${ga}','${wa}','Maria')`);
  await db.exec(
    `insert into public.gift_items(wedding_id,name,quantity,received_quantity) values('${wa}','Toalhas',3,1)`,
  );
  await denied(
    `insert into public.gift_items(wedding_id,name,quantity) values('${wa}','Inválido',0)`,
    '23514',
  );
  await denied(
    `insert into public.expenses(wedding_id,description,category_id) values('${wa}','Não deve gravar','${ga}')`,
  );
  await db.exec(
    `insert into storage.objects(bucket_id,name) values('wedding-images','${a}/${wa}/foto.jpg')`,
  );
  await denied(`update public.weddings set owner_id='${b}' where id='${wa}'`);
  assert.equal(
    (await query(`update storage.objects set name='${a}/${wa}/foto-nova.jpg' returning id`)).length,
    1,
  );
  checks++;
  await db.exec('reset role');
  // Service-side migration fixtures exercise cascades with a non-empty ledger.
  await db.exec(`
    insert into public.finance_categories(id,wedding_id,name) values('40000000-0000-4000-8000-000000000001','${wa}','Buffet');
    insert into public.expenses(id,wedding_id,category_id,description,status,contracted_cents) values('50000000-0000-4000-8000-000000000001','${wa}','40000000-0000-4000-8000-000000000001','Buffet','contracted',10000);
    insert into public.installments(id,wedding_id,expense_id,number,label,amount_cents,due_date) values('60000000-0000-4000-8000-000000000001','${wa}','50000000-0000-4000-8000-000000000001',1,'Integral',10000,'2026-11-16');
    insert into public.financial_transactions(wedding_id,expense_id,installment_id,kind,amount_cents,transaction_date) values('${wa}','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','payment',2000,'2026-11-16');
  `);
  await user(b);
  await db.exec(`insert into public.weddings(id,name) values('${wb}','Teste B')`);
  assert.equal((await query('select * from public.weddings')).length, 1);
  checks++;
  assert.equal((await query('select * from public.guests')).length, 0);
  checks++;
  assert.equal((await query('select * from public.gift_items')).length, 0);
  checks++;
  assert.equal((await query('select * from storage.objects')).length, 0);
  checks++;
  for (const t of ['expenses', 'installments', 'financial_transactions']) {
    assert.equal((await query(`select * from public.${t}`)).length, 0);
    checks++;
  }
  assert.equal((await query('delete from storage.objects returning id')).length, 0);
  checks++;
  await denied(`insert into public.guests(wedding_id,name) values('${wa}','Invasão')`);
  await denied(
    `insert into storage.objects(bucket_id,name) values('wedding-images','${b}/${wa}/invasao.jpg')`,
  );
  await denied(
    `insert into public.user_preferences(id,selected_wedding_id) values('${b}','${wa}')`,
  );
  const updated = await query(
    `update public.guests set name='Invasão' where id='${ga}' returning id`,
  );
  assert.equal(updated.length, 0);
  checks++;
  assert.equal((await query(`delete from public.guests where id='${ga}' returning id`)).length, 0);
  checks++;
  await user(a);
  // The relational key rejects mixing weddings even for the same owner.
  await db.exec(
    `insert into public.weddings(id,name) values('20000000-0000-4000-8000-000000000003','Outro A')`,
  );
  await denied(
    `begin; insert into public.guests(wedding_id,name,companion_of) values('20000000-0000-4000-8000-000000000003','Outro','${ga}'); set constraints all immediate; commit;`,
    '23503',
  );
  // Deferred constraints are tested inside explicit transactions so failure rolls back.
  await db.exec('rollback');
  await user(a);
  await db.exec(`update public.weddings set archived=true where id='${wa}'`);
  await denied(`insert into public.gift_items(wedding_id,name) values('${wa}','Arquivado')`);
  assert.equal((await query(`select * from public.guests where wedding_id='${wa}'`)).length, 1);
  checks++;
  await db.exec(`update public.weddings set archived=false where id='${wa}'`);
  await db.exec('reset role; set role anon');
  for (const t of tables) await denied(`select * from public.${t.tablename}`);
  await user(a);
  await db.exec(`delete from public.weddings where id='${wa}'`);
  assert.equal((await query('select * from public.guests')).length, 0);
  checks++;
  await db.exec('reset role');
  for (const t of ['expenses', 'installments', 'financial_transactions']) {
    assert.equal((await query(`select * from public.${t}`)).length, 0);
    checks++;
  }
  assert.equal((await query(`select * from public.weddings where id='${wb}'`)).length, 1);
  checks++;
  console.log(
    `${checks} Postgres checks passed; ${tables.length} tables with RLS; no hosted changes.`,
  );
} finally {
  await db.close();
}
