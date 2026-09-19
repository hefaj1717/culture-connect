-- A multi-day event needs a display label as well as its exact end timestamp.
-- Existing single-day events retain their current date as the end date.
ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS end_date_label text;

UPDATE public.organizer_events
SET end_date_label = date_label
WHERE end_date_label IS NULL OR btrim(end_date_label) = '';

ALTER TABLE public.organizer_events
  ALTER COLUMN end_date_label SET DEFAULT '';
