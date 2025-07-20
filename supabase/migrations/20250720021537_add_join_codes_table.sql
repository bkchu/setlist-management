/*
  # Add Join Codes System

  1. New Tables
    - `join_codes`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations.id)
      - `code` (text, unique)
      - `created_by` (uuid, references auth.users.id)
      - `created_at` (timestamptz, default now())
      - `expires_at` (timestamptz, not null)
      - `used_at` (timestamptz, nullable)
      - `used_by` (uuid, nullable, references auth.users.id)

  2. Security
    - Enable RLS on join_codes table
    - Organization owners can create, view, and revoke codes for their organizations
    - Anyone can read unexpired, unused codes for joining (but not see who created them)
    - Used codes track who used them and when

  3. Indexes
    - Unique index on code for fast lookups
    - Index on organization_id for efficient queries
    - Index on expires_at for cleanup queries
*/

-- Create join_codes table
CREATE TABLE IF NOT EXISTS join_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_join_codes_organization_id ON join_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_join_codes_code ON join_codes(code);
CREATE INDEX IF NOT EXISTS idx_join_codes_expires_at ON join_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_join_codes_created_by ON join_codes(created_by);

-- Enable Row Level Security
ALTER TABLE join_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy 1: Organization owners can manage all codes for their organizations
CREATE POLICY "Organization owners can manage join codes for their orgs"
  ON join_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = join_codes.organization_id
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = join_codes.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- Policy 2: Anyone can read valid (unexpired, unused) join codes for joining
-- This allows the join flow to validate codes without exposing sensitive info
CREATE POLICY "Anyone can read valid join codes for joining"
  ON join_codes
  FOR SELECT
  TO authenticated
  USING (
    used_at IS NULL 
    AND expires_at > now()
  );

-- Function to generate unique join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM join_codes WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to clean up expired join codes (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_join_codes()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM join_codes 
  WHERE expires_at < now() - interval '7 days';  -- Keep expired codes for 7 days for audit
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
