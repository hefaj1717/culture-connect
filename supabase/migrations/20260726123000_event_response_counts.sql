-- ============================================================
-- EVENT RESPONSE COUNTS
-- ============================================================
-- Keeps public event counters in organizer_events without exposing
-- individual user response rows to everyone.

ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS interested_count integer NOT NULL DEFAULT 0 CHECK (interested_count >= 0);

CREATE OR REPLACE FUNCTION public.refresh_organizer_event_response_counts(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.organizer_events
  SET
    interested_count = (
      SELECT count(*)::integer
      FROM public.user_event_responses
      WHERE event_id = _event_id
        AND status IN ('interested', 'going')
    ),
    attendee_count = (
      SELECT count(*)::integer
      FROM public.user_event_responses
      WHERE event_id = _event_id
        AND status = 'attended'
    )
  WHERE id = _event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_organizer_event_response_counts(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_organizer_event_response_counts_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_organizer_event_response_counts(OLD.event_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_organizer_event_response_counts(NEW.event_id);

  IF TG_OP = 'UPDATE' AND OLD.event_id IS DISTINCT FROM NEW.event_id THEN
    PERFORM public.refresh_organizer_event_response_counts(OLD.event_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_event_responses_refresh_counts
  ON public.user_event_responses;

CREATE TRIGGER user_event_responses_refresh_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.user_event_responses
  FOR EACH ROW EXECUTE FUNCTION public.refresh_organizer_event_response_counts_trigger();

UPDATE public.organizer_events event
SET
  interested_count = counts.interested_count,
  attendee_count = counts.attendee_count
FROM (
  SELECT
    organizer_events.id,
    count(user_event_responses.id) FILTER (
      WHERE user_event_responses.status IN ('interested', 'going')
    )::integer AS interested_count,
    count(user_event_responses.id) FILTER (
      WHERE user_event_responses.status = 'attended'
    )::integer AS attendee_count
  FROM public.organizer_events
  LEFT JOIN public.user_event_responses
    ON user_event_responses.event_id = organizer_events.id
  GROUP BY organizer_events.id
) AS counts
WHERE event.id = counts.id;
