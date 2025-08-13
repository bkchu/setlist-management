-- Recreate storage policy without casting folder segment to UUID to avoid 400 errors
-- Compare as text to prevent invalid UUID casts

begin;

drop policy if exists "Org members can read song files" on storage.objects;

create policy "Org members can read song files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'song-files'
  and exists (
    select 1
    from user_organizations uo_current
    join user_organizations uo_owner
      on uo_current.organization_id = uo_owner.organization_id
    where uo_current.user_id = auth.uid()
      and uo_owner.user_id::text = (storage.foldername(name))[1]
  )
);

commit;


