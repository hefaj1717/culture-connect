-- XP transaction audit hardening.
-- One source_key per user is the server-side idempotency key:
-- event:<event_id>, quest:<quest_id>, reward:<reward_id>, admin:<reason>:<id>.

ALTER TABLE public.xp_transactions
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'earn'
    CHECK (transaction_type IN ('earn', 'spend', 'adjustment')),
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS balance_after integer,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.xp_transactions
  DROP CONSTRAINT IF EXISTS xp_transactions_source_key_not_blank,
  ADD CONSTRAINT xp_transactions_source_key_not_blank
    CHECK (NULLIF(TRIM(source_key), '') IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_user_source_key
  ON public.xp_transactions (user_id, source_key);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_source
  ON public.xp_transactions (source_type, source_id);

UPDATE public.xp_transactions
SET
  transaction_type = COALESCE(NULLIF(transaction_type, ''), 'earn'),
  source_type = COALESCE(
    source_type,
    CASE
      WHEN source_key LIKE 'event:%' THEN 'event'
      WHEN source_key LIKE 'quest:%' THEN 'quest'
      WHEN source_key LIKE 'reward:%' THEN 'reward'
      ELSE 'manual'
    END
  ),
  metadata = COALESCE(metadata, '{}'::jsonb)
WHERE source_type IS NULL
   OR metadata IS NULL
   OR transaction_type IS NULL
   OR transaction_type = '';

UPDATE public.xp_transactions
SET source_id = replace(source_key, 'event:', '')::uuid
WHERE source_type = 'event'
  AND source_id IS NULL
  AND source_key ~ '^event:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.xp_transactions
SET source_id = replace(source_key, 'quest:', '')::uuid
WHERE source_type = 'quest'
  AND source_id IS NULL
  AND source_key ~ '^quest:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

INSERT INTO public.xp_transactions (
  user_id,
  amount,
  reason,
  source_key,
  transaction_type,
  source_type,
  source_id,
  balance_after,
  metadata,
  created_at
)
SELECT
  redemptions.user_id,
  redemptions.xp_spent,
  'Reward redeemed: ' || COALESCE(rewards.title, 'CultureQuest reward'),
  'reward:' || redemptions.reward_id::text,
  'spend',
  'reward',
  redemptions.reward_id,
  NULL,
  jsonb_build_object(
    'backfilled', true,
    'reward_title', rewards.title,
    'place_name', rewards.place_name
  ),
  redemptions.redeemed_at
FROM public.organizer_reward_redemptions AS redemptions
LEFT JOIN public.organizer_rewards AS rewards
  ON rewards.id = redemptions.reward_id
ON CONFLICT (user_id, source_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_xp_transaction(
  _user_id uuid,
  _amount integer,
  _transaction_type text,
  _reason text,
  _source_key text,
  _source_type text DEFAULT NULL,
  _source_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized_source_key text := NULLIF(TRIM(COALESCE(_source_key, '')), '');
  _normalized_type text := COALESCE(NULLIF(TRIM(_transaction_type), ''), 'earn');
  _existing public.xp_transactions%ROWTYPE;
  _inserted_id uuid;
  _new_total integer;
  _signed_delta integer;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_user');
  END IF;

  IF _amount IS NULL OR _amount <= 0 OR _amount > 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  IF _normalized_source_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_source_key');
  END IF;

  IF _normalized_type NOT IN ('earn', 'spend', 'adjustment') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_transaction_type');
  END IF;

  SELECT *
  INTO _existing
  FROM public.xp_transactions
  WHERE user_id = _user_id
    AND source_key = _normalized_source_key;

  IF FOUND THEN
    SELECT COALESCE(total_xp, 0)
    INTO _new_total
    FROM public.profiles
    WHERE id = _user_id;

    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'transaction_id', _existing.id,
      'transaction_type', _existing.transaction_type,
      'xp_earned', 0,
      'xp_spent', 0,
      'total_xp', COALESCE(_new_total, COALESCE(_existing.balance_after, 0))
    );
  END IF;

  INSERT INTO public.profiles (id, total_xp)
  VALUES (_user_id, 0)
  ON CONFLICT (id) DO NOTHING;

  SELECT COALESCE(total_xp, 0)
  INTO _new_total
  FROM public.profiles
  WHERE id = _user_id
  FOR UPDATE;

  SELECT *
  INTO _existing
  FROM public.xp_transactions
  WHERE user_id = _user_id
    AND source_key = _normalized_source_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'transaction_id', _existing.id,
      'transaction_type', _existing.transaction_type,
      'xp_earned', 0,
      'xp_spent', 0,
      'total_xp', COALESCE(_new_total, COALESCE(_existing.balance_after, 0))
    );
  END IF;

  _signed_delta := CASE
    WHEN _normalized_type = 'spend' THEN -_amount
    ELSE _amount
  END;

  IF _normalized_type = 'spend' AND COALESCE(_new_total, 0) < _amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_xp',
      'xp_needed', _amount - COALESCE(_new_total, 0),
      'total_xp', COALESCE(_new_total, 0)
    );
  END IF;

  _new_total := GREATEST(0, COALESCE(_new_total, 0) + _signed_delta);

  UPDATE public.profiles
  SET total_xp = _new_total
  WHERE id = _user_id;

  INSERT INTO public.xp_transactions (
    user_id,
    amount,
    reason,
    source_key,
    transaction_type,
    source_type,
    source_id,
    balance_after,
    metadata
  )
  VALUES (
    _user_id,
    _amount,
    COALESCE(NULLIF(TRIM(_reason), ''), 'CultureQuest activity'),
    _normalized_source_key,
    _normalized_type,
    NULLIF(TRIM(COALESCE(_source_type, '')), ''),
    _source_id,
    _new_total,
    COALESCE(_metadata, '{}'::jsonb)
  )
  ON CONFLICT (user_id, source_key) DO NOTHING
  RETURNING id, balance_after INTO _inserted_id, _new_total;

  IF _inserted_id IS NULL THEN
    SELECT COALESCE(total_xp, 0)
    INTO _new_total
    FROM public.profiles
    WHERE id = _user_id;

    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'transaction_type', _normalized_type,
      'xp_earned', 0,
      'xp_spent', 0,
      'total_xp', COALESCE(_new_total, 0)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'transaction_type', _normalized_type,
    'xp_earned', CASE WHEN _normalized_type = 'earn' THEN _amount ELSE 0 END,
    'xp_spent', CASE WHEN _normalized_type = 'spend' THEN _amount ELSE 0 END,
    'total_xp', COALESCE(_new_total, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_xp_transaction(uuid, integer, text, text, text, text, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.award_user_xp(
  _amount integer,
  _reason text,
  _source_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.has_role(_uid, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'admin_required');
  END IF;

  RETURN public.apply_xp_transaction(
    _uid,
    _amount,
    'earn',
    _reason,
    _source_key,
    'manual',
    NULL,
    jsonb_build_object('awarded_by', _uid)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_user_xp(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_user_xp(integer, text, text) TO authenticated;

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
  _source_key text;
  _now timestamptz := now();
  _xp integer;
  _xp_result jsonb;
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

  INSERT INTO public.user_event_responses (user_id, event_id, status)
  VALUES (_uid, _event.id, 'attended')
  ON CONFLICT (user_id, event_id) DO UPDATE
  SET status = 'attended', updated_at = now();

  IF _xp <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', false,
      'xp_earned', 0,
      'total_xp', COALESCE((SELECT total_xp FROM public.profiles WHERE id = _uid), 0)
    );
  END IF;

  _xp_result := public.apply_xp_transaction(
    _uid,
    _xp,
    'earn',
    'Event attendance: ' || _event.title,
    _source_key,
    'event',
    _event.id,
    jsonb_build_object(
      'event_title', _event.title,
      'venue_name', _event.venue_name,
      'distance_m', round(_distance)
    )
  );

  RETURN _xp_result;
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
  _source_key text;
  _xp_result jsonb;
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

  INSERT INTO public.quest_completions (user_id, quest_id, xp_earned)
  VALUES (_uid, _quest.id, COALESCE(_quest.total_xp, 0))
  ON CONFLICT (user_id, quest_id) DO NOTHING
  RETURNING id INTO _inserted_id;

  IF _inserted_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'xp_earned', 0,
      'total_xp', COALESCE((SELECT total_xp FROM public.profiles WHERE id = _uid), 0)
    );
  END IF;

  IF COALESCE(_quest.total_xp, 0) <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', false,
      'xp_earned', 0,
      'total_xp', COALESCE((SELECT total_xp FROM public.profiles WHERE id = _uid), 0)
    );
  END IF;

  _source_key := 'quest:' || _quest.id::text;
  _xp_result := public.apply_xp_transaction(
    _uid,
    _quest.total_xp,
    'earn',
    'Quest completed: ' || _quest.title,
    _source_key,
    'quest',
    _quest.id,
    jsonb_build_object('quest_title', _quest.title)
  );

  RETURN _xp_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_quest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_quest(uuid) TO authenticated;

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
  _new_total integer;
  _code text;
  _redemption_id uuid;
  _redeemed_at timestamptz;
  _expires_at timestamptz;
  _xp_result jsonb;
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

  PERFORM pg_advisory_xact_lock(hashtext(_uid::text || ':' || _reward_id::text));

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

  _xp_result := public.apply_xp_transaction(
    _uid,
    _reward.xp_cost,
    'spend',
    'Reward redeemed: ' || _reward.title,
    'reward:' || _reward.id::text,
    'reward',
    _reward.id,
    jsonb_build_object(
      'reward_title', _reward.title,
      'place_name', _reward.place_name
    )
  );

  IF COALESCE((_xp_result ->> 'success')::boolean, false) IS NOT TRUE THEN
    RETURN _xp_result;
  END IF;

  IF COALESCE((_xp_result ->> 'duplicate')::boolean, false) IS TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'redemption_inconsistent',
      'total_xp', COALESCE((_xp_result ->> 'total_xp')::integer, 0)
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

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'redemption_id', _redemption_id,
    'code', _code,
    'redeemed_at', _redeemed_at,
    'expires_at', _expires_at,
    'used_at', NULL,
    'xp_spent', _reward.xp_cost,
    'total_xp', COALESCE((_xp_result ->> 'total_xp')::integer, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_organizer_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_organizer_reward(uuid) TO authenticated;
