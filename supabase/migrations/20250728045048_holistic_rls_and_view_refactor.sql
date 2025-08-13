
-- Drop existing RLS policies and dependent objects to ensure a clean slate.
-- This helps prevent conflicts with old, potentially recursive policies.
DROP POLICY IF EXISTS "Allow all access for organization owners" ON public.organizations;
DROP POLICY IF EXISTS "Allow members to view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to view organizations with a valid join code" ON public.organizations;

DROP POLICY IF EXISTS "Allow users to view their own membership" ON public.user_organizations;
DROP POLICY IF EXISTS "Allow organization owners to manage memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Allow members to leave an organization" ON public.user_organizations;
DROP POLICY IF EXISTS "Allow admin to manage any membership" ON public.user_organizations;

DROP POLICY IF EXISTS "Allow owners to manage join codes" ON public.join_codes;
DROP POLICY IF EXISTS "Allow authenticated users to view join codes for organizations they can see" ON public.join_codes;
DROP POLICY IF EXISTS "Allow join code usage for authenticated users" ON public.join_codes;

-- Drop the view and functions that will be recreated.
DROP VIEW IF EXISTS public.user_accessible_organizations;
DROP FUNCTION IF EXISTS public.is_member_of_organization;
DROP FUNCTION IF EXISTS public.can_view_organization;
DROP FUNCTION IF EXISTS public.is_organization_owner;


-- Function to check if a user is the owner of an organization.
-- Uses SECURITY DEFINER to run with the privileges of the function owner, avoiding RLS recursion.
CREATE OR REPLACE FUNCTION public.is_organization_owner(p_organization_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = p_organization_id AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to check if a user is a member of an organization (any role).
-- Uses SECURITY DEFINER to prevent recursion.
CREATE OR REPLACE FUNCTION public.is_member_of_organization(p_organization_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_organizations
    WHERE organization_id = p_organization_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can view an organization, either as a member or with a valid join code.
-- This is a key function for RLS policies to rely on.
CREATE OR REPLACE FUNCTION public.can_view_organization(p_organization_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN public.is_organization_owner(p_organization_id, p_user_id)
      OR public.is_member_of_organization(p_organization_id, p_user_id)
      OR EXISTS (
          SELECT 1 FROM public.join_codes jc
          WHERE jc.organization_id = p_organization_id
            AND jc.expires_at > now()
            AND (jc.usage_limit IS NULL OR jc.times_used < jc.usage_limit)
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- A comprehensive view to get all organizations a user can access, along with their role.
-- This is the key to simplifying the client-side logic in `use-auth.tsx`.
-- It fetches organization details and the user's specific role in one go.
CREATE OR REPLACE VIEW public.user_accessible_organizations AS
SELECT
    o.id,
    o.name,
    o.owner_id,
    COALESCE(uo.role, 'owner') AS role,
    uo.created_at
FROM
    public.organizations o
LEFT JOIN
    public.user_organizations uo ON o.id = uo.organization_id AND uo.user_id = auth.uid()
WHERE
    -- A user can access an organization if they are the owner OR a member.
    o.owner_id = auth.uid() OR uo.user_id = auth.uid();


-- RLS Policies for `organizations` table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for organization owners"
ON public.organizations
FOR ALL
USING (public.is_organization_owner(id, auth.uid()));

CREATE POLICY "Allow members to view their organization"
ON public.organizations
FOR SELECT
USING (public.is_member_of_organization(id, auth.uid()));

-- RLS Policies for `user_organizations` table
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own membership"
ON public.user_organizations
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Allow organization owners to manage memberships"
ON public.user_organizations
FOR ALL
USING (public.is_organization_owner(organization_id, auth.uid()));

CREATE POLICY "Allow members to leave an organization"
ON public.user_organizations
FOR DELETE
USING (user_id = auth.uid());


-- RLS Policies for `join_codes` table
ALTER TABLE public.join_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow owners to manage join codes"
ON public.join_codes
FOR ALL
USING (public.is_organization_owner(organization_id, auth.uid()));

CREATE POLICY "Allow authenticated users to view join codes for organizations they can see"
ON public.join_codes
FOR SELECT
USING (public.can_view_organization(organization_id, auth.uid()));


