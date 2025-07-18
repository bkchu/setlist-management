/*
  # Modify songs table for organization support

  1. Schema Changes
    - Add `organization_id` column (UUID, not null)
    - Add foreign key constraint to `organizations.id` with CASCADE delete
    - Remove existing `user_id` column

  2. Security Updates
    - Update RLS policies to use organization-based access control
    - Users can manage songs belonging to organizations they own
    - Policies check ownership through organizations.owner_id

  3. Performance
    - Add index on organization_id for efficient queries
    - Maintain existing indexes where applicable

  Note: This assumes users access organizations through ownership.
  For multi-user organizations, a user_organizations junction table would be needed.
*/

-- First, we need to temporarily disable RLS to make schema changes
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can manage their own songs" ON songs;

-- Add organization_id column (initially nullable for migration)
ALTER TABLE songs ADD COLUMN organization_id uuid;

-- Add foreign key constraint
ALTER TABLE songs ADD CONSTRAINT songs_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_songs_organization_id ON songs(organization_id);

-- For existing data migration, we'll create a default organization for each user
-- This is a one-time operation to handle existing songs
DO $$
DECLARE
    user_record RECORD;
    org_id uuid;
BEGIN
    -- For each user who has songs, create a default organization
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM songs 
        WHERE user_id IS NOT NULL
    LOOP
        -- Create a default organization for this user
        INSERT INTO organizations (name, owner_id)
        VALUES ('My Organization', user_record.user_id)
        RETURNING id INTO org_id;
        
        -- Update all songs for this user to use the new organization
        UPDATE songs 
        SET organization_id = org_id 
        WHERE user_id = user_record.user_id;
    END LOOP;
END $$;

-- Now make organization_id NOT NULL since all existing data has been migrated
ALTER TABLE songs ALTER COLUMN organization_id SET NOT NULL;

-- Remove the old user_id column
ALTER TABLE songs DROP COLUMN IF EXISTS user_id;

-- Re-enable RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies based on organization ownership
CREATE POLICY "Users can manage songs in their organizations"
  ON songs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = songs.organization_id 
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = songs.organization_id 
      AND organizations.owner_id = auth.uid()
    )
  );