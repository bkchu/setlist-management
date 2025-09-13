-- Restore UPSERT behavior for tracking song keys to avoid unique violations
-- Ensures a single song_keys row per (song_id, setlist_id) and updates when key changes

-- Drop existing trigger to replace it safely
DROP TRIGGER IF EXISTS track_song_key_trigger ON setlist_songs;

-- Recreate the trigger function with UPSERT semantics and proper played_at
CREATE OR REPLACE FUNCTION track_song_key()
RETURNS TRIGGER AS $$
DECLARE
  setlist_date timestamptz;
BEGIN
  -- Only act when key is set and relevant to operation
  IF NEW.key IS NOT NULL AND (
    TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.key IS NULL OR OLD.key IS DISTINCT FROM NEW.key))
  ) THEN
    -- Use the setlist's date for played_at when available
    SELECT date INTO setlist_date FROM setlists WHERE id = NEW.setlist_id;

    -- Upsert to maintain a single row per song/setlist
    INSERT INTO song_keys (song_id, key, setlist_id, played_at)
    VALUES (NEW.song_id, NEW.key, NEW.setlist_id, COALESCE(setlist_date, now()))
    ON CONFLICT (song_id, setlist_id)
    DO UPDATE SET
      key = EXCLUDED.key,
      played_at = EXCLUDED.played_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Ensure supporting unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_song_keys_unique_song_setlist ON song_keys(song_id, setlist_id);

-- Recreate trigger to call the function on inserts and key updates
CREATE TRIGGER track_song_key_trigger
  AFTER INSERT OR UPDATE OF key
  ON setlist_songs
  FOR EACH ROW
  EXECUTE FUNCTION track_song_key();


