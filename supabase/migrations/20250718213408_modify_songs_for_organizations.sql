/*
  # Modify songs table for organization support

  1. Schema Changes
    - Add `organization_id` column (UUID, not null)
    - Add foreign key constraint to `organizations.id` with CASCADE delete
    - Remove existing `user_id` column

  2. Data Migration
    - Create default organization for each existing user with songs
    - Migrate all existing songs to user's default organization
    - Ensure data integrity during transition

  3. Security Updates
    - Update RLS policies to use organization-based access control
    - Users can manage songs belonging to organizations they own
    - Remove old user-based policies

  4. Performance
    - Add index on organization_id for efficient queries
    - Clean up old indexes if necessary
*/

-- Step 1: Add organization_id column (nullable initially for migration)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Step 2: Add foreign key constraint
ALTER TABLE songs ADD CONSTRAINT songs_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 3: Data migration - Create default organizations for users with songs
INSERT INTO organizations (name, owner_id)
SELECT 
  'My Organization' as name,
  user_id as owner_id
FROM songs 
WHERE user_id IS NOT NULL
GROUP BY user_id
ON CONFLICT DO NOTHING; -- In case organizations already exist

-- Step 4: Update existing songs with their user's default organization
UPDATE songs 
SET organization_id = (
  SELECT o.id 
  FROM organizations o 
  WHERE o.owner_id = songs.user_id 
  AND o.name = 'My Organization'
  LIMIT 1
)
WHERE user_id IS NOT NULL AND organization_id IS NULL;

-- Step 5: Make organization_id NOT NULL now that all existing songs have been migrated
ALTER TABLE songs ALTER COLUMN organization_id SET NOT NULL;

-- Step 6: Drop ALL policies that depend on user_id column BEFORE dropping the column
-- Drop policies on songs table
DROP POLICY IF EXISTS "Users can manage their own songs" ON songs;
DROP POLICY IF EXISTS "Users can manage songs in their organizations" ON songs;

-- Drop policies on song_keys table that reference songs.user_id
DROP POLICY IF EXISTS "Users can view song keys through song ownership" ON song_keys;
DROP POLICY IF EXISTS "Users can manage song keys through song ownership" ON song_keys;

-- Step 7: Remove the old user_id column
ALTER TABLE songs DROP COLUMN IF EXISTS user_id;

-- Step 8: Add index for performance
CREATE INDEX IF NOT EXISTS idx_songs_organization_id ON songs(organization_id);

-- Step 9: Create new organization-based RLS policies
-- Create new organization-based RLS policy for songs
CREATE POLICY "Users can manage songs in organizations they own"
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

-- Create new organization-based RLS policy for song_keys
CREATE POLICY "Users can manage song keys through organization ownership"
  ON song_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM songs 
      JOIN organizations ON organizations.id = songs.organization_id
      WHERE songs.id = song_keys.song_id
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM songs 
      JOIN organizations ON organizations.id = songs.organization_id
      WHERE songs.id = song_keys.song_id
      AND organizations.owner_id = auth.uid()
    )
  );
