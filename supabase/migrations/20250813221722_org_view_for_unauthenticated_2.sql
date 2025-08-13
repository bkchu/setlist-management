-- Allow authenticated users to view orgs they can view (owner, member, or via valid join code)
CREATE POLICY orgs_select_viewable
ON public.organizations
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.can_view_organization(id, auth.uid()));