/*
  # Fix RLS Recursion for Join Codes

  The previous migration created a circular dependency:
  - organizations policy references join_codes
  - join_codes policy references organizations

  This migration fixes it by:
  1. Reverting the organizations policy to not reference join_codes
  2. Creating a database function for join code validation that bypasses RLS
*/

-- Drop the problematic policy that creates recursion
DROP POLICY IF EXISTS "Users can view organization info with valid join code" ON organizations;

-- Restore the original organizations policy (members can view their orgs)
CREATE POLICY "Users can view organizations they belong to"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = organizations.id
    )
  );

-- Create a security definer function for join code validation that bypasses RLS
CREATE OR REPLACE FUNCTION validate_join_code_with_org_info(join_code_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- This function runs with elevated privileges to bypass RLS
  SELECT json_build_object(
    'isValid', CASE 
      WHEN jc.id IS NOT NULL 
      AND jc.used_at IS NULL 
      AND jc.expires_at > now() 
      THEN true 
      ELSE false 
    END,
    'organizationId', jc.organization_id,
    'organizationName', o.name,
    'expiresAt', jc.expires_at,
    'usedAt', jc.used_at
  ) INTO result
  FROM join_codes jc
  LEFT JOIN organizations o ON o.id = jc.organization_id
  WHERE jc.code = upper(join_code_param);
  
  -- Return false if no code found
  IF result IS NULL THEN
    result := json_build_object('isValid', false);
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_join_code_with_org_info(text) TO authenticated;
