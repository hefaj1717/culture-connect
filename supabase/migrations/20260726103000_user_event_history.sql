-- ============================================================
-- USER EVENT HISTORY
-- ============================================================
-- Stores user intent/history for approved organizer events.
-- The app uses this for Profile -> My activity.

CREATE TABLE IF NOT EXISTS public.user_event_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.organizer_events(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('interested', 'going', 'attended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE public.user_event_responses ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS user_event_responses_set_updated_at
  ON public.user_event_responses;

CREATE TRIGGER user_event_responses_set_updated_at
  BEFORE UPDATE ON public.user_event_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Users manage their own event responses"
  ON public.user_event_responses;

CREATE POLICY "Users manage their own event responses"
  ON public.user_event_responses FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view event responses"
  ON public.user_event_responses;

CREATE POLICY "Admins view event responses"
  ON public.user_event_responses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_event_responses_user
  ON public.user_event_responses (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_event_responses_event
  ON public.user_event_responses (event_id, status);
