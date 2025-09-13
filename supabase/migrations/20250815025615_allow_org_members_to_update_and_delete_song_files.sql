begin;

-- Update: org members can modify files under their organization folder
drop policy if exists "Users can update their own song files" on storage.objects;

create policy "Org members can update song files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'song-files'
  and exists (
    select 1
    from public.user_organizations uo
    where uo.user_id = auth.uid()
      and uo.organization_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'song-files'
  and exists (
    select 1
    from public.user_organizations uo
    where uo.user_id = auth.uid()
      and uo.organization_id::text = (storage.foldername(name))[1]
  )
);

-- Delete: org members can delete files under their organization folder
drop policy if exists "Users can delete their own song files" on storage.objects;

create policy "Org members can delete song files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'song-files'
  and exists (
    select 1
    from public.user_organizations uo
    where uo.user_id = auth.uid()
      and uo.organization_id::text = (storage.foldername(name))[1]
  )
);

commit;

