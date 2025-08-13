/*
  # Comprehensive Join Codes RLS Fix
  
  This migration completely fixes the join_codes RLS policies. The issue was that 
  previous migrations had conflicting policies - the comprehensive RLS fix dropped
  the "mark_as_used" policy that allows users to redeem join codes.
  
  This migration:
  1. Drops ALL existing join_codes policies to start fresh
  2. Creates the 3 essential policies needed for the join code system:
     a) Organization owners can manage join codes for their organizations
     b) Anyone can read valid join codes for validation during join process  
     c) Users can mark join codes as used when they redeem them
  
  This ensures join code redemption works properly while maintaining security.
*/

-- Drop ALL existing policies on join_codes table to start fresh
DROP POLICY IF EXISTS "join_codes_owners_manage" ON join_codes;
DROP POLICY IF EXISTS "join_codes_read_valid" ON join_codes;
DROP POLICY IF EXISTS "join_codes_mark_as_used" ON join_codes;
DROP POLICY IF EXISTS "Organization owners can manage join codes for their orgs" ON join_codes;
DROP POLICY IF EXISTS "Anyone can read valid join codes for joining" ON join_codes;

-- Policy 1: Organization owners can manage all join codes for their organizations
-- This allows owners to create, view, update, and delete join codes for their orgs
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

-- Policy 2: Anyone can read valid join codes for validation during join process
-- This allows users to validate join codes before attempting to use them
CREATE POLICY "join_codes_read_valid"
  ON join_codes
  FOR SELECT
  TO authenticated
  USING (
    used_at IS NULL 
    AND expires_at > now()
  );

-- Policy 3: Users can mark join codes as used when they redeem them
-- This is the CRITICAL policy that was missing - allows users to update join codes
-- to mark them as used during the redemption process
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
    -- Can only set used_by to themselves and used_at to a timestamp
    -- This ensures users can only mark codes as used by themselves
    used_by = auth.uid()
    AND used_at IS NOT NULL
  );
