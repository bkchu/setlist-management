/*
  # Comprehensive RLS Fix - No Recursion

  This migration completely redesigns the RLS policies for organizations, 
  user_organizations, and join_codes to eliminate all circular dependencies.

  Strategy:
  1. organizations table: Only use direct columns (owner_id), no table joins
  2. user_organizations table: Can reference organizations.owner_id (one-way dependency)
  3. join_codes table: Can reference organizations.owner_id (one-way dependency)
  
  This creates a clear hierarchy with no circular references.
*/

-- ============================================================================
-- ORGANIZATIONS TABLE - NO DEPENDENCIES (Root of hierarchy)
-- ============================================================================

-- Drop all existing organization policies
DROP POLICY IF EXISTS "Users can view organization info with valid join code" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they own" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update organizations they own" ON organizations;
DROP POLICY IF EXISTS "Users can delete organizations they own" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can delete their own organizations" ON organizations;

-- Create new organization policies (ONLY direct columns, no table references)
CREATE POLICY "org_owners_can_view"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "org_owners_can_create"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "org_owners_can_update"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "org_owners_can_delete"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- USER_ORGANIZATIONS TABLE - Can reference organizations.owner_id
-- ============================================================================

-- Drop all existing user_organizations policies
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners can manage memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their own memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can create their own memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners can manage memberships in their orgs" ON user_organizations;
DROP POLICY IF EXISTS "Users can update their own membership details" ON user_organizations;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_select_own" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_insert_own" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_owners_manage" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_update_own" ON user_organizations;
DROP POLICY IF EXISTS "user_organizations_delete_own" ON user_organizations;
DROP POLICY IF EXISTS "uo_select_own" ON user_organizations;
DROP POLICY IF EXISTS "uo_insert_own" ON user_organizations;
DROP POLICY IF EXISTS "uo_update_own" ON user_organizations;
DROP POLICY IF EXISTS "uo_delete_own" ON user_organizations;
DROP POLICY IF EXISTS "uo_owners_manage" ON user_organizations;

-- Create new user_organizations policies
-- Users can view their own memberships
CREATE POLICY "user_orgs_view_own"
  ON user_organizations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own memberships (for joining)
CREATE POLICY "user_orgs_join"
  ON user_organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own membership details
CREATE POLICY "user_orgs_update_own"
  ON user_organizations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can leave organizations (delete their own membership)
CREATE POLICY "user_orgs_leave"
  ON user_organizations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Organization owners can manage all memberships in their organizations
CREATE POLICY "user_orgs_owners_manage"
  ON user_organizations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = user_organizations.organization_id
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = user_organizations.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- JOIN_CODES TABLE - Can reference organizations.owner_id
-- ============================================================================

-- Drop all existing join_codes policies
DROP POLICY IF EXISTS "Organization owners can manage join codes for their orgs" ON join_codes;
DROP POLICY IF EXISTS "Anyone can read valid join codes for joining" ON join_codes;

-- Create new join_codes policies
-- Organization owners can manage join codes for their organizations
CREATE POLICY "join_codes_owners_manage"
  ON join_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = join_codes.organization_id
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = join_codes.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- Anyone can read valid join codes (for validation during join process)
CREATE POLICY "join_codes_read_valid"
  ON join_codes
  FOR SELECT
  TO authenticated
  USING (
    used_at IS NULL 
    AND expires_at > now()
  );

-- ============================================================================
-- Create a database view for join validation that bypasses RLS conflicts
-- ============================================================================

-- Drop the previous function
DROP FUNCTION IF EXISTS validate_join_code_with_org_info(text);
DROP FUNCTION IF EXISTS validate_join_code_info(text);

-- Create a database view for valid join codes with organization info
-- This view is not subject to RLS and can be used for join validation
CREATE OR REPLACE VIEW valid_join_codes_with_org AS
SELECT 
  jc.id,
  jc.code,
  jc.organization_id,
  jc.expires_at,
  jc.used_at,
  jc.created_at,
  o.name AS organization_name
FROM join_codes jc
LEFT JOIN organizations o ON o.id = jc.organization_id
WHERE jc.used_at IS NULL AND jc.expires_at > now();

-- Grant read access to authenticated users for join validation
GRANT SELECT ON valid_join_codes_with_org TO authenticated;

-- Create a simple function that uses the view for validation
CREATE OR REPLACE FUNCTION validate_join_code_info(join_code_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges to access the view
AS $$
DECLARE
  result json;
BEGIN
  -- Use the view which bypasses RLS conflicts
  SELECT json_build_object(
    'isValid', CASE 
      WHEN vjc.id IS NOT NULL THEN true 
      ELSE false 
    END,
    'organizationId', vjc.organization_id,
    'organizationName', vjc.organization_name,
    'expiresAt', vjc.expires_at,
    'usedAt', vjc.used_at
  ) INTO result
  FROM valid_join_codes_with_org vjc
  WHERE vjc.code = upper(join_code_param);
  
  -- Return false if no code found
  IF result IS NULL THEN
    result := json_build_object('isValid', false);
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_join_code_info(text) TO authenticated;
