-- Event QR codes are capability tokens: issue a fresh one to the event owner and
-- reject screenshots/prints once the short validity window has elapsed.

ALTER TABLE public.organizer_event_checkin_secrets
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.organizer_event_checkin_secrets
SET expires_at = now() + interval '15 minutes'
WHERE expires_at IS NULL;

ALTER TABLE public.organizer_event_checkin_secrets
ALTER COLUMN expires_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.create_organizer_event_checkin_secret()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organizer_event_checkin_secrets (event_id, check_in_code, expires_at)
  VALUES (
    NEW.id,
    'culturequest:event:' || gen_random_uuid()::text,
    now() + interval '15 minutes'
  )
  ON CONFLICT (event_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_organizer_event_checkin_code(_event_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text := 'culturequest:event:' || gen_random_uuid()::text;
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

  UPDATE public.organizer_event_checkin_secrets
  SET check_in_code = _code,
      expires_at = now() + interval '15 minutes'
  WHERE event_id = _event_id;

  IF NOT FOUND THEN
    INSERT INTO public.organizer_event_checkin_secrets (event_id, check_in_code, expires_at)
    VALUES (_event_id, _code, now() + interval '15 minutes');
  END IF;

  RETURN _code;
END;
$$;

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
  _secret public.organizer_event_checkin_secrets%ROWTYPE;
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

  SELECT * INTO _secret
  FROM public.organizer_event_checkin_secrets
  WHERE event_id = _event.id;

  IF NOT FOUND OR _secret.check_in_code <> trim(_check_in_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_code');
  END IF;

  IF _secret.expires_at <= _now THEN
    RETURN jsonb_build_object('success', false, 'error', 'qr_expired');
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
