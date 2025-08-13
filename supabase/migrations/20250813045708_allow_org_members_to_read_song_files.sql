-- Allow organization members to read/sign song files uploaded by anyone in the same organization
-- Assumes object key format: <uploader_user_id>/<song_id>/<key or "default">/<filename>
-- Uses existing membership in user_organizations to authorize access across members

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
      and uo_owner.user_id = ((storage.foldername(name))[1])::uuid
  )
);

commit;


