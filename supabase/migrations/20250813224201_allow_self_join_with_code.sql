-- Allow authenticated users to join an organization using a valid join code
-- and mark that join code as used. This complements the reset in
-- 20250813040532_non_recursive_rls_reset.sql which restricted inserts to owners only.

begin;

-- user_organizations: allow self-insert (join) when there's access via can_view_organization
-- This requires:
--  - the inserting user is the current auth user
--  - role is 'member'
--  - the user can view the organization (owner, existing member, or valid join code)
drop policy if exists uo_self_join_with_valid_code on public.user_organizations;
create policy uo_self_join_with_valid_code
on public.user_organizations
as permissive
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'member'
  and public.can_view_organization(organization_id, auth.uid())
);

-- join_codes: allow the redeemer to mark the code as used
-- Only when the code is still valid; the new row must set used_by to the redeemer
drop policy if exists jc_mark_used_by_redeemer on public.join_codes;
create policy jc_mark_used_by_redeemer
on public.join_codes
as permissive
for update
to authenticated
using (
  used_at is null
  and (expires_at is null or expires_at > now())
  and public.can_view_organization(organization_id, auth.uid())
)
with check (
  used_by = auth.uid()
);

commit;


