-- Atomic, versioned application records. Relational tables are synchronized in
-- the same transaction; clients cannot bypass balances with direct REST writes.
begin;
create table public.wedding_workspaces (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  wedding jsonb not null check(jsonb_typeof(wedding)='object'),
  finance jsonb, people jsonb, suppliers jsonb, invitations jsonb, gifts jsonb,
  revision bigint not null default 1,
  import_hash text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index wedding_workspaces_owner_idx on public.wedding_workspaces(owner_id);
alter table public.wedding_workspaces enable row level security;
alter table public.wedding_workspaces force row level security;
revoke all on public.wedding_workspaces from public,anon,authenticated;
grant select on public.wedding_workspaces to authenticated;
create policy workspace_owner on public.wedding_workspaces for select to authenticated
  using(owner_id=(select auth.uid()));
alter table public.user_preferences add column data jsonb not null default '{}'::jsonb;

create function app_private.validate_workspace(p_id uuid,p_data jsonb,p_old jsonb default null) returns void
language plpgsql security invoker set search_path='' as $$
declare domain text; collection text; item jsonb; previous jsonb; replacement jsonb;
begin
  if jsonb_typeof(p_data) is distinct from 'object' or (p_data->'wedding'->>'id')::uuid is distinct from p_id
    or coalesce((p_data->'wedding'->>'demo')::boolean,false)
    or coalesce((p_data->'wedding'->>'temporarySeed')::boolean,false) then
    raise exception 'Cadastro de casamento inválido.' using errcode='22023';
  end if;
  foreach domain in array array['finance','people','suppliers','invitations','gifts'] loop
    item:=p_data->domain;
    if item is null or item='null'::jsonb then continue; end if;
    if jsonb_typeof(item)<>'object' or (item->>'id')::uuid is distinct from p_id
      or (item->>'weddingId')::uuid is distinct from p_id then
      raise exception 'Os dados pertencem a outro casamento.' using errcode='22023';
    end if;
    for collection in select key from jsonb_each(item) where jsonb_typeof(value)='array' loop
      for replacement in select value from jsonb_array_elements(item->collection) loop
        if jsonb_typeof(replacement)='object' and replacement ? 'weddingId'
          and (replacement->>'weddingId')::uuid is distinct from p_id then
          raise exception 'Registro de outro casamento.' using errcode='22023';
        end if;
      end loop;
    end loop;
  end loop;
  -- A previously recorded financial operation may only be voided, with a reason.
  for previous in select value from jsonb_array_elements(coalesce(nullif(p_old->'finance'->'transactions','null'::jsonb),'[]')) loop
    select value into replacement from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'transactions','null'::jsonb),'[]')) where value->>'id'=previous->>'id';
    if replacement is null or replacement-array['voidedAt','voidReason'] is distinct from previous-array['voidedAt','voidReason']
      or (coalesce(previous->>'voidedAt','')<>'' and replacement is distinct from previous) then
      raise exception 'Operações registradas devem ser preservadas. Use Desfazer operação.' using errcode='22023';
    end if;
  end loop;
  for previous in select value from jsonb_array_elements(coalesce(nullif(p_old->'finance'->'audit','null'::jsonb),'[]')) loop
    if not coalesce(p_data->'finance'->'audit','[]') @> jsonb_build_array(previous) then
      raise exception 'O histórico financeiro deve ser preservado.' using errcode='22023';
    end if;
  end loop;
end; $$;
revoke all on function app_private.validate_workspace(uuid,jsonb,jsonb) from public,anon,authenticated;

create or replace function app_private.project_workspace(p_id uuid,p_data jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
set constraints all deferred;
delete from public.rsvp_responses where wedding_id=p_id;
delete from public.invitation_guests where wedding_id=p_id;
delete from public.invitations where wedding_id=p_id;
delete from public.invitation_designs where wedding_id=p_id;
delete from public.special_participations where wedding_id=p_id;
delete from public.guests where wedding_id=p_id;
delete from public.families where wedding_id=p_id;
delete from public.financial_transactions where wedding_id=p_id;
delete from public.installments where wedding_id=p_id;
delete from public.finance_audit where wedding_id=p_id;
delete from public.expenses where wedding_id=p_id;
delete from public.finance_categories where wedding_id=p_id;
delete from public.suppliers where wedding_id=p_id;
delete from public.gift_items where wedding_id=p_id;
delete from public.external_gift_lists where wedding_id=p_id;
delete from public.gift_lists where wedding_id=p_id;
delete from public.finance_settings where wedding_id=p_id;
delete from public.invitation_messages where wedding_id=p_id;
delete from public.whatsapp_queues where wedding_id=p_id;
delete from public.legacy_snapshots where wedding_id=p_id;
insert into public.suppliers(wedding_id,id,name,company,document,category,service,phone,whatsapp,email,address,responsible,status,notes,rating,review,created_at) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(j->>'company', ''),coalesce(j->>'document', ''),coalesce(j->>'category', 'Outros'),coalesce(j->>'service', ''),coalesce(j->>'phone', ''),coalesce(j->>'whatsapp', ''),coalesce(j->>'email', ''),coalesce(j->>'address', ''),coalesce(j->>'responsible', ''),coalesce(j->>'status', 'prospecting'),coalesce(j->>'notes', ''),coalesce(nullif(j->>'rating','')::bigint,0),coalesce(j->>'review', ''),coalesce(nullif(j->>'createdAt','')::timestamptz,now()) from jsonb_array_elements(coalesce(nullif(p_data->'suppliers'->'suppliers','null'::jsonb),'[]'::jsonb)) j;
insert into public.finance_categories(wedding_id,id,name,budget_cents) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(nullif(j->>'budgetCents','')::bigint,0) from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'categories','null'::jsonb),'[]'::jsonb)) j;
insert into public.expenses(wedding_id,id,category_id,supplier_id,description,supplier_name,planned_cents,contracted_cents,status,contract_date,due_date,method,notes,contract_reference,created_at) select p_id,nullif(j->>'id','')::uuid,nullif(j->>'categoryId','')::uuid,nullif(j->>'supplierId','')::uuid,coalesce(j->>'description', ''),coalesce(j->>'supplier', ''),coalesce(nullif(j->>'plannedCents','')::bigint,0),coalesce(nullif(j->>'contractedCents','')::bigint,0),coalesce(j->>'status', 'planned'),nullif(j->>'contractDate','')::date,nullif(j->>'dueDate','')::date,coalesce(j->>'method', ''),coalesce(j->>'notes', ''),coalesce(j->>'contractReference', ''),coalesce(nullif(j->>'createdAt','')::timestamptz,now()) from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'expenses','null'::jsonb),'[]'::jsonb)) j;
insert into public.installments(wedding_id,id,expense_id,number,label,amount_cents,due_date) select p_id,nullif(j->>'id','')::uuid,nullif(j->>'expenseId','')::uuid,coalesce(nullif(j->>'number','')::bigint,0),coalesce(j->>'label', ''),coalesce(nullif(j->>'amountCents','')::bigint,0),nullif(j->>'dueDate','')::date from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'installments','null'::jsonb),'[]'::jsonb)) j;
insert into public.financial_transactions(wedding_id,id,expense_id,installment_id,kind,amount_cents,transaction_date,method,notes,payment_id,voided_at,void_reason,created_at) select p_id,nullif(j->>'id','')::uuid,nullif(j->>'expenseId','')::uuid,nullif(j->>'installmentId','')::uuid,coalesce(j->>'kind', ''),coalesce(nullif(j->>'amountCents','')::bigint,0),nullif(j->>'date','')::date,coalesce(j->>'method', ''),coalesce(j->>'notes', ''),nullif(j->>'paymentId','')::uuid,nullif(j->>'voidedAt','')::timestamptz,nullif(j->>'voidReason',''),coalesce(nullif(j->>'createdAt','')::timestamptz,now()) from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'transactions','null'::jsonb),'[]'::jsonb)) j;
insert into public.finance_audit(wedding_id,id,occurred_at,action,entity_id,detail) select p_id,nullif(j->>'id','')::uuid,(j->>'at')::timestamptz,coalesce(j->>'action', ''),coalesce(j->>'entityId', ''),coalesce(j->>'detail', '') from jsonb_array_elements(coalesce(nullif(p_data->'finance'->'audit','null'::jsonb),'[]'::jsonb)) j;
insert into public.families(wedding_id,id,name,notes) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(j->>'notes', '') from jsonb_array_elements(coalesce(nullif(p_data->'people'->'families','null'::jsonb),'[]'::jsonb)) j;
insert into public.guests(wedding_id,id,name,family_id,companion_of,phone,whatsapp,email,relationship,side,child,age,invitation_sent,sent_date,status,notes,legacy_details) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),nullif(j->>'familyId','')::uuid,nullif(j->>'companionOf','')::uuid,coalesce(j->>'phone', ''),coalesce(j->>'whatsapp', ''),coalesce(j->>'email', ''),coalesce(j->>'relationship', ''),coalesce(j->>'side', 'Ambos'),coalesce((j->>'child')::boolean,false),nullif(j->>'age','')::integer,coalesce((j->>'invitationSent')::boolean,false),nullif(j->>'sentDate','')::date,coalesce(j->>'status', 'Ainda nÃ£o convidado'),coalesce(j->>'notes', ''),j - array['id','weddingId','name','familyId','companionOf','phone','whatsapp','email','relationship','side','child','age','invitationSent','sentDate','status','notes'] from jsonb_array_elements(coalesce(nullif(p_data->'people'->'guests','null'::jsonb),'[]'::jsonb)) j;
insert into public.special_participations(wedding_id,id,guest_id,partner_id,participation,notes,legacy_details) select p_id,nullif(j->>'id','')::uuid,nullif(j->>'guestId','')::uuid,nullif(j->>'partnerId','')::uuid,coalesce(j->>'participation', ''),coalesce(j->>'notes', ''),j - array['id','weddingId','guestId','partnerId','participation','notes'] from jsonb_array_elements(coalesce(nullif(p_data->'people'->'godparents','null'::jsonb),'[]'::jsonb)) j;
insert into public.invitation_designs(wedding_id,id,title,design) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'title', ''),j from jsonb_array_elements(coalesce(nullif(p_data->'invitations'->'designs','null'::jsonb),'[]'::jsonb)) j;
insert into public.invitations(wedding_id,id,design_id,design_snapshot,token_hash,active,recipient_label,unit_key,sent_at,created_at) select p_id,nullif(j->>'id','')::uuid,case when exists(select 1 from public.invitation_designs d where d.wedding_id=p_id and d.id=nullif(j->>'designId','')::uuid) then nullif(j->>'designId','')::uuid else null end,j->'design',encode(sha256(convert_to(j->>'token','UTF8')),'hex'),coalesce((j->>'active')::boolean,true),coalesce(j->>'recipientLabel', ''),coalesce(j->>'unitKey', ''),nullif(j->>'sentAt','')::timestamptz,coalesce(nullif(j->>'createdAt','')::timestamptz,now()) from jsonb_array_elements(coalesce(nullif(p_data->'invitations'->'issues','null'::jsonb),'[]'::jsonb)) j;
insert into public.gift_items(wedding_id,id,name,description,price_cents,product_url,photo_path,quantity,received_quantity) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(j->>'description', ''),nullif(j->>'priceCents','')::bigint,coalesce(j->>'url', ''),j->'photo'->'__oc_file'->>'path',coalesce(nullif(j->>'quantity','')::bigint,1),coalesce(nullif(j->>'receivedQuantity','')::integer,case when (j->>'received')::boolean then coalesce((j->>'quantity')::integer,1) else 0 end) from jsonb_array_elements(coalesce(nullif(p_data->'gifts'->'items','null'::jsonb),'[]'::jsonb)) j;
insert into public.external_gift_lists(wedding_id,id,name,url) select p_id,nullif(j->>'id','')::uuid,coalesce(j->>'name', ''),coalesce(j->>'url', '') from jsonb_array_elements(coalesce(nullif(p_data->'gifts'->'sites','null'::jsonb),'[]'::jsonb)) j;
if p_data->'finance' <> 'null'::jsonb and p_data ? 'finance' then
insert into public.finance_settings(wedding_id,budget_cents,reserve_cents) values(p_id,nullif(p_data->'finance'->>'budgetCents','')::bigint,coalesce((p_data->'finance'->>'reserveCents')::bigint,0));end if;
if p_data->'gifts' <> 'null'::jsonb and p_data ? 'gifts' then
insert into public.gift_lists(wedding_id,title,message) values(p_id,coalesce(p_data->'gifts'->>'title','Lista de presentes'),coalesce(p_data->'gifts'->>'message',''));end if;
insert into public.legacy_snapshots(wedding_id,module,payload) select p_id,'supplier_history',p_data->'suppliers' where p_data->'suppliers' <> 'null'::jsonb;
insert into public.invitation_messages(wedding_id,action,message) select p_id,key,value from jsonb_each_text(coalesce(nullif(p_data->'invitations'->'messages','null'::jsonb),'{}'::jsonb));
insert into public.whatsapp_queues(wedding_id,queue) select p_id,p_data->'invitations'->'whatsappQueue' where jsonb_typeof(p_data->'invitations'->'whatsappQueue')='object';
insert into public.invitation_guests(wedding_id,invitation_id,guest_id,name_snapshot)
select p_id,(issue->>'id')::uuid,(recipient->>'guestId')::uuid,recipient->>'name'
from jsonb_array_elements(coalesce(nullif(p_data->'invitations'->'issues','null'::jsonb),'[]'::jsonb)) issue
cross join lateral jsonb_array_elements(issue->'recipients') recipient
where exists(select 1 from public.guests g where g.wedding_id=p_id and g.id=(recipient->>'guestId')::uuid);
insert into public.rsvp_responses(wedding_id,invitation_id,guest_id,attending,notes,responded_at)
select p_id,(issue->>'id')::uuid,(answer->>'guestId')::uuid,(answer->>'attending')::boolean,coalesce(answer->>'diet',''),(response->>'at')::timestamptz
from jsonb_array_elements(coalesce(nullif(p_data->'invitations'->'issues','null'::jsonb),'[]'::jsonb)) issue
cross join lateral jsonb_array_elements(issue->'responses') response
cross join lateral jsonb_array_elements(response->'answers') answer
where exists(select 1 from public.invitation_guests g where g.wedding_id=p_id and g.invitation_id=(issue->>'id')::uuid and g.guest_id=(answer->>'guestId')::uuid);
set constraints all immediate;
end;$$;
revoke all on function app_private.project_workspace(uuid,jsonb) from public,anon,authenticated;

create function app_private.check_balances(p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if exists(select 1 from public.expenses e where e.wedding_id=p_id and e.status<>'planned'
    and e.contracted_cents<>(select coalesce(sum(i.amount_cents),0) from public.installments i where i.wedding_id=p_id and i.expense_id=e.id)) then
    raise exception 'A soma das parcelas deve ser igual ao valor contratado.' using errcode='22023';
  end if;
  if exists(select 1 from public.installments i left join lateral (
    select coalesce(sum(case when t.kind in ('interest','fine') then t.amount_cents when t.kind='discount' then -t.amount_cents else 0 end),0) adjustment,
    coalesce(sum(case when t.kind='payment' then t.amount_cents when t.kind='refund' then -t.amount_cents else 0 end),0) paid
    from public.financial_transactions t where t.wedding_id=p_id and t.installment_id=i.id and t.voided_at is null
    ) b on true where i.wedding_id=p_id and (b.paid<0 or i.amount_cents+b.adjustment<0 or b.paid>i.amount_cents+b.adjustment)) then
    raise exception 'A operação ultrapassa o saldo disponível da parcela.' using errcode='22023';
  end if;
  if exists(select 1 from public.financial_transactions t where t.wedding_id=p_id and t.kind='refund' and t.voided_at is null
    and not exists(select 1 from public.financial_transactions p where p.wedding_id=p_id and p.id=t.payment_id and p.kind='payment' and p.voided_at is null and p.installment_id=t.installment_id)) then
    raise exception 'A devolução precisa estar vinculada a um pagamento válido.' using errcode='22023';
  end if;
  if exists(select 1 from public.financial_transactions p where p.wedding_id=p_id and p.kind='payment' and p.voided_at is null
    and p.amount_cents<(select coalesce(sum(r.amount_cents),0) from public.financial_transactions r where r.wedding_id=p_id and r.payment_id=p.id and r.kind='refund' and r.voided_at is null)) then
    raise exception 'A devolução ultrapassa o pagamento.' using errcode='22023';
  end if;
  if exists(select 1 from public.financial_transactions t join public.expenses e on e.wedding_id=p_id and e.id=t.expense_id
    where t.wedding_id=p_id and (e.status='planned' or (t.kind in ('payment','refund') and t.transaction_date>current_date))) then
    raise exception 'Confira a situação do gasto e a data do pagamento.' using errcode='22023';
  end if;
  if exists(select 1 from public.expenses e where e.wedding_id=p_id and e.status='cancelled' and 0<>(select coalesce(sum(case when t.kind='payment' then t.amount_cents when t.kind='refund' then -t.amount_cents else 0 end),0) from public.financial_transactions t where t.wedding_id=p_id and t.expense_id=e.id and t.voided_at is null)) then
    raise exception 'Devolva ou desfaça os pagamentos antes de cancelar o gasto.' using errcode='22023';
  end if;
end; $$;
revoke all on function app_private.check_balances(uuid) from public,anon,authenticated;

create function app_private.commit_workspace(p_id uuid,p_version bigint,p_data jsonb,p_metadata_only boolean,p_import_hash text default null) returns bigint
language plpgsql security definer set search_path='' as $$
declare previous public.wedding_workspaces; w jsonb; next_revision bigint; old_data jsonb;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
  -- Serialize new rows as well as updates, including concurrent initial imports.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into previous from public.wedding_workspaces where wedding_id=p_id for update;
  if found then
    if previous.owner_id<>auth.uid() then raise exception 'Cadastro indisponível.' using errcode='42501'; end if;
    if p_import_hash is not null and previous.import_hash=p_import_hash then return previous.revision; end if;
    if p_import_hash is not null or p_version is distinct from previous.revision then
      raise exception 'Os dados mudaram. Atualize antes de salvar.' using errcode='40001';
    end if;
    old_data:=to_jsonb(previous);
    if (previous.wedding->>'archived')::boolean and not p_metadata_only then
      raise exception 'Restaure o casamento antes de alterar.' using errcode='22023';
    end if;
    if p_metadata_only and (p_data-array['wedding','revision','owner_id','wedding_id','created_at','updated_at','import_hash'])
      is distinct from (old_data-array['wedding','revision','owner_id','wedding_id','created_at','updated_at','import_hash']) then
      raise exception 'A alteração deve preservar os demais cadastros.' using errcode='22023';
    end if;
  elsif p_version is not null then
    raise exception 'Cadastro removido. Atualize antes de salvar.' using errcode='40001';
  end if;
  perform app_private.validate_workspace(p_id,p_data,old_data);
  w:=p_data->'wedding'; next_revision:=coalesce(previous.revision,0)+1;
  insert into public.weddings(id,owner_id,name,bride_name,groom_name,wedding_date,ceremony_time,reception_time,
    ceremony_type,style,theme,colors,color_palette,ceremony_description,initial_budget_cents,estimated_guests,capacity,
    city,state,ceremony_venue,ceremony_address,reception_venue,reception_address,photo_path,notes,archived,created_at)
  values(p_id,auth.uid(),w->>'name',coalesce(w->>'brideName',''),coalesce(w->>'groomName',''),nullif(w->>'date','')::date,
    nullif(w->>'ceremonyTime','')::time,nullif(w->>'receptionTime','')::time,coalesce(w->>'ceremonyType',''),coalesce(w->>'style',''),
    coalesce(w->>'theme',''),coalesce(w->>'colors',''),array(select jsonb_array_elements_text(coalesce(w->'colorPalette','[]'))),
    coalesce(w->>'ceremonyDescription',''),round(coalesce((w->>'initialBudget')::numeric,0)*100)::bigint,
    coalesce((w->>'estimatedGuests')::integer,0),coalesce((w->>'capacity')::integer,0),coalesce(w->>'city',''),coalesce(w->>'state',''),
    coalesce(w->>'ceremonyVenue',''),coalesce(w->>'ceremonyAddress',''),coalesce(w->>'receptionVenue',''),coalesce(w->>'receptionAddress',''),
    w->'photo'->'__oc_file'->>'path',coalesce(w->>'notes',''),coalesce((w->>'archived')::boolean,false),coalesce((w->>'createdAt')::timestamptz,now()))
  on conflict(id) do update set name=excluded.name,bride_name=excluded.bride_name,groom_name=excluded.groom_name,wedding_date=excluded.wedding_date,
    ceremony_time=excluded.ceremony_time,reception_time=excluded.reception_time,ceremony_type=excluded.ceremony_type,style=excluded.style,
    theme=excluded.theme,colors=excluded.colors,color_palette=excluded.color_palette,ceremony_description=excluded.ceremony_description,
    initial_budget_cents=excluded.initial_budget_cents,estimated_guests=excluded.estimated_guests,capacity=excluded.capacity,city=excluded.city,state=excluded.state,
    ceremony_venue=excluded.ceremony_venue,ceremony_address=excluded.ceremony_address,reception_venue=excluded.reception_venue,
    reception_address=excluded.reception_address,photo_path=excluded.photo_path,notes=excluded.notes,archived=excluded.archived
  where public.weddings.owner_id=auth.uid();
  if not found then raise exception 'Cadastro indisponível.' using errcode='42501'; end if;
  perform app_private.project_workspace(p_id,p_data);
  perform app_private.check_balances(p_id);
  insert into public.wedding_workspaces(wedding_id,owner_id,wedding,finance,people,suppliers,invitations,gifts,revision,import_hash)
  values(p_id,auth.uid(),w,nullif(p_data->'finance','null'),nullif(p_data->'people','null'),nullif(p_data->'suppliers','null'),
    nullif(p_data->'invitations','null'),nullif(p_data->'gifts','null'),next_revision,p_import_hash)
  on conflict(wedding_id) do update set wedding=excluded.wedding,finance=excluded.finance,people=excluded.people,suppliers=excluded.suppliers,
    invitations=excluded.invitations,gifts=excluded.gifts,revision=excluded.revision,updated_at=now();
  return next_revision;
end; $$;
revoke all on function app_private.commit_workspace(uuid,bigint,jsonb,boolean,text) from public,anon,authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.commit_workspace(uuid,bigint,jsonb,boolean,text) to authenticated;

create function public.save_workspace(p_id uuid,p_version bigint,p_data jsonb,p_metadata_only boolean default false) returns bigint
language sql security invoker set search_path='' as $$select app_private.commit_workspace(p_id,p_version,p_data,p_metadata_only)$$;
create function public.import_workspace(p_id uuid,p_hash text,p_data jsonb) returns bigint
language plpgsql security invoker set search_path='' as $$begin
  if p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Backup inválido.' using errcode='22023'; end if;
  return app_private.commit_workspace(p_id,null,p_data,false,p_hash);
end;$$;
revoke all on function public.save_workspace(uuid,bigint,jsonb,boolean),public.import_workspace(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_workspace(uuid,bigint,jsonb,boolean),public.import_workspace(uuid,text,jsonb) to authenticated;

create function app_private.preference(p_key text,p_value jsonb) returns void
language plpgsql security definer set search_path='' as $$begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
  if p_key not in ('appearance','active-wedding') then raise exception 'Preferência inválida.' using errcode='22023'; end if;
  if p_key='active-wedding' and nullif(p_value->>'weddingId','') is not null and not exists(select 1 from public.weddings where id=(p_value->>'weddingId')::uuid and owner_id=auth.uid()) then
    raise exception 'Casamento indisponível.' using errcode='42501'; end if;
  insert into public.user_preferences(id,data) values(auth.uid(),case when p_value is null then '{}'::jsonb else jsonb_build_object(p_key,p_value) end)
  on conflict(id) do update set data=case when p_value is null then public.user_preferences.data-p_key else jsonb_set(public.user_preferences.data,array[p_key],p_value) end;
  update public.user_preferences set selected_wedding_id=nullif(data->'active-wedding'->>'weddingId','')::uuid,
    dark=coalesce((data->'appearance'->>'dark')::boolean,false),collapsed=coalesce((data->'appearance'->>'collapsed')::boolean,false) where id=auth.uid();
end;$$;
create function public.save_preference(p_key text,p_value jsonb) returns void language sql security invoker set search_path='' as $$select app_private.preference(p_key,p_value)$$;
revoke all on function app_private.preference(text,jsonb),public.save_preference(text,jsonb) from public,anon,authenticated;
grant execute on function app_private.preference(text,jsonb),public.save_preference(text,jsonb) to authenticated;

create function app_private.remove_workspace(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$begin
  if auth.uid() is null or not exists(select 1 from public.weddings where id=p_id and owner_id=auth.uid()) then
    raise exception 'Casamento indisponível.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  delete from public.weddings where id=p_id and owner_id=auth.uid();
  update public.user_preferences set data=data-'active-wedding' where id=auth.uid() and data->'active-wedding'->>'weddingId'=p_id::text;
end;$$;
create function public.delete_workspace(p_id uuid) returns void language sql security invoker set search_path='' as $$select app_private.remove_workspace(p_id)$$;
revoke all on function app_private.remove_workspace(uuid),public.delete_workspace(uuid) from public,anon,authenticated;
grant execute on function app_private.remove_workspace(uuid),public.delete_workspace(uuid) to authenticated;

-- All business writes use RPCs above. SELECT still uses table owner policies.
do $$declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename<>'profiles' loop
    execute format('revoke insert,update,delete on public.%I from anon,authenticated',t);
  end loop;
end;$$;
-- Uploads can precede initial wedding creation. Deletion can follow its removal.
-- Only the authenticated user's private namespace is accessible.
drop policy wedding_files_select on storage.objects;
drop policy wedding_files_insert on storage.objects;
drop policy wedding_files_update on storage.objects;
drop policy wedding_files_delete on storage.objects;
create policy wedding_files_select on storage.objects for select to authenticated using(bucket_id in ('wedding-images','wedding-documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy wedding_files_insert on storage.objects for insert to authenticated with check(bucket_id in ('wedding-images','wedding-documents') and (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2] ~ '^[a-f0-9-]{36}$');
create policy wedding_files_update on storage.objects for update to authenticated using(bucket_id in ('wedding-images','wedding-documents') and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id in ('wedding-images','wedding-documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy wedding_files_delete on storage.objects for delete to authenticated using(bucket_id in ('wedding-images','wedding-documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Capability-limited public RSVP. Token is a 256-bit random value; only its
-- digest is indexed. This endpoint never returns contacts or financial data.
create function app_private.invitation_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Convite não encontrado.' using errcode='22023'; end if;
  select jsonb_build_object('issue',jsonb_build_object('id',i.id,'weddingId',i.wedding_id,'design',i.design_snapshot,
    'recipientLabel',i.recipient_label,'active',true),'members',
    (select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'status',g.status,'diet',coalesce(g.legacy_details->>'diet','')) order by g.name)
    from public.invitation_guests ig join public.guests g on g.wedding_id=i.wedding_id and g.id=ig.guest_id
    where ig.wedding_id=i.wedding_id and ig.invitation_id=i.id)) into result
  from public.invitations i join public.weddings w on w.id=i.wedding_id
  where i.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and i.active and not w.archived;
  if result is null or result->'members'='null'::jsonb then raise exception 'Convite não encontrado ou desativado.' using errcode='22023'; end if;
  return result;
end;$$;
create function public.view_invitation(p_token text) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.invitation_view(p_token)$$;
create function app_private.invitation_respond(p_token text,p_answers jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare invitation public.invitations; workspace public.wedding_workspaces; data jsonb; issue jsonb; answer jsonb; updated_guests jsonb; updated_issues jsonb;
begin
  perform app_private.invitation_view(p_token);
  select * into invitation from public.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(invitation.wedding_id::text,0));
  -- Recheck after taking the same lock as owner writes (including deactivation).
  perform app_private.invitation_view(p_token);
  select * into workspace from public.wedding_workspaces where wedding_id=invitation.wedding_id for update;
  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>(select count(*) from public.invitation_guests where wedding_id=invitation.wedding_id and invitation_id=invitation.id)
    or jsonb_array_length(p_answers)<>(select count(distinct value->>'guestId') from jsonb_array_elements(p_answers)) then
    raise exception 'Responda uma vez por cada pessoa deste convite.' using errcode='22023'; end if;
  for answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(answer->'attending') is distinct from 'boolean' or length(coalesce(answer->>'diet',''))>500
      or not exists(select 1 from public.invitation_guests where wedding_id=invitation.wedding_id and invitation_id=invitation.id and guest_id=(answer->>'guestId')::uuid) then
      raise exception 'Resposta inválida para este convite.' using errcode='22023'; end if;
  end loop;
  select jsonb_agg(case when a is null then g else g||jsonb_build_object('status',case when (a->>'attending')::boolean then 'Confirmado' else 'Não comparecerá' end,'diet',btrim(coalesce(a->>'diet',''))) end order by n)
    into updated_guests from jsonb_array_elements(workspace.people->'guests') with ordinality guests(g,n)
    left join lateral (select value a from jsonb_array_elements(p_answers) where value->>'guestId'=g->>'id') answers on true;
  select jsonb_agg(case when i->>'id'=invitation.id::text then
    case when i->'responses'->-1->'answers'=p_answers then i else jsonb_set(i,'{responses}',coalesce(i->'responses','[]')||jsonb_build_array(jsonb_build_object('at',now(),'answers',p_answers))) end
    else i end order by n) into updated_issues from jsonb_array_elements(workspace.invitations->'issues') with ordinality issues(i,n);
  data:=to_jsonb(workspace);
  data:=jsonb_set(data,'{people,guests}',updated_guests);
  data:=jsonb_set(data,'{invitations,issues}',updated_issues);
  perform app_private.project_workspace(invitation.wedding_id,data);
  update public.wedding_workspaces set people=data->'people',invitations=data->'invitations',revision=revision+1,updated_at=now() where wedding_id=invitation.wedding_id;
end;$$;
create function public.respond_invitation(p_token text,p_answers jsonb) returns void language sql security invoker set search_path='' as $$select app_private.invitation_respond(p_token,p_answers)$$;
grant usage on schema app_private to anon;
revoke all on function app_private.invitation_view(text),public.view_invitation(text),app_private.invitation_respond(text,jsonb),public.respond_invitation(text,jsonb) from public,anon,authenticated;
grant execute on function app_private.invitation_view(text),public.view_invitation(text),app_private.invitation_respond(text,jsonb),public.respond_invitation(text,jsonb) to anon,authenticated;

create function app_private.can_read_invitation_image(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.invitations i join public.weddings w on w.id=i.wedding_id
    where i.active and not w.archived and i.design_snapshot->'photo'->'__oc_file'->>'path'=p_name
    and i.token_hash=encode(sha256(convert_to(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-invitation-token',''),'UTF8')),'hex'))
$$;
revoke all on function app_private.can_read_invitation_image(text) from public,anon,authenticated;
grant execute on function app_private.can_read_invitation_image(text) to anon,authenticated;
create policy invitation_image_with_token on storage.objects for select to anon,authenticated
using(bucket_id='wedding-images' and app_private.can_read_invitation_image(name));
commit;
