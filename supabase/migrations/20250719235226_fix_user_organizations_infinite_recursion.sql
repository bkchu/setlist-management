/*
  # Fix User Organizations Infinite Recursion - Final Fix

  The user_organizations table has RLS policies that create infinite recursion
  because they query the same table they're protecting.

  This migration:
  1. Drops ALL existing policies on user_organizations
  2. Creates simple, non-recursive policies
  3. Uses organizations.owner_id for ownership checks instead of user_organizations
*/

-- Step 1: Drop ALL existing policies on user_organizations
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners can manage memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their own memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can create their own memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners can manage memberships in their orgs" ON user_organizations;
DROP POLICY IF EXISTS "Users can update their own membership details" ON user_organizations;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON user_organizations;

-- Step 2: Create simple, non-recursive policies

-- Policy 1: Users can view their own memberships (basic read access)
CREATE POLICY "user_organizations_select_own"
  ON user_organizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own memberships (for joining organizations)
CREATE POLICY "user_organizations_insert_own"
  ON user_organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Organization owners can manage all memberships in their organizations
-- Uses organizations.owner_id to avoid recursion
CREATE POLICY "user_organizations_owners_manage"
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

-- Policy 4: Users can update their own membership details
CREATE POLICY "user_organizations_update_own"
  ON user_organizations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can delete their own memberships (leave organization)
CREATE POLICY "user_organizations_delete_own"
  ON user_organizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
