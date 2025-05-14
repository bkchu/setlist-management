/*
  # Add comprehensive song key tracking

  1. New Tables
    - `song_keys`
      - `id` (uuid, primary key)
      - `song_id` (uuid, foreign key)
      - `key` (text)
      - `played_at` (timestamptz)
      - `setlist_id` (uuid, foreign key)

  2. Changes
    - Remove `last_played_key` and `last_played_at` columns from songs table
    - Update trigger function to track all keys

  3. Security
    - Enable RLS on song_keys table
    - Add policy for authenticated users
*/

-- Create song_keys table
CREATE TABLE IF NOT EXISTS song_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  key text NOT NULL,
  played_at timestamptz DEFAULT now(),
  setlist_id uuid NOT NULL REFERENCES setlists(id) ON DELETE CASCADE
);

-- Remove old columns from songs table
ALTER TABLE songs 
DROP COLUMN IF EXISTS last_played_key,
DROP COLUMN IF EXISTS last_played_at;

-- Drop old trigger and function
DROP TRIGGER IF EXISTS update_song_last_played_key_trigger ON setlist_songs;
DROP FUNCTION IF EXISTS update_song_last_played_key;

-- Create new function to track song keys
CREATE OR REPLACE FUNCTION track_song_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.key IS NOT NULL THEN
    INSERT INTO song_keys (song_id, key, setlist_id)
    VALUES (NEW.song_id, NEW.key, NEW.setlist_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER track_song_key_trigger
  AFTER INSERT OR UPDATE OF key
  ON setlist_songs
  FOR EACH ROW
  EXECUTE FUNCTION track_song_key();

-- Enable RLS on song_keys
ALTER TABLE song_keys ENABLE ROW LEVEL SECURITY;

-- Create policy for song_keys
CREATE POLICY "Users can view song keys through song ownership"
  ON song_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM songs
      WHERE id = song_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM songs
      WHERE id = song_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_song_keys_song_id ON song_keys(song_id);
CREATE INDEX IF NOT EXISTS idx_song_keys_setlist_id ON song_keys(setlist_id);