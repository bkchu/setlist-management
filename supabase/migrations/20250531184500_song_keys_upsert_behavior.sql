-- Improve song_keys tracking with UPSERT behavior
-- This ensures each song has exactly one key record per setlist
-- and updates the existing record when keys are changed

-- Drop existing trigger to update it
DROP TRIGGER IF EXISTS track_song_key_trigger ON setlist_songs;

-- Update function to use UPSERT behavior
CREATE OR REPLACE FUNCTION track_song_key()
RETURNS TRIGGER AS $$
DECLARE
  setlist_date timestamptz;
BEGIN
  -- Only process if key is not null and has actually changed
  IF NEW.key IS NOT NULL AND (
    -- Always process for new records
    TG_OP = 'INSERT' OR 
    -- For updates, only process if key actually changed
    (TG_OP = 'UPDATE' AND (OLD.key IS NULL OR OLD.key IS DISTINCT FROM NEW.key))
  ) THEN
    -- Get the setlist date to use as played_at
    SELECT date INTO setlist_date FROM setlists WHERE id = NEW.setlist_id;
    
    -- Use UPSERT to either insert new record or update existing one
    -- for the same song in the same setlist
    INSERT INTO song_keys (song_id, key, setlist_id, played_at)
    VALUES (NEW.song_id, NEW.key, NEW.setlist_id, COALESCE(setlist_date, now()))
    ON CONFLICT (song_id, setlist_id) 
    DO UPDATE SET 
      key = EXCLUDED.key,
      played_at = EXCLUDED.played_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create unique constraint to support UPSERT
-- This ensures one record per song per setlist
CREATE UNIQUE INDEX IF NOT EXISTS idx_song_keys_unique_song_setlist 
ON song_keys(song_id, setlist_id);

-- Recreate trigger
CREATE TRIGGER track_song_key_trigger
  AFTER INSERT OR UPDATE OF key
  ON setlist_songs
  FOR EACH ROW
  EXECUTE FUNCTION track_song_key(); 