/*
  # Fix Join Code Validation Function
  
  This migration fixes the validate_join_code_info function which only looked at 
  unused codes via the valid_join_codes_with_org view. This caused validation to 
  fail after a code has been used once.
  
  This migration:
  1. Creates a new view that includes ALL join codes (used and unused)
  2. Updates the validation function to use this new view
  3. Returns proper validation info including usage status
  
  Note: The RLS policy for marking codes as used already exists from a previous migration.
*/

-- Create a comprehensive view for ALL join codes with organization info
CREATE OR REPLACE VIEW all_join_codes_with_org AS
SELECT 
  jc.id,
  jc.code,
  jc.organization_id,
  jc.expires_at,
  jc.used_at,
  jc.used_by,
  jc.created_at,
  o.name AS organization_name
FROM join_codes jc
LEFT JOIN organizations o ON o.id = jc.organization_id;

-- Grant read access to authenticated users
GRANT SELECT ON all_join_codes_with_org TO authenticated;

-- Update the validation function to use the comprehensive view
CREATE OR REPLACE FUNCTION validate_join_code_info(join_code_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges to access the view
AS $$
DECLARE
  result json;
  code_record RECORD;
BEGIN
  -- Get the join code record from the comprehensive view
  SELECT * INTO code_record
  FROM all_join_codes_with_org ajc
  WHERE ajc.code = upper(join_code_param);
  
  -- If no code found, return invalid
  IF code_record.id IS NULL THEN
    result := json_build_object('isValid', false);
  ELSE
    -- Return comprehensive information about the code
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

-- Note: The RLS policy "join_codes_mark_as_used" already exists from a previous migration
-- so we don't need to create it again
