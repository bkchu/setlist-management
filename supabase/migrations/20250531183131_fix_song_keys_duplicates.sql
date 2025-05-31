-- Fix duplicate song_keys insertion by checking if key actually changed
-- This addresses the issue where upsert operations on setlist_songs were
-- creating duplicate entries in song_keys even when the key didn't change

-- Drop existing trigger
DROP TRIGGER IF EXISTS track_song_key_trigger ON setlist_songs;

-- Update function to prevent duplicates
CREATE OR REPLACE FUNCTION track_song_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if key is not null and has actually changed
  IF NEW.key IS NOT NULL AND (
    -- Always insert for new records
    TG_OP = 'INSERT' OR 
    -- For updates, only insert if key actually changed
    (TG_OP = 'UPDATE' AND (OLD.key IS NULL OR OLD.key IS DISTINCT FROM NEW.key))
  ) THEN
    INSERT INTO song_keys (song_id, key, setlist_id)
    VALUES (NEW.song_id, NEW.key, NEW.setlist_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger with same conditions
CREATE TRIGGER track_song_key_trigger
  AFTER INSERT OR UPDATE OF key
  ON setlist_songs
  FOR EACH ROW
  EXECUTE FUNCTION track_song_key(); 