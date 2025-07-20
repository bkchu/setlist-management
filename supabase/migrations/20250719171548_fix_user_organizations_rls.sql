/*
  # Fix User Organizations RLS Infinite Recursion

  The previous migration created infinite recursion in RLS policies because
  the user_organizations policy was trying to query the user_organizations
  table from within itself.

  This migration fixes it by:
  1. Dropping the problematic policies
  2. Creating simpler policies that don't create circular references
  3. Using the organizations.owner_id for ownership checks instead of user_organizations
*/

-- Step 1: Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners can manage memberships" ON user_organizations;

-- Step 2: Create simple, non-recursive policies for user_organizations

-- Users can view their own memberships (no recursion)
CREATE POLICY "Users can view their own memberships"
  ON user_organizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert themselves into organizations (basic membership creation)
-- Note: In a real app, you'd want invitation-based system
CREATE POLICY "Users can create their own memberships"
  ON user_organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Organization owners can manage all memberships in their organizations
-- Use organizations.owner_id instead of circular user_organizations lookup
CREATE POLICY "Organization owners can manage memberships in their orgs"
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

-- Users can update their own membership details (like changing their own role if allowed)
CREATE POLICY "Users can update their own membership details"
  ON user_organizations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own memberships (leave organization)
CREATE POLICY "Users can delete their own memberships"
  ON user_organizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
