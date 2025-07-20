/*
  # Allow Organization View with Valid Join Code

  This migration adds an RLS policy to the organizations table that allows
  authenticated users to view basic organization information (id, name) when
  there is a valid (unexpired, unused) join code for that organization.
  
  This is needed for the join code validation flow where users need to see
  the organization name before joining, but they don't belong to the org yet.
*/

-- Add a new policy to allow viewing organization info when there's a valid join code
CREATE POLICY "Users can view organization info with valid join code"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user belongs to the organization (existing policy logic)
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = organizations.id
    )
    OR
    -- Allow if there's a valid join code for this organization
    EXISTS (
      SELECT 1 FROM join_codes
      WHERE join_codes.organization_id = organizations.id
      AND join_codes.used_at IS NULL
      AND join_codes.expires_at > now()
    )
  );

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
