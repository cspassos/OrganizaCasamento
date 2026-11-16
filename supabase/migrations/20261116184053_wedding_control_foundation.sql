-- Foundation only. Apply after inspecting the intended project's existing schema.
-- Values are integer cents; empty dates/foreign keys from IndexedDB become NULL.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create function app_private.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function app_private.touch_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 150),
  bride_name text not null default '', groom_name text not null default '',
  wedding_date date, ceremony_time time, reception_time time,
  ceremony_type text not null default '', style text not null default '',
  theme text not null default '', colors text not null default '',
  color_palette text[] not null default '{}', ceremony_description text not null default '',
  initial_budget_cents bigint not null default 0 check(initial_budget_cents between 0 and 99999999999),
  estimated_guests integer not null default 0 check(estimated_guests >= 0),
  capacity integer not null default 0 check(capacity >= 0),
  city text not null default '', state text not null default '',
  ceremony_venue text not null default '', ceremony_address text not null default '',
  reception_venue text not null default '', reception_address text not null default '',
  photo_path text, notes text not null default '', archived boolean not null default false,
  temporary_seed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(wedding_date is null or wedding_date between date '1900-01-01' and date '2200-12-31')
);
create index weddings_owner_idx on public.weddings(owner_id);

create table public.user_preferences (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  selected_wedding_id uuid references public.weddings(id) on delete set null,
  dark boolean not null default false, collapsed boolean not null default false,
  updated_at timestamptz not null default now()
);
create index user_preferences_wedding_idx on public.user_preferences(selected_wedding_id);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 200),
  company text not null default '', document text not null default '',
  category text not null default 'Outros', service text not null default '',
  phone text not null default '', whatsapp text not null default '', email text not null default '',
  address text not null default '', responsible text not null default '',
  status text not null default 'prospecting' check(status in ('prospecting','quoted','contracted','inactive')),
  notes text not null default '', attachment_path text,
  rating smallint not null default 0 check(rating between 0 and 5), review text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id)
);
create table public.finance_settings (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  budget_cents bigint check(budget_cents between 0 and 99999999999),
  reserve_cents bigint not null default 0 check(reserve_cents between 0 and 99999999999),
  updated_at timestamptz not null default now()
);
create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 150),
  budget_cents bigint not null default 0 check(budget_cents between 0 and 99999999999),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id)
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  category_id uuid not null, supplier_id uuid,
  description text not null check(length(btrim(description)) between 1 and 300),
  supplier_name text not null default '',
  planned_cents bigint not null default 0 check(planned_cents between 0 and 99999999999),
  contracted_cents bigint not null default 0 check(contracted_cents between 0 and 99999999999),
  status text not null default 'planned' check(status in ('planned','contracted','cancelled')),
  contract_date date, due_date date, method text not null default '',
  notes text not null default '', contract_reference text not null default '', attachment_path text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id),
  foreign key(wedding_id,category_id) references public.finance_categories(wedding_id,id),
  foreign key(wedding_id,supplier_id) references public.suppliers(wedding_id,id)
);
create index expenses_category_idx on public.expenses(wedding_id,category_id);
create index expenses_supplier_idx on public.expenses(wedding_id,supplier_id);
create index expenses_status_idx on public.expenses(wedding_id,status);
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  expense_id uuid not null, number integer not null check(number >= 0),
  label text not null,
  amount_cents bigint not null check(amount_cents between 0 and 99999999999), due_date date not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id), unique(wedding_id,expense_id,id), unique(wedding_id,expense_id,number),
  foreign key(wedding_id,expense_id) references public.expenses(wedding_id,id) on delete cascade
);
create index installments_due_idx on public.installments(wedding_id,due_date);
create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  expense_id uuid not null, installment_id uuid not null,
  kind text not null check(kind in ('payment','refund','discount','interest','fine')),
  amount_cents bigint not null check(amount_cents between 1 and 99999999999),
  transaction_date date not null, method text not null default '', notes text not null default '',
  payment_id uuid, attachment_path text, voided_at timestamptz, void_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id),
  foreign key(wedding_id,expense_id,installment_id) references public.installments(wedding_id,expense_id,id) on delete cascade,
  foreign key(wedding_id,payment_id) references public.financial_transactions(wedding_id,id) deferrable initially deferred,
  check(voided_at is null or length(btrim(coalesce(void_reason,''))) > 0)
);
create index financial_transactions_installment_idx on public.financial_transactions(wedding_id,expense_id,installment_id);
create index financial_transactions_payment_idx on public.financial_transactions(wedding_id,payment_id);
create index financial_transactions_date_idx on public.financial_transactions(wedding_id,transaction_date);
create table public.finance_audit (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  occurred_at timestamptz not null default now(), action text not null,
  entity_id text not null default '', detail text not null default ''
);
create index finance_audit_wedding_date_idx on public.finance_audit(wedding_id,occurred_at);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 200), notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id)
);
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 200),
  family_id uuid, companion_of uuid, phone text not null default '', whatsapp text not null default '',
  email text not null default '', relationship text not null default '',
  side text not null default 'Ambos' check(side in ('Ambos','Noiva','Noivo')),
  child boolean not null default false, age integer check(age between 0 and 130),
  invitation_sent boolean not null default false, sent_date date,
  status text not null default 'Ainda não convidado' check(status in ('Ainda não convidado','Convite preparado','Convite enviado','Aguardando confirmação','Confirmado','Não comparecerá')),
  notes text not null default '', legacy_details jsonb not null default '{}' check(jsonb_typeof(legacy_details) = 'object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id),
  foreign key(wedding_id,family_id) references public.families(wedding_id,id) deferrable initially deferred,
  foreign key(wedding_id,companion_of) references public.guests(wedding_id,id) deferrable initially deferred,
  check(companion_of is distinct from id)
);
create index guests_family_idx on public.guests(wedding_id,family_id);
create index guests_companion_idx on public.guests(wedding_id,companion_of);
create index guests_name_idx on public.guests(wedding_id,lower(name));
create index guests_status_idx on public.guests(wedding_id,status);
create table public.special_participations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null, partner_id uuid, participation text not null,
  notes text not null default '', legacy_details jsonb not null default '{}' check(jsonb_typeof(legacy_details) = 'object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id), unique(wedding_id,guest_id),
  foreign key(wedding_id,guest_id) references public.guests(wedding_id,id) on delete cascade,
  foreign key(wedding_id,partner_id) references public.special_participations(wedding_id,id) deferrable initially deferred,
  check(partner_id is distinct from id)
);
create index special_participations_partner_idx on public.special_participations(wedding_id,partner_id);

create table public.invitation_designs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null, design jsonb not null check(jsonb_typeof(design) = 'object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id)
);
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  design_id uuid, design_snapshot jsonb not null check(jsonb_typeof(design_snapshot) = 'object'),
  token_hash text unique, active boolean not null default true,
  recipient_label text not null, unit_key text not null, sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(wedding_id,id),
  foreign key(wedding_id,design_id) references public.invitation_designs(wedding_id,id)
);
create index invitations_design_idx on public.invitations(wedding_id,design_id);
create unique index invitations_active_unit_idx on public.invitations(wedding_id,unit_key) where active;
create table public.invitation_guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  invitation_id uuid not null, guest_id uuid not null, name_snapshot text not null,
  unique(wedding_id,invitation_id,guest_id),
  foreign key(wedding_id,invitation_id) references public.invitations(wedding_id,id) on delete cascade,
  foreign key(wedding_id,guest_id) references public.guests(wedding_id,id)
);
create index invitation_guests_guest_idx on public.invitation_guests(wedding_id,guest_id);
create table public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  invitation_id uuid not null, guest_id uuid not null, attending boolean not null,
  notes text not null default '', responded_at timestamptz not null default now(),
  foreign key(wedding_id,invitation_id,guest_id) references public.invitation_guests(wedding_id,invitation_id,guest_id) on delete cascade
);
create index rsvp_responses_guest_idx on public.rsvp_responses(wedding_id,invitation_id,guest_id);
create table public.invitation_messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  action text not null, message text not null, unique(wedding_id,action),
  updated_at timestamptz not null default now()
);
create table public.whatsapp_queues (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  queue jsonb not null check(jsonb_typeof(queue) = 'object'), updated_at timestamptz not null default now()
);

create table public.gift_lists (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  title text not null default 'Lista de presentes' check(length(btrim(title)) between 1 and 100),
  message text not null default '' check(length(message) <= 1200),
  updated_at timestamptz not null default now()
);
create table public.gift_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 150),
  description text not null default '' check(length(description) <= 1500),
  price_cents bigint check(price_cents between 0 and 99999999999),
  product_url text not null default '' check(product_url = '' or product_url ~ '^https?://'), photo_path text,
  quantity integer not null default 1 check(quantity between 1 and 9999),
  received_quantity integer not null default 0 check(received_quantity between 0 and 9999),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.external_gift_lists (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null, url text not null check(url ~ '^https?://'),
  updated_at timestamptz not null default now()
);
-- Historical modules are not reintroduced into the simplified UI.
create table public.legacy_snapshots (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  module text not null, payload jsonb not null check(jsonb_typeof(payload) = 'object'),
  imported_at timestamptz not null default now(), unique(wedding_id,module)
);

-- Explicit grants + owner policies. No anonymous access to private wedding data.
alter table public.weddings enable row level security;
alter table public.weddings force row level security;
revoke all on public.weddings from public, anon, authenticated;
grant select,insert,update,delete on public.weddings to authenticated;
create policy wedding_owner_select on public.weddings for select to authenticated using(owner_id = (select auth.uid()));
create policy wedding_owner_insert on public.weddings for insert to authenticated with check(owner_id = (select auth.uid()));
create policy wedding_owner_update on public.weddings for update to authenticated using(owner_id = (select auth.uid())) with check(owner_id = (select auth.uid()));
create policy wedding_owner_delete on public.weddings for delete to authenticated using(owner_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['profiles','user_preferences'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy own_profile on public.%I for all to authenticated using(id = (select auth.uid())) with check(id = (select auth.uid()))',t);
  end loop;
  foreach t in array array['suppliers','finance_settings','finance_categories','expenses','installments','financial_transactions','finance_audit','families','guests','special_participations','invitation_designs','invitations','invitation_guests','rsvp_responses','invitation_messages','whatsapp_queues','gift_lists','gift_items','external_gift_lists','legacy_snapshots'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy wedding_read on public.%I for select to authenticated using(wedding_id in (select id from public.weddings where owner_id = (select auth.uid())))',t);
    execute format('create policy wedding_insert on public.%I for insert to authenticated with check(wedding_id in (select id from public.weddings where owner_id = (select auth.uid()) and not archived))',t);
    execute format('create policy wedding_update on public.%I for update to authenticated using(wedding_id in (select id from public.weddings where owner_id = (select auth.uid()) and not archived)) with check(wedding_id in (select id from public.weddings where owner_id = (select auth.uid()) and not archived))',t);
    execute format('create policy wedding_delete on public.%I for delete to authenticated using(wedding_id in (select id from public.weddings where owner_id = (select auth.uid()) and not archived))',t);
    -- May duplicate an existing index prefix; only add if none starts with wedding_id.
    if not exists(select 1 from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=i.indkey[0] where i.indrelid=format('public.%I',t)::regclass and a.attname='wedding_id') then
      execute format('create index %I on public.%I(wedding_id)',t || '_wedding_idx',t);
    end if;
  end loop;
  for t in select table_name from information_schema.columns where table_schema='public' and column_name='updated_at' and table_name in ('profiles','user_preferences','weddings','suppliers','finance_settings','finance_categories','expenses','installments','financial_transactions','families','guests','special_participations','invitation_designs','invitations','invitation_messages','whatsapp_queues','gift_lists','gift_items','external_gift_lists') loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function app_private.touch_updated_at()',t);
  end loop;
end;
$$;

create policy selected_wedding_owned on public.user_preferences as restrictive for all to authenticated
using(true) with check(selected_wedding_id is null or selected_wedding_id in (select id from public.weddings where owner_id = (select auth.uid())));

-- Financial writes will be enabled only through transactional RPCs during integration.
-- Prevent direct REST writes that could bypass balances, audit and installment rules.
revoke insert,update,delete on public.finance_settings, public.finance_categories, public.expenses,
public.installments, public.financial_transactions, public.finance_audit from authenticated;

grant usage on schema public to authenticated;
comment on table public.financial_transactions is 'Private ledger. Amounts in cents; voiding preserves history. Direct client writes disabled until financial RPC integration.';
comment on table public.legacy_snapshots is 'Private migration archive for previous contracts, quotes and staff; not a new operational module.';
commit;
