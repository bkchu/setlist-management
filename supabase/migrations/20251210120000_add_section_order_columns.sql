/*
  # Add section order support for songs and setlist songs

  1) Changes
    - Add default_section_order to songs (stores the canonical order for the song)
    - Add section_order to setlist_songs (per-setlist override)

  2) Notes
    - Both columns are JSONB to keep ordering and support repeat metadata.
    - Defaults to NULL to avoid touching existing rows.
*/

-- Song-level default order (e.g., Verse 1 -> Chorus -> Bridge)
ALTER TABLE songs
ADD COLUMN IF NOT EXISTS default_section_order JSONB DEFAULT NULL;

-- Per-setlist override of section order
ALTER TABLE setlist_songs
ADD COLUMN IF NOT EXISTS section_order JSONB DEFAULT NULL;


