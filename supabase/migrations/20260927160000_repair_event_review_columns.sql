-- Repair projects whose migration history says the review snapshot migration
-- ran, but whose organizer_events table is missing the physical columns.
-- The review trigger already references these fields, so without them even an
-- admin approval fails with "record old has no field review_previous_snapshot".
ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS review_previous_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_organizer_events_pending_review_requested
  ON public.organizer_events (status, review_requested_at DESC)
  WHERE status = 'pending';

NOTIFY pgrst, 'reload schema';
