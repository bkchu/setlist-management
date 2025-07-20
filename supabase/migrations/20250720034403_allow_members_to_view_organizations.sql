/*
  # Allow Members to View Organizations - Alternative Approach

  Instead of creating circular dependencies, we'll handle member access through 
  the database view approach, similar to how we handle join code validation.
  
  This keeps the organizations policies simple and avoids any circular references.
*/

-- Create a view that shows organizations accessible to the current user
-- This view combines direct ownership and membership access
CREATE OR REPLACE VIEW user_accessible_organizations AS
SELECT DISTINCT
  o.id,
  o.name,
  o.created_at,
  o.updated_at,
  o.owner_id,
  CASE 
    WHEN o.owner_id = auth.uid() THEN 'owner'
    ELSE uo.role
  END AS user_role
FROM organizations o
LEFT JOIN user_organizations uo ON uo.organization_id = o.id AND uo.user_id = auth.uid()
WHERE o.owner_id = auth.uid() OR uo.user_id = auth.uid();

-- Grant access to authenticated users
GRANT SELECT ON user_accessible_organizations TO authenticated;

-- The organizations table keeps its simple owner-only policy
-- Members will access organization data through the view or through the auth hook
