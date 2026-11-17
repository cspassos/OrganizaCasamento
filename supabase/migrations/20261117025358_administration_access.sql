-- Membership is granted by the project operator only, never by user_metadata or email matching.
create table public.app_administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.app_administrators enable row level security;
revoke all on public.app_administrators from public, anon, authenticated;
grant select on public.app_administrators to authenticated;
grant all on public.app_administrators to service_role;
create policy own_administrator_status on public.app_administrators
  for select to authenticated using (user_id = (select auth.uid()));

create table public.administration_audit (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null check (action in ('initial_password_changed','password_reset_link','temporary_password','view_account')),
  created_at timestamptz not null default now()
);
alter table public.administration_audit enable row level security;
revoke all on public.administration_audit from public, anon, authenticated;
grant select, insert on public.administration_audit to service_role;
create index administration_audit_actor_created_idx on public.administration_audit(administrator_id, created_at desc);
create index administration_audit_target_idx on public.administration_audit(target_user_id);

-- Auth account directory is visible only to the authenticated server function.
create function app_private.administration_accounts(p_query text, p_page integer)
returns jsonb language sql stable security definer set search_path = '' as $$
  with matched as (
    select u.id, u.email, u.created_at, u.email_confirmed_at, u.last_sign_in_at,
      exists(select 1 from public.app_administrators a where a.user_id=u.id) as administrator,
      (select count(*) from public.wedding_workspaces w where w.owner_id=u.id) as weddings
    from auth.users u
    where position(lower(left(coalesce(p_query,''),200)) in lower(coalesce(u.email,'')))>0
  ), page as (
    select * from matched order by created_at desc, id
    limit 25 offset greatest(0,least(coalesce(p_page,1),100000)-1)*25
  ) select jsonb_build_object('total',(select count(*) from matched),'users',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb));
$$;
revoke all on function app_private.administration_accounts(text,integer) from public, anon, authenticated;
grant usage on schema app_private to service_role;
grant execute on function app_private.administration_accounts(text,integer) to service_role;
create function public.administration_accounts(p_query text default '', p_page integer default 1)
returns jsonb language sql stable security invoker set search_path='' as $$
  select app_private.administration_accounts(p_query,p_page);
$$;
revoke all on function public.administration_accounts(text,integer) from public, anon, authenticated;
grant execute on function public.administration_accounts(text,integer) to service_role;
