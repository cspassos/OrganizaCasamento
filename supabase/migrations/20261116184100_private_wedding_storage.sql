begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('wedding-images','wedding-images',false,2097152,array['image/jpeg','image/png','image/webp']),
('wedding-documents','wedding-documents',false,1048576,array['application/pdf','image/jpeg','image/png','image/webp']);

-- Object name: <authenticated user UUID>/<wedding UUID>/<random file name>.
-- No public buckets and no anonymous read policies.
create policy wedding_files_select on storage.objects for select to authenticated using(
  bucket_id in ('wedding-images','wedding-documents')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] in (select id::text from public.weddings where owner_id = (select auth.uid()))
);
create policy wedding_files_insert on storage.objects for insert to authenticated with check(
  bucket_id in ('wedding-images','wedding-documents')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] in (select id::text from public.weddings where owner_id = (select auth.uid()) and not archived)
);
create policy wedding_files_update on storage.objects for update to authenticated using(
  bucket_id in ('wedding-images','wedding-documents')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] in (select id::text from public.weddings where owner_id = (select auth.uid()) and not archived)
) with check(
  bucket_id in ('wedding-images','wedding-documents')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] in (select id::text from public.weddings where owner_id = (select auth.uid()) and not archived)
);
create policy wedding_files_delete on storage.objects for delete to authenticated using(
  bucket_id in ('wedding-images','wedding-documents')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] in (select id::text from public.weddings where owner_id = (select auth.uid()) and not archived)
);
commit;
