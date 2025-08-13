-- Non-recursive RLS reset for organizations, user_organizations, join_codes, and view helpers
-- Strategy:
--  1) Drop all existing policies that may form cycles
--  2) Recreate helper functions as SECURITY DEFINER to avoid recursive evaluation under RLS
--  3) Recreate minimal, one-way policies that never reference views and only call helper functions
--  4) Recreate a convenience view used by the app (never referenced from policies)

-- =============================================
-- Step 0: Safety — ensure schemas exist
-- =============================================
CREATE SCHEMA IF NOT EXISTS public;

-- =============================================
-- Step 1: Drop views and helper functions
-- =============================================
DROP VIEW IF EXISTS public.user_accessible_organizations;

-- Drop helper functions if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_organization_owner'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid'
  ) THEN
    EXECUTE 'DROP FUNCTION public.is_organization_owner(uuid, uuid)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_member_of_organization'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid'
  ) THEN
    EXECUTE 'DROP FUNCTION public.is_member_of_organization(uuid, uuid)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'can_view_organization'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid'
  ) THEN
    EXECUTE 'DROP FUNCTION public.can_view_organization(uuid, uuid)';
  END IF;
END$$;

-- =============================================
-- Step 2: Drop ALL policies on target tables to start clean
-- =============================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT schemaname, tablename, policyname
             FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename IN ('organizations','user_organizations','join_codes')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END$$;

-- =============================================
-- Step 3: Enable RLS
-- =============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_codes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Step 4: Helper functions (SECURITY DEFINER, schema-qualified, no view usage)
-- =============================================
-- Note: SECURITY DEFINER avoids recursive RLS evaluation when functions look up related rows.
-- We restrict search_path to prevent function hijacking.

CREATE OR REPLACE FUNCTION public.is_organization_owner(p_organization_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = p_organization_id AND o.owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_organization(p_organization_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.organization_id = p_organization_id AND uo.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_organization(p_organization_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    public.is_organization_owner(p_organization_id, p_user_id)
    OR public.is_member_of_organization(p_organization_id, p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.join_codes jc
      WHERE jc.organization_id = p_organization_id
        AND jc.used_at IS NULL
        AND (jc.expires_at IS NULL OR jc.expires_at > now())
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_organization_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_organization(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_organization(uuid, uuid) TO authenticated;

-- =============================================
-- Step 5: Organizations policies (one-way, no direct reference to user_organizations)
-- =============================================
CREATE POLICY orgs_owner_all
ON public.organizations
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.is_organization_owner(id, auth.uid()))
WITH CHECK (public.is_organization_owner(id, auth.uid()));

CREATE POLICY orgs_member_select
ON public.organizations
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_member_of_organization(id, auth.uid()));

-- =============================================
-- Step 6: user_organizations policies
-- - Allow users to read their own membership rows
-- - Allow organization owners to manage memberships
-- - Allow users to leave an organization (self-delete)
-- =============================================
CREATE POLICY uo_select_self_or_owner
ON public.user_organizations
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_organization_owner(organization_id, auth.uid())
);

CREATE POLICY uo_owner_insert
ON public.user_organizations
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_organization_owner(organization_id, auth.uid()));

CREATE POLICY uo_owner_update
ON public.user_organizations
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_organization_owner(organization_id, auth.uid()))
WITH CHECK (public.is_organization_owner(organization_id, auth.uid()));

CREATE POLICY uo_owner_delete
ON public.user_organizations
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.is_organization_owner(organization_id, auth.uid()));

CREATE POLICY uo_self_leave
ON public.user_organizations
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- Step 7: join_codes policies
-- - Owners manage all
-- - Authenticated can read codes for orgs they can view (helper function)
--   This avoids referencing organizations/user_organizations directly from policies.
-- =============================================
CREATE POLICY jc_owner_all
ON public.join_codes
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.is_organization_owner(organization_id, auth.uid()))
WITH CHECK (public.is_organization_owner(organization_id, auth.uid()));

CREATE POLICY jc_select_viewable
ON public.join_codes
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.can_view_organization(organization_id, auth.uid()));

-- =============================================
-- Step 8: Recreate convenience view used by the app (do not use in policies)
-- =============================================
CREATE OR REPLACE VIEW public.user_accessible_organizations AS
SELECT
  o.id,
  o.name,
  o.owner_id,
  COALESCE(uo.role, 'owner') AS role,
  uo.created_at
FROM public.organizations o
LEFT JOIN public.user_organizations uo
  ON uo.organization_id = o.id
 AND uo.user_id = auth.uid()
WHERE
  o.owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_organizations uo2
    WHERE uo2.organization_id = o.id AND uo2.user_id = auth.uid()
  );

GRANT SELECT ON public.user_accessible_organizations TO authenticated;


