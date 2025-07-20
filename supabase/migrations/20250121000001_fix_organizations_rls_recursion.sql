/*
  # Fix Organizations RLS Circular Dependency
  
  The organizations table has a policy that queries user_organizations,
  while user_organizations policies query organizations.
  This creates infinite recursion.
  
  Solution: Make organizations policies only use owner_id (no user_organizations queries)
  and keep user_organizations policies that reference organizations for ownership checks.
*/

-- Step 1: Drop ALL existing organizations policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can delete their own organizations" ON organizations;

-- Step 2: Create simple, non-recursive organizations policies
-- These policies only use the direct owner_id field, no joins to user_organizations

-- Policy: Users can view organizations they own (owner_id only)
CREATE POLICY "Users can view organizations they own"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Policy: Users can create organizations (they become the owner)
CREATE POLICY "Users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update organizations they own
CREATE POLICY "Users can update organizations they own"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete organizations they own
CREATE POLICY "Users can delete organizations they own"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Step 3: Verify no circular dependencies exist
DO $$
DECLARE
    org_policy_record RECORD;
    uo_policy_record RECORD;
BEGIN
    RAISE NOTICE 'Checking organizations policies for user_organizations references...';
    
    FOR org_policy_record IN 
        SELECT policyname, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'organizations'
    LOOP
        IF org_policy_record.qual LIKE '%user_organizations%' OR 
           COALESCE(org_policy_record.with_check, '') LIKE '%user_organizations%' THEN
            RAISE WARNING 'Organizations policy % references user_organizations - potential recursion!', 
                org_policy_record.policyname;
        ELSE
            RAISE NOTICE 'Organizations policy % is safe: %', 
                org_policy_record.policyname, 
                COALESCE(org_policy_record.qual, 'NULL');
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Checking user_organizations policies for organizations references...';
    
    FOR uo_policy_record IN 
        SELECT policyname, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_organizations'
    LOOP
        IF uo_policy_record.qual LIKE '%organizations%' OR 
           COALESCE(uo_policy_record.with_check, '') LIKE '%organizations%' THEN
            RAISE NOTICE 'user_organizations policy % references organizations (this is OK): %', 
                uo_policy_record.policyname,
                COALESCE(uo_policy_record.qual, 'NULL');
        END IF;
    END LOOP;
    
    RAISE NOTICE 'RLS recursion check complete';
END $$; 