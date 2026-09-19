-- Following is private: users may only see and manage their own follows.
CREATE TABLE IF NOT EXISTS public.organizer_follows (
  follower_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_user_id, organizer_user_id),
  CONSTRAINT organizer_follows_no_self_follow
    CHECK (follower_user_id <> organizer_user_id)
);

ALTER TABLE public.organizer_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own organizer follows"
  ON public.organizer_follows FOR SELECT TO authenticated
  USING (follower_user_id = auth.uid());

CREATE POLICY "Users follow approved organizers"
  ON public.organizer_follows FOR INSERT TO authenticated
  WITH CHECK (
    follower_user_id = auth.uid()
    AND follower_user_id <> organizer_user_id
    AND public.is_approved_organizer(organizer_user_id)
  );

CREATE POLICY "Users unfollow organizers"
  ON public.organizer_follows FOR DELETE TO authenticated
  USING (follower_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_organizer_follows_organizer
  ON public.organizer_follows (organizer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.organizer_events(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('organizer_event_published')),
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id, type)
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own notifications"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_organizer_followers_of_approved_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer_name text;
BEGIN
  IF NEW.status <> 'approved' OR (TG_OP = 'UPDATE' AND OLD.status = 'approved') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(username), ''), 'An organizer')
  INTO organizer_name
  FROM public.profiles
  WHERE id = NEW.organizer_user_id;

  INSERT INTO public.user_notifications (user_id, event_id, type, title, body)
  SELECT
    follow.follower_user_id,
    NEW.id,
    'organizer_event_published',
    organizer_name || ' has a new event',
    NEW.title || ' · ' || NEW.date_label || ' · ' || NEW.venue_name
  FROM public.organizer_follows follow
  WHERE follow.organizer_user_id = NEW.organizer_user_id
  ON CONFLICT (user_id, event_id, type) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_organizer_followers_of_approved_event()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizer_events_notify_followers ON public.organizer_events;
CREATE TRIGGER organizer_events_notify_followers
  AFTER INSERT OR UPDATE OF status ON public.organizer_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_organizer_followers_of_approved_event();
