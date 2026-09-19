-- Keep the database category contract aligned with the app picker.
-- Existing festival events remain available and are grouped under Other.
UPDATE public.organizer_events
SET category = 'other'
WHERE category NOT IN (
  'exhibition',
  'concert',
  'screening',
  'workshop',
  'party',
  'performance',
  'market',
  'lecture',
  'sports',
  'other'
);

ALTER TABLE public.organizer_events
  DROP CONSTRAINT IF EXISTS organizer_events_category_check;

ALTER TABLE public.organizer_events
  ADD CONSTRAINT organizer_events_category_check
  CHECK (
    category IN (
      'exhibition',
      'concert',
      'screening',
      'workshop',
      'party',
      'performance',
      'market',
      'lecture',
      'sports',
      'other'
    )
  );
