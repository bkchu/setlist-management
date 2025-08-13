begin;

-- Read: org members can read/sign files uploaded by anyone in their org
drop policy if exists "Org members can read song files" on storage.objects;
create policy "Org members can read song files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'song-files'
  and exists (
    select 1
    from public.user_organizations uo_current
    join public.user_organizations uo_owner
      on uo_current.organization_id = uo_owner.organization_id
    where uo_current.user_id = auth.uid()
      and uo_owner.user_id::text = (storage.foldername(name))[1]
  )
);

-- Upload: users can upload only under their own user-id folder
drop policy if exists "Users can upload their own song files" on storage.objects;
create policy "Users can upload their own song files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'song-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Update/Move: uploader can modify their own files
drop policy if exists "Users can update their own song files" on storage.objects;
create policy "Users can update their own song files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'song-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'song-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: uploader can delete their own files
drop policy if exists "Users can delete their own song files" on storage.objects;
create policy "Users can delete their own song files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'song-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;