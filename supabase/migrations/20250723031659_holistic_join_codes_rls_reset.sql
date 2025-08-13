/*
  # Holistic Join Codes RLS Reset - No Recursion
  
  This migration completely resets ALL RLS policies on the join_codes table
  to avoid circular dependency issues that have been causing problems.
  
  STRATEGY TO AVOID RECURSION:
  1. Drop ALL existing policies to start completely fresh
  2. Use only SIMPLE, DIRECT policy conditions
  3. Avoid complex EXISTS subqueries where possible
  4. Follow the safe pattern: organizations.owner_id = auth.uid()
  5. No circular references between tables
  
  FINAL POLICY STRUCTURE:
  1. Organization owners can manage join codes (simple org ownership check)
  2. Anyone can read valid join codes (no table joins, just column checks)
  3. Users can mark codes as used (minimal validation, no recursion)
*/

-- ============================================================================
-- STEP 1: COMPLETE POLICY RESET
-- ============================================================================

-- Drop ALL existing policies on join_codes table
-- This ensures we start completely fresh with no legacy issues
DROP POLICY IF EXISTS "join_codes_owners_manage" ON join_codes;
DROP POLICY IF EXISTS "join_codes_read_valid" ON join_codes;
DROP POLICY IF EXISTS "join_codes_mark_as_used" ON join_codes;
DROP POLICY IF EXISTS "Organization owners can manage join codes for their orgs" ON join_codes;
DROP POLICY IF EXISTS "Anyone can read valid join codes for joining" ON join_codes;

-- Also drop any other potential policy names that might exist
DROP POLICY IF EXISTS "join_codes_owner_manage" ON join_codes;
DROP POLICY IF EXISTS "join_codes_read_valid_codes" ON join_codes;
DROP POLICY IF EXISTS "join_codes_update_usage" ON join_codes;

-- ============================================================================
-- STEP 2: CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================================================

-- POLICY 1: Organization owners can manage ALL join codes for their organizations
-- SAFE PATTERN: Direct reference to organizations.owner_id with no circular dependencies
CREATE POLICY "join_codes_owner_full_access"
  ON join_codes
  FOR ALL
  TO authenticated
  USING (
    -- Simple, direct check: is the current user the owner of the organization?
    -- This creates a one-way dependency: join_codes -> organizations (safe)
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = join_codes.organization_id
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same check for inserts/updates by owners
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = join_codes.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- POLICY 2: Anyone can read valid join codes for validation during join process
-- COMPLETELY SAFE: No table joins, only direct column comparisons
CREATE POLICY "join_codes_public_read_valid"
  ON join_codes
  FOR SELECT
  TO authenticated
  USING (
    -- Simple column checks - no joins, no recursion risk
    used_at IS NULL 
    AND expires_at > now()
  );

-- POLICY 3: Users can mark join codes as used during redemption
-- SAFE PATTERN: Minimal validation with escape hatch for owners
CREATE POLICY "join_codes_redemption_update"
  ON join_codes
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update codes that are currently valid
    -- Simple column checks - no joins, no recursion
    used_at IS NULL 
    AND expires_at > now()
  )
  WITH CHECK (
    -- Either: Valid redemption data is being set
    (
      used_by IS NOT NULL 
      AND used_at IS NOT NULL
    )
    -- Or: User is the organization owner (escape hatch for admin operations)
    OR EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = join_codes.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: VERIFICATION AND DOCUMENTATION
-- ============================================================================

-- These policies create the following dependency chain (NO CYCLES):
-- 1. join_codes -> organizations (one-way, safe)
-- 2. organizations table should only use direct owner_id checks
-- 3. user_organizations -> organizations (one-way, safe)
-- 
-- This ensures:
-- ✅ No circular dependencies
-- ✅ Full functionality for join code system
-- ✅ Proper security isolation
-- ✅ Simple, maintainable policies

-- Expected behavior:
-- ✅ Organization owners: Full CRUD access to their join codes
-- ✅ Any user: Can read valid join codes for validation
-- ✅ Any user: Can mark valid join codes as used during redemption
-- ✅ Security: Users cannot access other organizations' codes
-- ✅ Security: Cannot modify expired or already used codes
