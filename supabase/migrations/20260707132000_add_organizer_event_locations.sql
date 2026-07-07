-- ============================================================
-- ORGANIZER EVENT LOCATIONS
-- ============================================================

ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS venue_address text,
  ADD COLUMN IF NOT EXISTS venue_latitude double precision,
  ADD COLUMN IF NOT EXISTS venue_longitude double precision;
