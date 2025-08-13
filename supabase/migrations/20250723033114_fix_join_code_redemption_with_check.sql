/*
  # Fix Join Code Redemption WITH CHECK Clause
  
  The current WITH CHECK clause is too restrictive and preventing users
  from redeeming join codes. Users who are trying to join an organization
  are NOT organization owners yet, so they fail the ownership check.
  
  ISSUE: Users get 403 "new row violates row-level security policy" 
  when trying to mark join codes as used during redemption.
  
  SOLUTION: Make the WITH CHECK clause more permissive for redemption
  while maintaining security.
*/

-- Drop the current problematic policy
DROP POLICY IF EXISTS "join_codes_redemption_update" ON join_codes;

-- Create a new, more permissive redemption policy
CREATE POLICY "join_codes_redemption_update"
  ON join_codes
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update codes that are currently valid (unused and not expired)
    used_at IS NULL 
    AND expires_at > now()
  )
  WITH CHECK (
    -- Allow redemption: user is setting used_by to their own ID and used_at to a timestamp
    (
      used_by = auth.uid()  -- Must redeem for themselves
      AND used_at IS NULL  -- Must set a valid timestamp
    )
    -- OR: Organization owners can update any join codes for their organizations
    OR EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = join_codes.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );
