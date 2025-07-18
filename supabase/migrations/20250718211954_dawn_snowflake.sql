@@ .. @@
 /*
-  # Modify songs table for organizations
+  # Add organization support to songs table (keeping user_id for now)
 
   1. New Columns
-    - Add `organization_id` (uuid, not null, foreign key to organizations.id)
-    - Remove `user_id` column
+    - Add `organization_id` (uuid, nullable initially, foreign key to organizations.id)
   
   2. Data Migration
     - Create default organization for each existing user
-    - Migrate all existing songs to user's default organization
+    - Update all existing songs with their user's default organization
   
   3. Security
-    - Update RLS policies to use organization ownership instead of user ownership
+    - Update RLS policies to check both user_id and organization ownership
+    - Maintain backward compatibility during transition
 */
 
--- Create default organizations for existing users who have songs
+-- Step 1: Add organization_id column (nullable for now)
+ALTER TABLE songs 
+ADD COLUMN organization_id uuid;
+
+-- Step 2: Add foreign key constraint
+ALTER TABLE songs 
+ADD CONSTRAINT songs_organization_id_fkey 
+FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
+
+-- Step 3: Create default organizations for existing users who have songs
 INSERT INTO organizations (name, owner_id)
 SELECT 
   'My Organization' as name,
   user_id as owner_id
 FROM songs 
 WHERE user_id IS NOT NULL
 GROUP BY user_id;
 
--- Migrate existing songs to their user's default organization
+-- Step 4: Update existing songs with their user's default organization
 UPDATE songs 
 SET organization_id = (
   SELECT o.id 
   FROM organizations o 
   WHERE o.owner_id = songs.user_id 
   AND o.name = 'My Organization'
   LIMIT 1
 )
 WHERE user_id IS NOT NULL;
 
--- Remove the user_id column
-ALTER TABLE songs DROP COLUMN user_id;
-
--- Add organization_id column with foreign key constraint
-ALTER TABLE songs 
-ADD COLUMN organization_id uuid NOT NULL;
-
-ALTER TABLE songs 
-ADD CONSTRAINT songs_organization_id_fkey 
-FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
+-- Step 5: Make organization_id NOT NULL now that all existing songs have been updated
+ALTER TABLE songs 
+ALTER COLUMN organization_id SET NOT NULL;
 
--- Add index for performance
+-- Step 6: Add index for performance
 CREATE INDEX idx_songs_organization_id ON songs(organization_id);
 
--- Drop existing RLS policies
+-- Step 7: Update RLS policies to support both user_id and organization_id
+-- Drop existing policies
 DROP POLICY IF EXISTS "Users can manage their own songs" ON songs;
 
--- Create new organization-based RLS policies
+-- Create new hybrid policies (checking both user_id and organization ownership)
 CREATE POLICY "Users can manage songs in their organizations"
   ON songs
   FOR ALL
   TO authenticated
-  USING (
-    EXISTS (
-      SELECT 1 FROM organizations 
-      WHERE id = songs.organization_id 
-      AND owner_id = auth.uid()
-    )
-  )
-  WITH CHECK (
-    EXISTS (
-      SELECT 1 FROM organizations 
-      WHERE id = songs.organization_id 
-      AND owner_id = auth.uid()
-    )
-  );
+  USING (auth.uid() = user_id OR EXISTS (
+    SELECT 1 FROM organizations 
+    WHERE id = songs.organization_id 
+    AND owner_id = auth.uid()
+  ))
+  WITH CHECK (auth.uid() = user_id OR EXISTS (
+    SELECT 1 FROM organizations 
+    WHERE id = songs.organization_id 
+    AND owner_id = auth.uid()
+  ));