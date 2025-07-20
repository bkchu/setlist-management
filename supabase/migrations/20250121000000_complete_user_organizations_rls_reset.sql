/*
  # Complete RLS Reset for user_organizations Table
  
  This migration completely resets all RLS policies on the user_organizations table
  to fix any recursive or problematic policies that are causing issues.
  
  Steps:
  1. Drop ALL existing policies forcefully
  2. Disable RLS completely
  3. Re-enable RLS
  4. Create minimal, safe policies with no recursion
*/

-- Step 1: Forcefully drop ALL policies on user_organizations
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies on user_organizations table
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_organizations'
    LOOP
        -- Drop each policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
        RAISE NOTICE 'Dropped policy: % on %.%', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename;
    END LOOP;
    
    -- Also try to drop any policies that might have naming conflicts
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Organization owners can manage memberships" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own memberships" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own memberships" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Organization owners can manage memberships in their orgs" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own membership details" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own memberships" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_organizations_select_own" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_organizations_insert_own" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_organizations_owners_manage" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_organizations_update_own" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_organizations_delete_own" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_orgs_select_own" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_orgs_insert_own" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_orgs_owners_manage" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_orgs_update_own" ON user_organizations';
    EXECUTE 'DROP POLICY IF EXISTS "user_orgs_delete_own" ON user_organizations';
    
    RAISE NOTICE 'All user_organizations policies have been dropped';
END $$;

-- Step 2: Completely disable RLS to reset state
ALTER TABLE user_organizations DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'RLS disabled on user_organizations';
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'RLS re-enabled on user_organizations';
END $$;

-- Step 4: Create new, simple, safe policies

-- Policy 1: Users can view their own memberships (basic SELECT)
-- This is the safest policy - no joins, no subqueries, just direct comparison
CREATE POLICY "uo_select_own"
  ON user_organizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own memberships
-- Safe because it only checks the user_id being inserted
CREATE POLICY "uo_insert_own"
  ON user_organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own membership details
-- Safe because it only affects their own records
CREATE POLICY "uo_update_own"
  ON user_organizations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own memberships (leave organization)
-- Safe because it only affects their own records
CREATE POLICY "uo_delete_own"
  ON user_organizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 5: Organization owners can manage memberships in their organizations
-- This uses organizations.owner_id to avoid any recursion with user_organizations
CREATE POLICY "uo_owners_manage"
  ON user_organizations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = user_organizations.organization_id
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = user_organizations.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- Step 5: Verify the policies are correctly set
DO $$
DECLARE
    policy_count INTEGER;
    policy_record RECORD;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_organizations';
    
    RAISE NOTICE 'Total policies on user_organizations: %', policy_count;
    
    -- List all policies
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_organizations'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Command: % | Using: % | With Check: %', 
            policy_record.policyname, 
            policy_record.cmd,
            COALESCE(policy_record.qual, 'NULL'),
            COALESCE(policy_record.with_check, 'NULL');
    END LOOP;
END $$; 