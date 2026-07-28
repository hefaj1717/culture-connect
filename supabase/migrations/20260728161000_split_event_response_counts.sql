ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS going_count integer NOT NULL DEFAULT 0 CHECK (going_count >= 0);

CREATE OR REPLACE FUNCTION public.refresh_organizer_event_response_counts(_event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.organizer_events
  SET
    interested_count = (
      SELECT count(*)::integer
      FROM public.user_event_responses
      WHERE event_id = _event_id
        AND status = 'interested'
    ),
    going_count = (
      SELECT count(*)::integer
      FROM public.user_event_responses
      WHERE event_id = _event_id
        AND status = 'going'
    ),
    attendee_count = (
      SELECT count(*)::integer
      FROM public.user_event_responses
      WHERE event_id = _event_id
        AND status = 'attended'
    )
  WHERE id = _event_id;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_organizer_event_response_counts(uuid)
  FROM PUBLIC, anon, authenticated;

UPDATE public.organizer_events event
SET
  interested_count = counts.interested_count,
  going_count = counts.going_count,
  attendee_count = counts.attendee_count
FROM (
  SELECT
    organizer_events.id,
    count(user_event_responses.id) FILTER (
      WHERE user_event_responses.status = 'interested'
    )::integer AS interested_count,
    count(user_event_responses.id) FILTER (
      WHERE user_event_responses.status = 'going'
    )::integer AS going_count,
    count(user_event_responses.id) FILTER (
      WHERE user_event_responses.status = 'attended'
    )::integer AS attendee_count
  FROM public.organizer_events
  LEFT JOIN public.user_event_responses
    ON user_event_responses.event_id = organizer_events.id
  GROUP BY organizer_events.id
) counts
WHERE event.id = counts.id;
