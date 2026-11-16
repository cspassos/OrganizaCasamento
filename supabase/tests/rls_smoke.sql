-- Run as the migration/admin role. Every fixture is rolled back in this call.
begin;
insert into auth.users(id) values
('f1000000-0000-4000-8000-000000000001'),
('f1000000-0000-4000-8000-000000000002');
insert into public.weddings(id,owner_id,name) values
('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','RLS temporary A'),
('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','RLS temporary B');
insert into public.guests(id,wedding_id,name) values
('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','RLS temporary guest');
set local role authenticated;
set local request.jwt.claim.sub = 'f1000000-0000-4000-8000-000000000002';
do $$
begin
  if exists(select 1 from public.weddings where id='f2000000-0000-4000-8000-000000000001') then raise exception 'Cross-account wedding read'; end if;
  if exists(select 1 from public.guests where id='f3000000-0000-4000-8000-000000000001') then raise exception 'Cross-account guest read'; end if;
  update public.guests set name='Must not update' where id='f3000000-0000-4000-8000-000000000001';
  if found then raise exception 'Cross-account guest update'; end if;
  delete from public.weddings where id='f2000000-0000-4000-8000-000000000001';
  if found then raise exception 'Cross-account wedding delete'; end if;
  begin
    insert into public.gift_items(wedding_id,name) values('f2000000-0000-4000-8000-000000000001','Must not insert');
    raise exception 'Cross-account gift insert';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.user_preferences(id,selected_wedding_id) values('f1000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000001');
    raise exception 'Cross-account selected wedding';
  exception when insufficient_privilege then null;
  end;
end;
$$;
set local request.jwt.claim.sub = 'f1000000-0000-4000-8000-000000000001';
do $$
begin
  if not exists(select 1 from public.guests where id='f3000000-0000-4000-8000-000000000001') then raise exception 'Owner cannot read guest'; end if;
  update public.guests set name='Owner update OK' where id='f3000000-0000-4000-8000-000000000001';
  if not found then raise exception 'Owner cannot update guest'; end if;
  insert into public.gift_items(wedding_id,name,quantity,received_quantity) values('f2000000-0000-4000-8000-000000000001','Temporary towels',6,2);
  begin
    insert into public.financial_transactions(wedding_id,expense_id,installment_id,kind,amount_cents,transaction_date)
    values('f2000000-0000-4000-8000-000000000001',gen_random_uuid(),gen_random_uuid(),'payment',100,current_date);
    raise exception 'Financial direct write must be blocked';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.weddings set owner_id='f1000000-0000-4000-8000-000000000002' where id='f2000000-0000-4000-8000-000000000001';
    raise exception 'Ownership reassignment must be blocked';
  exception when insufficient_privilege then null;
  end;
end;
$$;
set local role anon;
do $$
begin
  begin
    perform 1 from public.weddings;
    raise exception 'Anonymous wedding access';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.guests;
    raise exception 'Anonymous guest access';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
select 'RLS smoke test passed; all fixtures rolled back' as result;
