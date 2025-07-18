/*
  # Create organizations table

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `name` (text, not null)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())
      - `owner_id` (uuid, not null, references auth.users.id)

  2. Security
    - Enable RLS on `organizations` table
    - Add policy for authenticated users to insert new organizations
    - Add policy for users to select organizations where they are the owner
    - Add policy for users to update organizations where they are the owner
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert new organizations (they become the owner)
CREATE POLICY "Users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can view organizations they own
CREATE POLICY "Users can view their own organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Policy: Users can update organizations they own
CREATE POLICY "Users can update their own organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete organizations they own
CREATE POLICY "Users can delete their own organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Create index for better performance on owner_id lookups
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);

-- Create index for better performance on name searches
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);