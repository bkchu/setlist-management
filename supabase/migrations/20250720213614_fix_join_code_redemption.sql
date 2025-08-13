/*
  # Fix Join Code Redemption - Add Missing RLS Policy
  
  The current RLS policies on join_codes table don't allow non-owners to update
  join codes to mark them as used. This migration adds a policy that allows
  users to mark join codes as used when they are the ones using them.
  
  Current policies:
  1. Organization owners can manage all join codes for their orgs
  2. Anyone can read valid (unused, unexpired) join codes
  
  Missing policy:
  3. Users should be able to mark a join code as used when they use it
*/

-- Add policy to allow users to mark join codes as used when they use them
-- This allows the UPDATE operation needed during the join process
CREATE POLICY "join_codes_mark_as_used"
  ON join_codes
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update join codes that are currently valid (unused and not expired)
    used_at IS NULL 
    AND expires_at > now()
  )
  WITH CHECK (
    -- Can only set used_by to themselves and used_at to current time
    -- The used_at and used_by fields should be set to mark the code as used
    used_by = auth.uid()
    AND used_at IS NOT NULL
  ); 