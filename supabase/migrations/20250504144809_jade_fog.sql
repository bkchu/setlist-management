/*
  # Add last played key tracking

  1. Changes
    - Add `last_played_key` column to songs table
    - Add `last_played_at` column to songs table
    - Add function to update last played key when adding/updating setlist songs

  2. Notes
    - Automatically updates when songs are added to setlists
    - Tracks when the key was last used
*/

-- Add columns to songs table
ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS last_played_key text,
ADD COLUMN IF NOT EXISTS last_played_at timestamptz;

-- Create function to update last played key
CREATE OR REPLACE FUNCTION update_song_last_played_key()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the key is not null and different from current
  IF NEW.key IS NOT NULL AND (
    SELECT last_played_key FROM songs WHERE id = NEW.song_id
  ) IS DISTINCT FROM NEW.key THEN
    UPDATE songs
    SET 
      last_played_key = NEW.key,
      last_played_at = now()
    WHERE id = NEW.song_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last played key
DROP TRIGGER IF EXISTS update_song_last_played_key_trigger ON setlist_songs;
CREATE TRIGGER update_song_last_played_key_trigger
  AFTER INSERT OR UPDATE OF key
  ON setlist_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_song_last_played_key();