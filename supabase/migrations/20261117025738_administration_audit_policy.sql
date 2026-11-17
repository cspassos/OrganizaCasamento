-- Explicitly deny browser access: only the verified server function records support actions.
create policy administration_audit_server_only on public.administration_audit
  for all to anon, authenticated using (false) with check (false);
