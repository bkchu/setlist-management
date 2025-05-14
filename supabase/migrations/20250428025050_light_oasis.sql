/*
  # Add song files support

  1. Changes
    - Add `files` column to songs table to store file metadata
    - Create storage bucket for song files

  2. Security
    - Enable storage bucket access for authenticated users
    - Add policy for users to manage their own files
*/

-- Add files column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS files jsonb[];

-- Create storage bucket for song files
INSERT INTO storage.buckets (id, name, public)
VALUES ('song-files', 'song-files', false);

-- Allow authenticated users to manage their own files
CREATE POLICY "Users can manage their own song files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'song-files' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'song-files' AND auth.uid()::text = (storage.foldername(name))[1]);