-- Keep attendance and quest-completion proofs out of rows readable by all signed-in users.
-- The raw values are only ever returned to an event owner/admin through narrow RPCs.

CREATE TABLE IF NOT EXISTS public.organizer_event_checkin_secrets (
  event_id uuid PRIMARY KEY REFERENCES public.organizer_events(id) ON DELETE CASCADE,
  check_in_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_event_checkin_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.organizer_event_checkin_secrets FROM PUBLIC, anon, authenticated;

INSERT INTO public.organizer_event_checkin_secrets (event_id, check_in_code)
SELECT id, check_in_code
FROM public.organizer_events
WHERE check_in_code IS NOT NULL
ON CONFLICT (event_id) DO NOTHING;

ALTER TABLE public.organizer_events DROP COLUMN IF EXISTS check_in_code;

CREATE OR REPLACE FUNCTION public.create_organizer_event_checkin_secret()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organizer_event_checkin_secrets (event_id, check_in_code)
  VALUES (NEW.id, 'culturequest:event:' || gen_random_uuid()::text)
  ON CONFLICT (event_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_organizer_event_checkin_secret ON public.organizer_events;
CREATE TRIGGER create_organizer_event_checkin_secret
AFTER INSERT ON public.organizer_events
FOR EACH ROW EXECUTE FUNCTION public.create_organizer_event_checkin_secret();

CREATE OR REPLACE FUNCTION public.get_organizer_event_checkin_code(_event_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organizer_events
    WHERE id = _event_id
      AND (organizer_user_id = _uid OR public.has_role(_uid, 'admin'))
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT check_in_code
  INTO _code
  FROM public.organizer_event_checkin_secrets
  WHERE event_id = _event_id;

  RETURN _code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_organizer_event_checkin_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_organizer_event_checkin_code(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_organizer_event_attendance(
  _event_id uuid,
  _check_in_code text,
  _user_lat double precision,
  _user_lng double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _event public.organizer_events%ROWTYPE;
  _expected_code text;
  _distance double precision;
  _source_key text;
  _now timestamptz := now();
  _xp integer;
  _xp_result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _check_in_code IS NULL OR length(trim(_check_in_code)) < 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_code');
  END IF;

  IF _user_lat IS NULL OR _user_lng IS NULL
    OR _user_lat < -90 OR _user_lat > 90
    OR _user_lng < -180 OR _user_lng > 180 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_location');
  END IF;

  SELECT * INTO _event
  FROM public.organizer_events
  WHERE id = _event_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_unavailable');
  END IF;

  IF _event.starts_at IS NOT NULL AND _now < _event.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_started');
  END IF;

  IF _event.ends_at IS NOT NULL AND _now > _event.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_finished');
  END IF;

  SELECT check_in_code INTO _expected_code
  FROM public.organizer_event_checkin_secrets
  WHERE event_id = _event.id;

  IF _expected_code IS NULL OR _expected_code <> trim(_check_in_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_code');
  END IF;

  IF _event.venue_latitude IS NULL OR _event.venue_longitude IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_location');
  END IF;

  _distance := public.haversine_m(_user_lat, _user_lng, _event.venue_latitude, _event.venue_longitude);
  IF _distance > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_far', 'distance_m', round(_distance));
  END IF;

  _xp := GREATEST(0, COALESCE(_event.xp_bonus, 50));
  _source_key := 'event:' || _event.id::text;

  INSERT INTO public.user_event_responses (user_id, event_id, status)
  VALUES (_uid, _event.id, 'attended')
  ON CONFLICT (user_id, event_id) DO UPDATE SET status = 'attended', updated_at = now();

  IF _xp <= 0 THEN
    RETURN jsonb_build_object('success', true, 'duplicate', false, 'xp_earned', 0,
      'total_xp', COALESCE((SELECT total_xp FROM public.profiles WHERE id = _uid), 0));
  END IF;

  _xp_result := public.apply_xp_transaction(
    _uid, _xp, 'earn', 'Event attendance: ' || _event.title, _source_key, 'event', _event.id,
    jsonb_build_object('event_title', _event.title, 'venue_name', _event.venue_name, 'distance_m', round(_distance))
  );

  RETURN _xp_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_organizer_event_attendance(uuid, text, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_organizer_event_attendance(uuid, text, double precision, double precision) TO authenticated;

CREATE TABLE IF NOT EXISTS public.quest_completion_secrets (
  quest_id uuid PRIMARY KEY REFERENCES public.quests(id) ON DELETE CASCADE,
  completion_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_completion_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.quest_completion_secrets FROM PUBLIC, anon, authenticated;

INSERT INTO public.quest_completion_secrets (quest_id, completion_code)
SELECT id, 'culturequest:quest:' || gen_random_uuid()::text
FROM public.quests
ON CONFLICT (quest_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_quest_completion_secret()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.quest_completion_secrets (quest_id, completion_code)
  VALUES (NEW.id, 'culturequest:quest:' || gen_random_uuid()::text)
  ON CONFLICT (quest_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_quest_completion_secret ON public.quests;
CREATE TRIGGER create_quest_completion_secret
AFTER INSERT ON public.quests
FOR EACH ROW EXECUTE FUNCTION public.create_quest_completion_secret();

CREATE OR REPLACE FUNCTION public.get_quest_completion_code(_quest_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT completion_code INTO _code
  FROM public.quest_completion_secrets
  WHERE quest_id = _quest_id;

  RETURN _code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_quest_completion_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quest_completion_code(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.complete_quest(uuid);

CREATE FUNCTION public.complete_quest(_quest_id uuid, _completion_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _quest public.quests%ROWTYPE;
  _expected_code text;
  _inserted_id uuid;
  _source_key text;
  _xp_result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _quest
  FROM public.quests
  WHERE id = _quest_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'quest_unavailable');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.quest_stops WHERE quest_id = _quest.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'quest_not_ready');
  END IF;

  SELECT completion_code INTO _expected_code
  FROM public.quest_completion_secrets
  WHERE quest_id = _quest.id;

  IF _completion_code IS NULL OR _expected_code IS NULL
    OR _expected_code <> trim(_completion_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_completion_code');
  END IF;

  INSERT INTO public.quest_completions (user_id, quest_id, xp_earned)
  VALUES (_uid, _quest.id, COALESCE(_quest.total_xp, 0))
  ON CONFLICT (user_id, quest_id) DO NOTHING
  RETURNING id INTO _inserted_id;

  IF _inserted_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'xp_earned', 0,
      'total_xp', COALESCE((SELECT total_xp FROM public.profiles WHERE id = _uid), 0));
  END IF;

  IF COALESCE(_quest.total_xp, 0) <= 0 THEN
    RETURN jsonb_build_object('success', true, 'duplicate', false, 'xp_earned', 0,
      'total_xp', COALESCE((SELECT total_xp FROM public.profiles WHERE id = _uid), 0));
  END IF;

  _source_key := 'quest:' || _quest.id::text;
  _xp_result := public.apply_xp_transaction(
    _uid, _quest.total_xp, 'earn', 'Quest completed: ' || _quest.title, _source_key, 'quest', _quest.id,
    jsonb_build_object('quest_title', _quest.title)
  );

  RETURN _xp_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_quest(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_quest(uuid, text) TO authenticated;
