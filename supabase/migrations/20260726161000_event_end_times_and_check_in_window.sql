-- ============================================================
-- EVENT END TIMES + TIME-LIMITED QR CHECK-IN
-- ============================================================
-- Events now store an explicit start/end window.
-- Approved events can be hidden by the app after ends_at.
-- QR attendance confirmation only works during the event window.

ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_time_label text;

CREATE INDEX IF NOT EXISTS idx_organizer_events_city_status_ends
  ON public.organizer_events (city_key, status, ends_at);

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
  _distance double precision;
  _inserted_id uuid;
  _new_total integer;
  _source_key text;
  _now timestamptz := now();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT *
  INTO _event
  FROM public.organizer_events
  WHERE id = _event_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_unavailable');
  END IF;

  IF _event.starts_at IS NOT NULL AND _now < _event.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_started');
  END IF;

  IF _event.ends_at IS NOT NULL AND _now > _event.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_finished');
  END IF;

  IF _event.check_in_code IS NULL OR _event.check_in_code <> _check_in_code THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_code');
  END IF;

  IF _event.venue_latitude IS NULL OR _event.venue_longitude IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_location');
  END IF;

  _distance := public.haversine_m(
    _user_lat,
    _user_lng,
    _event.venue_latitude,
    _event.venue_longitude
  );

  IF _distance > 500 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'too_far',
      'distance_m', round(_distance)
    );
  END IF;

  _source_key := 'event:' || _event.id::text;

  INSERT INTO public.xp_transactions (user_id, amount, reason, source_key)
  VALUES (_uid, 50, 'Event attendance: ' || _event.title, _source_key)
  ON CONFLICT (user_id, source_key) DO NOTHING
  RETURNING id INTO _inserted_id;

  INSERT INTO public.user_event_responses (user_id, event_id, status)
  VALUES (_uid, _event.id, 'attended')
  ON CONFLICT (user_id, event_id) DO UPDATE
  SET status = 'attended', updated_at = now();

  IF _inserted_id IS NULL THEN
    SELECT COALESCE(total_xp, 0)
    INTO _new_total
    FROM public.profiles
    WHERE id = _uid;

    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'xp_earned', 0,
      'total_xp', COALESCE(_new_total, 0)
    );
  END IF;

  INSERT INTO public.profiles (id, total_xp)
  VALUES (_uid, 50)
  ON CONFLICT (id) DO UPDATE
  SET total_xp = public.profiles.total_xp + EXCLUDED.total_xp
  RETURNING total_xp INTO _new_total;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'xp_earned', 50,
    'total_xp', COALESCE(_new_total, 50)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_organizer_event_attendance(uuid, text, double precision, double precision)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_organizer_event_attendance(uuid, text, double precision, double precision)
  TO authenticated;
