-- Add denormalized user info to join_codes for better UX in admin UI
-- This captures the user's display name and email at redemption time

BEGIN;

ALTER TABLE public.join_codes
  ADD COLUMN IF NOT EXISTS used_by_name text,
  ADD COLUMN IF NOT EXISTS used_by_email text;

COMMIT;


