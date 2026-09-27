-- Passport progress is derived from verified server-side activity. Clients can
-- read only their own aggregate and never award a badge directly.
CREATE OR REPLACE FUNCTION public.get_my_digital_passport_progress()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid := auth.uid();
  _created_at timestamptz;
  _events_completed integer := 0;
  _quests_completed integer := 0;
  _same_organizer_events integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT created_at INTO _created_at FROM auth.users WHERE id = _uid;

  SELECT count(*) INTO _events_completed
  FROM public.user_event_responses
  WHERE user_id = _uid AND status = 'attended';

  SELECT count(*) INTO _quests_completed
  FROM public.quest_completions
  WHERE user_id = _uid;

  SELECT COALESCE(max(organizer_events.completed_count), 0) INTO _same_organizer_events
  FROM (
    SELECT event.organizer_user_id, count(*)::integer AS completed_count
    FROM public.user_event_responses AS response
    JOIN public.organizer_events AS event ON event.id = response.event_id
    WHERE response.user_id = _uid AND response.status = 'attended'
    GROUP BY event.organizer_user_id
  ) AS organizer_events;

  RETURN jsonb_build_object(
    'success', true,
    'beta_user', _created_at < timestamptz '2027-01-01 00:00:00+00',
    'events_completed', _events_completed,
    'quests_completed', _quests_completed,
    'same_organizer_events', _same_organizer_events
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_digital_passport_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_digital_passport_progress() TO authenticated;
