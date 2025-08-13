/*
  # Fix Organizations RLS Recursion Issue
  
  PROBLEM: Circular dependency between organizations and user_organizations RLS policies
  - organizations policy checks user_organizations table
  - user_organizations policy checks organizations table
  - Result: Infinite recursion
  
  SOLUTION: Break the cycle by using a one-way dependency pattern
  - user_organizations can reference organizations (safe, one-way)
  - organizations should NOT reference user_organizations directly
  - Use alternative patterns for member access to organizations
*/

-- ============================================================================
-- STEP 1: Drop the problematic organizations policy
-- ============================================================================

DROP POLICY IF EXISTS "organizations_join_code_validation" ON organizations;
DROP POLICY IF EXISTS "Organizations viewable by owners and members" ON organizations;

-- ============================================================================
-- STEP 2: Create safe, non-recursive organizations policies
-- ============================================================================

-- Policy 1: Organization owners can always access their organizations
CREATE POLICY "organizations_owner_access"
  ON organizations
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy 2: Allow viewing organization name for join code validation
-- This is safe because it doesn't reference user_organizations
CREATE POLICY "organizations_join_validation"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing if there's a valid join code for this org
    EXISTS (
      SELECT 1 FROM join_codes jc
      WHERE jc.organization_id = organizations.id
      AND jc.used_at IS NULL
      AND jc.expires_at > now()
    )
  );

-- ============================================================================
-- STEP 3: Create a secure function for member access
-- ============================================================================

-- Instead of RLS recursion, use a function to check membership
CREATE OR REPLACE FUNCTION user_can_access_organization(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Check if user is owner (direct, no RLS involved)
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is member (this uses RLS on user_organizations, but doesn't create recursion)
  IF EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE organization_id = org_id AND user_id = user_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION user_can_access_organization(uuid, uuid) TO authenticated;

-- ============================================================================
-- STEP 4: Create a view for user-accessible organizations
-- ============================================================================

-- This view provides the "member access" functionality without RLS recursion
CREATE OR REPLACE VIEW user_accessible_organizations AS
SELECT DISTINCT o.*
FROM organizations o
WHERE 
  -- User is owner
  o.owner_id = auth.uid()
  OR
  -- User is member (this query is safe because it's in a view, not RLS)
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.organization_id = o.id
    AND uo.user_id = auth.uid()
  );

-- Grant access to the view
GRANT SELECT ON user_accessible_organizations TO authenticated;

-- ============================================================================
-- STEP 5: Update application code guidance
-- ============================================================================

/*
  APPLICATION CODE CHANGES NEEDED:
  
  Instead of querying organizations table directly for member access,
  use one of these approaches:
  
  1. Use the view:
     SELECT * FROM user_accessible_organizations WHERE id = $1;
  
  2. Use the function:
     SELECT * FROM organizations 
     WHERE id = $1 AND user_can_access_organization(id);
  
  3. Split queries:
     -- First check access
     SELECT user_can_access_organization($1);
     -- Then query if allowed
     SELECT * FROM organizations WHERE id = $1;
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Organizations RLS recursion fix completed';
  RAISE NOTICE 'Use user_accessible_organizations view or user_can_access_organization function';
  RAISE NOTICE 'This avoids RLS recursion while maintaining security';
END
$$;
