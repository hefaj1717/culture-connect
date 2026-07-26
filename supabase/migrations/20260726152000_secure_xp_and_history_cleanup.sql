-- ============================================================
-- SECURE XP FLOWS + ORGANIZER HISTORY SUPPORT
-- ============================================================
-- Completes the production-facing flows used by the app:
-- - Event attendance XP is awarded by a server RPC that validates event, QR code, and distance.
-- - Quest completion XP is persisted and awarded once per user.

CREATE TABLE IF NOT EXISTS public.quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  xp_earned integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id)
);

ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own quest completions and admins view all"
  ON public.quest_completions;

CREATE POLICY "Users view own quest completions and admins view all"
  ON public.quest_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_quest_completions_user_completed
  ON public.quest_completions (user_id, completed_at DESC);

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

CREATE OR REPLACE FUNCTION public.complete_quest(_quest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _quest public.quests%ROWTYPE;
  _inserted_id uuid;
  _xp_transaction_id uuid;
  _new_total integer;
  _source_key text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT *
  INTO _quest
  FROM public.quests
  WHERE id = _quest_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'quest_unavailable');
  END IF;

  _source_key := 'quest:' || _quest.id::text;

  INSERT INTO public.quest_completions (user_id, quest_id, xp_earned)
  VALUES (_uid, _quest.id, COALESCE(_quest.total_xp, 0))
  ON CONFLICT (user_id, quest_id) DO NOTHING
  RETURNING id INTO _inserted_id;

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

  IF COALESCE(_quest.total_xp, 0) <= 0 THEN
    SELECT COALESCE(total_xp, 0)
    INTO _new_total
    FROM public.profiles
    WHERE id = _uid;

    RETURN jsonb_build_object(
      'success', true,
      'duplicate', false,
      'xp_earned', 0,
      'total_xp', COALESCE(_new_total, 0)
    );
  END IF;

  INSERT INTO public.xp_transactions (user_id, amount, reason, source_key)
  VALUES (_uid, _quest.total_xp, 'Quest completed: ' || _quest.title, _source_key)
  ON CONFLICT (user_id, source_key) DO NOTHING
  RETURNING id INTO _xp_transaction_id;

  IF _xp_transaction_id IS NULL THEN
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
  VALUES (_uid, _quest.total_xp)
  ON CONFLICT (id) DO UPDATE
  SET total_xp = public.profiles.total_xp + EXCLUDED.total_xp
  RETURNING total_xp INTO _new_total;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'xp_earned', _quest.total_xp,
    'total_xp', COALESCE(_new_total, _quest.total_xp)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_quest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_quest(uuid) TO authenticated;
