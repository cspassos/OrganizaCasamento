-- Some hosted projects ship this DDL helper in public. Keep the event trigger,
-- but do not expose its SECURITY DEFINER implementation to API roles.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
