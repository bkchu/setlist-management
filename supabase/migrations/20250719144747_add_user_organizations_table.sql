/*
  # Add User-Organization Relationships

  1. New Tables
    - `user_organizations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users.id)
      - `organization_id` (uuid, references organizations.id)
      - `role` (text, default 'member')
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on user_organizations table
    - Update existing RLS policies to use user_organizations lookup
    - Add policies for managing organization memberships

  3. Data Migration
    - Migrate existing organization owners to user_organizations as 'owner' role
    - Maintain backward compatibility

  4. Indexes
    - Add performance indexes for user and organization lookups
*/

-- Step 1: Create user_organizations junction table
CREATE TABLE IF NOT EXISTS user_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  
  -- Ensure unique user-organization pairs
  UNIQUE(user_id, organization_id)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_role ON user_organizations(role);

-- Step 3: Enable RLS on user_organizations
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Step 4: Data migration - Add existing organization owners to user_organizations
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT owner_id, id, 'owner'
FROM organizations
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Step 5: Create RLS policies for user_organizations
-- Users can view their own organization memberships
CREATE POLICY "Users can view their own organization memberships"
  ON user_organizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Organization owners can manage memberships in their organizations
CREATE POLICY "Organization owners can manage memberships"
  ON user_organizations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations owner
      WHERE owner.user_id = auth.uid()
      AND owner.organization_id = user_organizations.organization_id
      AND owner.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations owner
      WHERE owner.user_id = auth.uid()
      AND owner.organization_id = user_organizations.organization_id
      AND owner.role = 'owner'
    )
  );

-- Step 6: Update existing RLS policies to use user_organizations

-- Update songs table RLS policy
DROP POLICY IF EXISTS "Users can manage songs in organizations they own" ON songs;
CREATE POLICY "Users can manage songs in organizations they belong to"
  ON songs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = songs.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = songs.organization_id
    )
  );

-- Update setlists table RLS policy  
DROP POLICY IF EXISTS "Users can manage setlists in organizations they own" ON setlists;
CREATE POLICY "Users can manage setlists in organizations they belong to"
  ON setlists
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = setlists.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = setlists.organization_id
    )
  );

-- Update setlist_songs table RLS policy
DROP POLICY IF EXISTS "Users can manage setlist songs through organization ownership" ON setlist_songs;
CREATE POLICY "Users can manage setlist songs through organization membership"
  ON setlist_songs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM setlists
      JOIN user_organizations ON user_organizations.organization_id = setlists.organization_id
      WHERE setlists.id = setlist_songs.setlist_id
      AND user_organizations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM setlists
      JOIN user_organizations ON user_organizations.organization_id = setlists.organization_id
      WHERE setlists.id = setlist_songs.setlist_id
      AND user_organizations.user_id = auth.uid()
    )
  );

-- Update song_keys table RLS policy
DROP POLICY IF EXISTS "Users can manage song keys through organization ownership" ON song_keys;
CREATE POLICY "Users can manage song keys through organization membership"
  ON song_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM songs 
      JOIN user_organizations ON user_organizations.organization_id = songs.organization_id
      WHERE songs.id = song_keys.song_id
      AND user_organizations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM songs 
      JOIN user_organizations ON user_organizations.organization_id = songs.organization_id
      WHERE songs.id = song_keys.song_id
      AND user_organizations.user_id = auth.uid()
    )
  );

-- Step 7: Update organizations table RLS policy to allow viewing by members
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
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

-- Keep existing policies for organization management (only owners can update/delete)
-- These remain unchanged as they use the owner_id field
