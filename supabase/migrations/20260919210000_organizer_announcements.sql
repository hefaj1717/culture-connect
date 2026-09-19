-- Short announcements are delivered only to followers through their private notification inbox.
ALTER TABLE public.organizer_follows
  ADD COLUMN IF NOT EXISTS announcements_muted boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.organizer_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.organizer_events(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 240),
  created_at timestamptz NOT NULL DEFAULT now(),
  announcement_day date NOT NULL DEFAULT (timezone('Europe/Warsaw', now())::date),
  CONSTRAINT organizer_announcements_one_per_day UNIQUE (organizer_user_id, announcement_day)
);

ALTER TABLE public.organizer_announcements ENABLE ROW LEVEL SECURITY;

-- The table itself is not an API. The function below validates and atomically creates announcements.
ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_user_id_event_id_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_published_event_unique
  ON public.user_notifications (user_id, event_id, type)
  WHERE type = 'organizer_event_published';

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
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_type_check
  CHECK (type IN (
    'organizer_event_published',
    'organizer_event_updated',
    'organizer_event_deleted',
    'organizer_announcement'
  ));

CREATE OR REPLACE FUNCTION public.publish_organizer_announcement(
  p_title text,
  p_body text,
  p_event_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_title text := btrim(COALESCE(p_title, ''));
  v_body text := btrim(COALESCE(p_body, ''));
  v_announcement_id uuid;
  v_event_is_valid boolean;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_approved_organizer(v_user_id) THEN
    RAISE EXCEPTION 'Only approved organizers can publish announcements.' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_title) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Announcement title must be between 1 and 60 characters.' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_body) NOT BETWEEN 1 AND 240 THEN
    RAISE EXCEPTION 'Announcement message must be between 1 and 240 characters.' USING ERRCODE = '22023';
  END IF;

  IF p_event_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.organizer_events
      WHERE id = p_event_id
        AND organizer_user_id = v_user_id
        AND status = 'approved'
    ) INTO v_event_is_valid;

    IF NOT v_event_is_valid THEN
      RAISE EXCEPTION 'You can only link an approved event that belongs to you.' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.organizer_announcements (organizer_user_id, event_id, title, body)
  VALUES (v_user_id, p_event_id, v_title, v_body)
  RETURNING id INTO v_announcement_id;

  INSERT INTO public.user_notifications (user_id, event_id, type, title, body)
  SELECT
    follow.follower_user_id,
    p_event_id,
    'organizer_announcement',
    v_title,
    v_body
  FROM public.organizer_follows follow
  WHERE follow.organizer_user_id = v_user_id
    AND follow.announcements_muted = false;

  RETURN v_announcement_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already sent an announcement today. Try again tomorrow.' USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_organizer_announcement_muted(
  p_organizer_user_id uuid,
  p_muted boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You need to be logged in.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organizer_follows
  SET announcements_muted = p_muted
  WHERE follower_user_id = v_user_id
    AND organizer_user_id = p_organizer_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Follow this organizer before changing announcement notifications.' USING ERRCODE = 'P0002';
  END IF;

  RETURN p_muted;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_organizer_announcement(text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_organizer_announcement_muted(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_organizer_announcement(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_organizer_announcement_muted(uuid, boolean) TO authenticated;
