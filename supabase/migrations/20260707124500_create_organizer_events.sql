-- ============================================================
-- ORGANIZER EVENTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_approved_organizer(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizer_applications
    WHERE user_id = _user_id
      AND status = 'approved'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_approved_organizer(uuid) FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.organizer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_key text NOT NULL CHECK (city_key IN ('leuven', 'lublin')),
  venue_key text NOT NULL,
  venue_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (
    category IN ('exhibition', 'performance', 'screening', 'workshop', 'festival', 'concert')
  ),
  date_label text NOT NULL,
  time_label text NOT NULL,
  xp_bonus integer NOT NULL DEFAULT 50 CHECK (xp_bonus BETWEEN 0 AND 500),
  language text NOT NULL DEFAULT 'en' CHECK (
    language IN ('en', 'nl', 'fr', 'pl', 'multilingual')
  ),
  is_free boolean NOT NULL DEFAULT true,
  is_international boolean NOT NULL DEFAULT true,
  attendee_count integer NOT NULL DEFAULT 0 CHECK (attendee_count >= 0),
  image_kind text NOT NULL DEFAULT 'theater' CHECK (image_kind IN ('museum', 'cafe', 'theater')),
  check_in_code text NOT NULL UNIQUE DEFAULT ('culturequest:event:' || gen_random_uuid()::text),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizer events are viewable by authenticated users"
  ON public.organizer_events;

CREATE POLICY "Organizer events are viewable by authenticated users"
  ON public.organizer_events FOR SELECT TO authenticated
  USING (status = 'published' OR organizer_user_id = auth.uid());

DROP POLICY IF EXISTS "Approved organizers can create events"
  ON public.organizer_events;

CREATE POLICY "Approved organizers can create events"
  ON public.organizer_events FOR INSERT TO authenticated
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
  );

DROP POLICY IF EXISTS "Approved organizers can update their events"
  ON public.organizer_events;

CREATE POLICY "Approved organizers can update their events"
  ON public.organizer_events FOR UPDATE TO authenticated
  USING (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
  )
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
  );

DROP TRIGGER IF EXISTS organizer_events_set_updated_at
  ON public.organizer_events;

CREATE TRIGGER organizer_events_set_updated_at
  BEFORE UPDATE ON public.organizer_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_organizer_events_city
  ON public.organizer_events (city_key, status);

CREATE INDEX IF NOT EXISTS idx_organizer_events_organizer
  ON public.organizer_events (organizer_user_id);
