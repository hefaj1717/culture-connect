-- 20260919210000 replaces the global notification uniqueness rule with a partial index.
-- The existing event-published trigger must therefore use generic conflict handling.
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
