begin;

-- Replace user-id based insert policy with organization-based membership check
drop policy if exists "Users can upload their own song files" on storage.objects;

create policy "Org members can upload song files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'song-files'
  and exists (
    select 1
    from public.user_organizations uo
    where uo.user_id = auth.uid()
      and uo.organization_id::text = (storage.foldername(name))[1]
  )
);

commit;

