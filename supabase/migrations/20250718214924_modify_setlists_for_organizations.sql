/*
  # Modify setlists table for organization support

  1. Schema Changes
    - Add `organization_id` column (UUID, not null)
    - Add foreign key constraint to `organizations.id` with CASCADE delete
    - Remove existing `user_id` column

  2. Data Migration
    - Create default organization for each existing user with setlists (if not already created)
    - Migrate all existing setlists to user's default organization
    - Ensure data integrity during transition

  3. Security Updates
    - Update RLS policies to use organization-based access control
    - Users can manage setlists belonging to organizations they own
    - Update setlist_songs policies to work with new organization structure

  4. Performance
    - Add index on organization_id for efficient queries
*/

-- Step 1: Add organization_id column (nullable initially for migration)
ALTER TABLE setlists ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Step 2: Add foreign key constraint
ALTER TABLE setlists ADD CONSTRAINT setlists_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 3: Data migration - Create default organizations for users with setlists (if not already created)
INSERT INTO organizations (name, owner_id)
SELECT 
  'My Organization' as name,
  user_id as owner_id
FROM setlists 
WHERE user_id IS NOT NULL
GROUP BY user_id
ON CONFLICT DO NOTHING; -- In case organizations already exist from songs migration

-- Step 4: Update existing setlists with their user's default organization
UPDATE setlists 
SET organization_id = (
  SELECT o.id 
  FROM organizations o 
  WHERE o.owner_id = setlists.user_id 
  AND o.name = 'My Organization'
  LIMIT 1
)
WHERE user_id IS NOT NULL AND organization_id IS NULL;

-- Step 5: Make organization_id NOT NULL now that all existing setlists have been migrated
ALTER TABLE setlists ALTER COLUMN organization_id SET NOT NULL;

-- Step 6: Drop ALL policies that depend on user_id column BEFORE dropping the column
-- Drop policies on setlists table
DROP POLICY IF EXISTS "Users can manage their own setlists" ON setlists;

-- Drop policies on setlist_songs table that reference setlists.user_id
DROP POLICY IF EXISTS "Users can manage setlist songs through setlist ownership" ON setlist_songs;

-- Step 7: Remove the old user_id column
ALTER TABLE setlists DROP COLUMN IF EXISTS user_id;

-- Step 8: Add index for performance
CREATE INDEX IF NOT EXISTS idx_setlists_organization_id ON setlists(organization_id);

-- Step 9: Create new organization-based RLS policies
-- Create new organization-based RLS policy for setlists
CREATE POLICY "Users can manage setlists in organizations they own"
  ON setlists
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = setlists.organization_id 
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = setlists.organization_id 
      AND organizations.owner_id = auth.uid()
    )
  );

-- Create new organization-based RLS policy for setlist_songs
CREATE POLICY "Users can manage setlist songs through organization ownership"
  ON setlist_songs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM setlists
      JOIN organizations ON organizations.id = setlists.organization_id
      WHERE setlists.id = setlist_songs.setlist_id
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM setlists
      JOIN organizations ON organizations.id = setlists.organization_id
      WHERE setlists.id = setlist_songs.setlist_id
      AND organizations.owner_id = auth.uid()
    )
  );
