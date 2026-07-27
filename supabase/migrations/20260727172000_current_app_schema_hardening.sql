-- ============================================================
-- CURRENT APP SCHEMA HARDENING
-- ============================================================
-- Brings older Supabase projects up to the schema expected by the
-- current CultureQuest app without requiring every historical migration
-- to be replayed manually.

ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_time_label text,
  ADD COLUMN IF NOT EXISTS interested_count integer NOT NULL DEFAULT 0 CHECK (interested_count >= 0);

CREATE INDEX IF NOT EXISTS idx_organizer_events_city_status_ends
  ON public.organizer_events (city_key, status, ends_at);

CREATE INDEX IF NOT EXISTS idx_organizer_events_city_status_created
  ON public.organizer_events (city_key, status, created_at DESC);

DROP POLICY IF EXISTS "Admins delete organizer events"
  ON public.organizer_events;

CREATE POLICY "Admins delete organizer events"
  ON public.organizer_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

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

CREATE TABLE IF NOT EXISTS public.organizer_reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.organizer_rewards(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  xp_spent integer NOT NULL CHECK (xp_spent > 0 AND xp_spent <= 5000),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_id)
);

ALTER TABLE public.organizer_reward_redemptions ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.organizer_reward_redemptions FROM authenticated;
GRANT SELECT ON public.organizer_reward_redemptions TO authenticated;

DROP POLICY IF EXISTS "Users view own organizer reward redemptions and admins view all"
  ON public.organizer_reward_redemptions;

CREATE POLICY "Users view own organizer reward redemptions and admins view all"
  ON public.organizer_reward_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_organizer_reward_redemptions_user_created
  ON public.organizer_reward_redemptions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organizer_reward_redemptions_reward
  ON public.organizer_reward_redemptions (reward_id);

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
  _xp integer;
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

  _xp := GREATEST(0, COALESCE(_event.xp_bonus, 50));
  _source_key := 'event:' || _event.id::text;

  INSERT INTO public.xp_transactions (user_id, amount, reason, source_key)
  VALUES (_uid, _xp, 'Event attendance: ' || _event.title, _source_key)
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
  VALUES (_uid, _xp)
  ON CONFLICT (id) DO UPDATE
  SET total_xp = public.profiles.total_xp + EXCLUDED.total_xp
  RETURNING total_xp INTO _new_total;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'xp_earned', _xp,
    'total_xp', COALESCE(_new_total, _xp)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_organizer_event_attendance(uuid, text, double precision, double precision)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_organizer_event_attendance(uuid, text, double precision, double precision)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_organizer_reward(_reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _reward public.organizer_rewards%ROWTYPE;
  _existing public.organizer_reward_redemptions%ROWTYPE;
  _balance integer;
  _new_total integer;
  _code text;
  _redemption_id uuid;
  _redeemed_at timestamptz;
  _expires_at timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT *
  INTO _reward
  FROM public.organizer_rewards
  WHERE id = _reward_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'reward_unavailable');
  END IF;

  SELECT *
  INTO _existing
  FROM public.organizer_reward_redemptions
  WHERE user_id = _uid
    AND reward_id = _reward_id;

  IF FOUND THEN
    SELECT COALESCE(total_xp, 0)
    INTO _new_total
    FROM public.profiles
    WHERE id = _uid;

    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'redemption_id', _existing.id,
      'code', _existing.code,
      'redeemed_at', _existing.redeemed_at,
      'expires_at', _existing.expires_at,
      'used_at', _existing.used_at,
      'xp_spent', _existing.xp_spent,
      'total_xp', COALESCE(_new_total, 0)
    );
  END IF;

  SELECT COALESCE(total_xp, 0)
  INTO _balance
  FROM public.profiles
  WHERE id = _uid
  FOR UPDATE;

  IF COALESCE(_balance, 0) < _reward.xp_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_xp',
      'xp_needed', _reward.xp_cost - COALESCE(_balance, 0),
      'total_xp', COALESCE(_balance, 0)
    );
  END IF;

  _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  _redeemed_at := now();
  _expires_at := _redeemed_at + interval '5 minutes';

  INSERT INTO public.organizer_reward_redemptions (
    user_id,
    reward_id,
    code,
    xp_spent,
    redeemed_at,
    expires_at
  )
  VALUES (
    _uid,
    _reward_id,
    _code,
    _reward.xp_cost,
    _redeemed_at,
    _expires_at
  )
  RETURNING id INTO _redemption_id;

  UPDATE public.profiles
  SET total_xp = GREATEST(0, total_xp - _reward.xp_cost)
  WHERE id = _uid
  RETURNING total_xp INTO _new_total;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'redemption_id', _redemption_id,
    'code', _code,
    'redeemed_at', _redeemed_at,
    'expires_at', _expires_at,
    'used_at', NULL,
    'xp_spent', _reward.xp_cost,
    'total_xp', COALESCE(_new_total, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_organizer_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_organizer_reward(uuid) TO authenticated;
