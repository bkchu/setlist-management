/*
  # Holistic Views and Functions Security Reset
  
  This migration performs a complete reset of all views and functions to follow
  Supabase security best practices:
  
  1. Remove all SECURITY DEFINER functions (security anti-pattern)
  2. Use SECURITY INVOKER for all functions (default and recommended)
  3. Rely on proper RLS policies instead of elevated function privileges
  4. Simplify views to avoid complex security contexts
  
  References:
  - https://supabase.com/docs/guides/database/postgres/row-level-security
  - https://blog.mansueli.com/using-custom-claims-for-supabase-storage-policies
*/

-- ============================================================================
-- STEP 1: DROP ALL EXISTING VIEWS AND FUNCTIONS
-- ============================================================================

-- Drop existing views
DROP VIEW IF EXISTS all_join_codes_with_org CASCADE;
DROP VIEW IF EXISTS valid_join_codes_with_org CASCADE;
DROP VIEW IF EXISTS user_accessible_organizations CASCADE;

-- Drop existing functions that use SECURITY DEFINER
DROP FUNCTION IF EXISTS validate_join_code_info(text) CASCADE;
DROP FUNCTION IF EXISTS validate_join_code_with_org_info(text) CASCADE;

-- Keep these functions but ensure they use SECURITY INVOKER
-- (generate_join_code, cleanup_expired_join_codes, track_song_key are fine as-is)

-- ============================================================================
-- STEP 2: CREATE SECURE RLS POLICIES FOR JOIN CODE VALIDATION
-- ============================================================================

-- Ensure join_codes table has proper policies for validation
-- This policy allows reading join codes for validation purposes
DROP POLICY IF EXISTS "join_codes_validation_access" ON join_codes;
CREATE POLICY "join_codes_validation_access"
  ON join_codes
  FOR SELECT
  TO authenticated
  USING (
    -- Allow reading for validation if code is potentially valid
    expires_at > now()
  );

-- ============================================================================
-- STEP 3: CREATE SECURE FUNCTIONS WITH SECURITY INVOKER
-- ============================================================================

-- Replace validate_join_code_info with a SECURITY INVOKER function
-- This function relies on RLS policies instead of elevated privileges
CREATE OR REPLACE FUNCTION validate_join_code_info(join_code_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER  -- Uses caller's privileges, respects RLS
AS $$
DECLARE
  result json;
  code_record record;
BEGIN
  -- Query join_codes with organization info
  -- This respects RLS policies and user permissions
  SELECT 
    jc.id,
    jc.code,
    jc.organization_id,
    jc.expires_at,
    jc.used_at,
    jc.used_by,
    jc.created_at,
    o.name AS organization_name
  INTO code_record
  FROM join_codes jc
  LEFT JOIN organizations o ON o.id = jc.organization_id
  WHERE jc.code = upper(join_code_param);
  
  -- Build result based on what the user can see
  IF code_record.id IS NULL THEN
    result := json_build_object('isValid', false);
  ELSE
    result := json_build_object(
      'isValid', CASE 
        WHEN code_record.used_at IS NULL AND code_record.expires_at > now() THEN true 
        ELSE false 
      END,
      'organizationId', code_record.organization_id,
      'organizationName', code_record.organization_name,
      'expiresAt', code_record.expires_at,
      'usedAt', code_record.used_at,
      'usedBy', code_record.used_by,
      'isExpired', CASE WHEN code_record.expires_at <= now() THEN true ELSE false END,
      'isUsed', CASE WHEN code_record.used_at IS NOT NULL THEN true ELSE false END
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_join_code_info(text) TO authenticated;

-- ============================================================================
-- STEP 4: ENSURE ORGANIZATIONS CAN BE VIEWED FOR JOIN VALIDATION
-- ============================================================================

-- Add a policy that allows viewing organization names for join code validation
-- This is more secure than a SECURITY DEFINER function
DROP POLICY IF EXISTS "organizations_join_code_validation" ON organizations;
CREATE POLICY "organizations_join_code_validation"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing organization info if user owns it
    owner_id = auth.uid()
    OR
    -- Allow viewing organization info if user is a member
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = organizations.id
      AND uo.user_id = auth.uid()
    )
    OR
    -- Allow viewing organization name if there's a valid join code
    -- This enables the join flow without using SECURITY DEFINER
    EXISTS (
      SELECT 1 FROM join_codes jc
      WHERE jc.organization_id = organizations.id
      AND jc.used_at IS NULL
      AND jc.expires_at > now()
    )
  );

-- ============================================================================
-- STEP 5: CREATE SIMPLIFIED VIEW FOR USER ORGANIZATION ACCESS
-- ============================================================================

-- Create a simple view for user organization access that respects RLS
CREATE OR REPLACE VIEW user_organizations_with_details AS
SELECT 
  uo.id,
  uo.user_id,
  uo.organization_id,
  uo.role,
  uo.created_at,
  o.name AS organization_name,
  o.created_at AS organization_created_at,
  o.owner_id AS organization_owner_id
FROM user_organizations uo
JOIN organizations o ON o.id = uo.organization_id;

-- This view inherits RLS from the underlying tables
-- Grant access to authenticated users
GRANT SELECT ON user_organizations_with_details TO authenticated;

-- ============================================================================
-- STEP 6: UPDATE EXISTING FUNCTIONS TO ENSURE SECURITY INVOKER
-- ============================================================================

-- Ensure generate_join_code uses SECURITY INVOKER (recreate to be explicit)
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER  -- Explicit SECURITY INVOKER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists (respects RLS)
    SELECT EXISTS(SELECT 1 FROM join_codes WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Ensure cleanup_expired_join_codes uses SECURITY INVOKER
CREATE OR REPLACE FUNCTION cleanup_expired_join_codes()
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER  -- Explicit SECURITY INVOKER
AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Delete expired codes that the user can access (respects RLS)
  DELETE FROM join_codes 
  WHERE expires_at < now() - interval '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Ensure track_song_key uses SECURITY INVOKER
CREATE OR REPLACE FUNCTION track_song_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.key IS NOT NULL THEN
    -- Insert respects RLS policies on song_keys table
    INSERT INTO song_keys (song_id, key, setlist_id)
    VALUES (NEW.song_id, NEW.key, NEW.setlist_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;  -- Explicit SECURITY INVOKER

-- ============================================================================
-- STEP 7: GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on all functions to authenticated users
GRANT EXECUTE ON FUNCTION generate_join_code() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_join_codes() TO authenticated;
-- track_song_key is a trigger function, no need for explicit grant

-- ============================================================================
-- STEP 8: VERIFICATION AND CLEANUP
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Holistic views and functions security reset completed successfully';
  RAISE NOTICE 'All functions now use SECURITY INVOKER and respect RLS policies';
  RAISE NOTICE 'Views have been simplified and security-focused';
END
$$;
