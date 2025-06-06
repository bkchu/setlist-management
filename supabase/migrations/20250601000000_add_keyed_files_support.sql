/*
  # Add Key-Specific File Support

  1. Changes
    - Add `keyed_files` column to songs table to support key-specific file organization
    - Migrate existing files to keyed structure under "default" key
    - Keep existing `files` column for backward compatibility during transition

  2. Structure
    - keyed_files: jsonb object with keys as musical keys and values as file arrays
    - Example: { "default": [...], "G": [...], "F": [...] }

  3. Migration
    - Convert existing files to keyed_files structure
    - All existing files become "default" files
*/

-- Add keyed_files column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS keyed_files jsonb DEFAULT '{}';

-- Migration function to convert existing files to keyed structure
CREATE OR REPLACE FUNCTION migrate_files_to_keyed()
RETURNS void AS $$
DECLARE
  song_record RECORD;
  keyed_files_obj jsonb;
BEGIN
  -- Process songs that have files but no keyed_files yet
  FOR song_record IN 
    SELECT id, files 
    FROM songs 
    WHERE files IS NOT NULL 
    AND array_length(files, 1) > 0
    AND (keyed_files IS NULL OR keyed_files = '{}')
  LOOP
    -- Convert existing files array to keyed structure under "default"
    keyed_files_obj := jsonb_build_object('default', to_jsonb(song_record.files));
    
    UPDATE songs 
    SET keyed_files = keyed_files_obj
    WHERE id = song_record.id;
    
    RAISE NOTICE 'Migrated % files for song %', array_length(song_record.files, 1), song_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_files_to_keyed();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_files_to_keyed();

-- Add index for better performance on keyed_files queries
CREATE INDEX IF NOT EXISTS idx_songs_keyed_files ON songs USING gin(keyed_files); 