// End-to-end database contract in isolated PostgreSQL/WASM (no hosted writes).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '../artifacts/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const db = new PGlite();
let checks = 0;
let recording = false;
let sqlLog = [];
const literal = (v) =>
  v === null
    ? 'null'
    : typeof v === 'number' || typeof v === 'boolean'
      ? String(v)
      : "'" + String(typeof v === 'object' ? JSON.stringify(v) : v).replaceAll("'", "''") + "'";
const bind = (sql, args = []) => sql.replace(/\$(\d+)/g, (_, n) => literal(args[Number(n) - 1]));
const rawQuery = db.query.bind(db),
  rawExec = db.exec.bind(db);
db.query = async (sql, args) => {
  if (recording) sqlLog.push(bind(sql, args) + ';');
  return rawQuery(sql, args);
};
db.exec = async (sql) => {
  if (recording) sqlLog.push(sql + ';');
  return rawExec(sql);
};
const a = '10000000-0000-4000-8000-000000000001',
  b = '10000000-0000-4000-8000-000000000002',
  id = '20000000-0000-4000-8000-000000000001';
const uuid = (n) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function role(uid) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid ?? '']);
  await db.exec('set role ' + (uid ? 'authenticated' : 'anon'));
}
async function fails(sql, args, code) {
  if (recording)
    sqlLog.push(
      'do $$begin begin ' +
        bind(sql, args).replace(/^select /i, 'perform ') +
        ";raise exception 'Expected rejection';exception when sqlstate '" +
        code +
        "' then null;end;end;$$;",
    );
  await assert.rejects(
    () => rawQuery(sql, args),
    (e) => {
      assert.equal(e.code, code, e.message);
      return true;
    },
  );
  checks++;
}
async function save(state, version = null, metadata = false) {
  if (recording && metadata) {
    sqlLog.push(
      `select public.save_workspace('${id}',${version},(select jsonb_set(to_jsonb(w),'{wedding,archived}','true') from public.wedding_workspaces w where wedding_id='${id}'),true);`,
    );
    const r = await rawQuery('select public.save_workspace($1,$2,$3,$4) r', [
      id,
      version,
      state,
      metadata,
    ]);
    return Number(r.rows[0].r);
  }
  const r = await db.query('select public.save_workspace($1,$2,$3,$4) r', [
    id,
    version,
    state,
    metadata,
  ]);
  return Number(r.rows[0].r);
}
try {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key, email text, created_at timestamptz default now(),email_confirmed_at timestamptz,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:greatest(array_length(string_to_array($1,'/'),1)-1,0)]$$;
 alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant execute on function storage.foldername(text) to anon,authenticated;grant select,insert,update,delete on storage.objects to authenticated;
 insert into auth.users(id,email) values('${a}','ana@example.com'),('${b}','pedro@example.com');`);
  for (const f of (await fs.readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(await fs.readFile('supabase/migrations/' + f, 'utf8'));
  recording = true;
  await db.query('insert into public.app_administrators(user_id) values ($1)',[a]);
  await role(b);
  assert.equal((await db.query('select * from public.app_administrators')).rows.length,0); checks++;
  await fails('insert into public.app_administrators(user_id) values ($1)',[b],'42501');
  await fails('select public.administration_accounts($1,$2)',['',1],'42501');
  await fails('select * from public.administration_audit',[],'42501');
  await role(a);
  assert.equal((await db.query('select * from public.app_administrators')).rows.length,1); checks++;
  await fails('update public.app_administrators set must_change_password=false',[],'42501');
  await fails('select public.administration_accounts($1,$2)',['',1],'42501');
  await role(null);
  await fails('select public.administration_accounts($1,$2)',['',1],'42501');
  await db.exec('reset role');
  assert.equal((await db.query('select public.administration_accounts($1,$2) as result',['ANA',1])).rows[0].result.users[0].email,'ana@example.com'); checks++;
  await db.query('delete from public.app_administrators where user_id=$1',[a]);
  await role(a);
  const state = {
    wedding: { id, name: 'Ana e Pedro', date: '', demo: false, initialBudget: 23000 },
    finance: null,
    people: null,
    suppliers: null,
    invitations: null,
    gifts: null,
  };
  assert.equal(await save(state), 1);
  checks++;
  state.people = {
    id,
    weddingId: id,
    schemaVersion: 1,
    families: [],
    godparents: [],
    guests: [
      {
        id: uuid(1),
        weddingId: id,
        name: 'Maria',
        status: 'Aguardando confirmação',
        side: 'Noiva',
        phone: '11999998888',
      },
    ],
  };
  assert.equal(await save(state, 1), 2);
  checks++;
  assert.equal((await db.query('select name from public.guests')).rows[0].name, 'Maria');
  checks++;
  await fails('select public.save_workspace($1,$2,$3,false)', [id, 1, state], '40001');
  await fails('insert into public.guests(wedding_id,name) values($1,$2)', [id, 'Bypass'], '42501');
  await role(b);
  assert.equal((await db.query('select * from public.wedding_workspaces')).rows.length, 0);
  checks++;
  await fails('select public.save_workspace($1,$2,$3,false)', [id, 2, state], '42501');
  await fails('select public.delete_workspace($1)', [id], '42501');
  await role(a);
  state.finance = {
    id,
    weddingId: id,
    schemaVersion: 1,
    budgetCents: 2300000,
    reserveCents: 10000,
    categories: [{ id: uuid(2), weddingId: id, name: 'Buffet', budgetCents: 0 }],
    expenses: [
      {
        id: uuid(3),
        weddingId: id,
        categoryId: uuid(2),
        description: 'Buffet',
        status: 'contracted',
        plannedCents: 1200000,
        contractedCents: 1200000,
      },
    ],
    installments: [
      {
        id: uuid(4),
        weddingId: id,
        expenseId: uuid(3),
        number: 0,
        label: 'Entrada',
        amountCents: 200000,
        dueDate: '2026-01-01',
      },
      {
        id: uuid(5),
        weddingId: id,
        expenseId: uuid(3),
        number: 1,
        label: 'Restante',
        amountCents: 1000000,
        dueDate: '2027-01-01',
      },
    ],
    transactions: [],
    audit: [],
  };
  assert.equal(await save(state, 2), 3);
  checks++;
  state.finance.transactions = [
    {
      id: uuid(6),
      weddingId: id,
      expenseId: uuid(3),
      installmentId: uuid(4),
      kind: 'payment',
      amountCents: 200001,
      date: '2026-01-01',
    },
  ];
  await fails('select public.save_workspace($1,$2,$3,false)', [id, 3, state], '22023');
  assert.equal((await db.query('select * from public.financial_transactions')).rows.length, 0);
  checks++;
  state.finance.transactions[0].amountCents = 200000;
  assert.equal(await save(state, 3), 4);
  checks++;
  const bad = structuredClone(state);
  bad.finance.transactions = [];
  await fails('select public.save_workspace($1,$2,$3,false)', [id, 4, bad], '22023');
  const design = {
    id: uuid(7),
    weddingId: id,
    title: 'Convite',
    photo: '',
    bride: 'Ana',
    groom: 'Pedro',
  };
  const token = 'a'.repeat(64);
  state.invitations = {
    id,
    weddingId: id,
    schemaVersion: 1,
    designs: [design],
    messages: {},
    issues: [
      {
        id: uuid(8),
        weddingId: id,
        designId: uuid(7),
        design,
        token,
        active: true,
        recipientLabel: 'Maria',
        unitKey: 'guest:' + uuid(1),
        recipients: [{ guestId: uuid(1), name: 'Maria' }],
        responses: [],
      },
    ],
  };
  assert.equal(await save(state, 4), 5);
  checks++;
  await role(null);
  await fails('select * from public.wedding_workspaces', [], '42501');
  const view = (await db.query('select public.view_invitation($1) v', [token])).rows[0].v;
  assert.equal(view.members[0].name, 'Maria');
  assert(!JSON.stringify(view).includes('11999998888'));
  checks++;
  await fails('select public.view_invitation($1)', ['b'.repeat(64)], '22023');
  await fails(
    'select public.respond_invitation($1,$2)',
    [token, [{ guestId: uuid(99), attending: true }]],
    '22023',
  );
  await db.query('select public.respond_invitation($1,$2)', [
    token,
    [{ guestId: uuid(1), attending: true, diet: '' }],
  ]);
  assert.equal(
    (await db.query('select public.view_invitation($1) v', [token])).rows[0].v.members[0].status,
    'Confirmado',
  );
  checks++;
  await role(a);
  const current = (await db.query('select * from public.wedding_workspaces')).rows[0];
  assert.equal(Number(current.revision), 6);
  checks++;
  await fails('select public.save_workspace($1,$2,$3,false)', [id, 5, state], '40001');
  const archived = { ...current, wedding: { ...current.wedding, archived: true } };
  assert.equal(await save(archived, 6, true), 7);
  checks++;
  await fails('select public.save_workspace($1,$2,$3,false)', [id, 7, archived], '22023');
  await role(null);
  await fails('select public.view_invitation($1)', [token], '22023');
  await role(a);
  await db.query('select public.save_preference($1,$2)', [
    'appearance',
    { id: 'appearance', dark: true, collapsed: false },
  ]);
  assert.equal((await db.query('select dark from public.user_preferences')).rows[0].dark, true);
  checks++;
  await db.query('select public.delete_workspace($1)', [id]);
  assert.equal((await db.query('select * from public.guests')).rows.length, 0);
  checks++;
  const hash = 'c'.repeat(64);
  await db.query('select public.import_workspace($1,$2,$3)', [id, hash, state]);
  await db.query('select public.import_workspace($1,$2,$3)', [id, hash, state]);
  assert.equal(
    (await db.query('select revision from public.wedding_workspaces')).rows[0].revision,
    1,
  );
  checks++;
  await fails('select public.import_workspace($1,$2,$3)', [id, 'd'.repeat(64), state], '40001');
  await fs.writeFile(
    'supabase/tests/cloud_smoke.sql',
    "-- Generated by scripts/test-cloud-workspaces.mjs. All fixtures roll back.\nbegin;\ninsert into auth.users(id) values('" +
      a +
      "'),('" +
      b +
      "');\n" +
      sqlLog.join('\n') +
      "\nreset role;\nrollback;\nselect 'Cloud RPC smoke checks passed; fixtures rolled back' as result;\n",
  );
  console.log(
    `${checks} cloud transaction, ownership, projection, balance, RSVP and import checks passed.`,
  );
} finally {
  await db.close();
}
