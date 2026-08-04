-- Reward redemption availability windows.
-- Rewards can be approved, but only redeemable during organizer/admin-defined dates,
-- weekdays, and local venue hours.

ALTER TABLE public.organizer_rewards
  ADD COLUMN IF NOT EXISTS available_from date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS available_until date,
  ADD COLUMN IF NOT EXISTS available_days integer[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7],
  ADD COLUMN IF NOT EXISTS available_start_time time NOT NULL DEFAULT TIME '09:00',
  ADD COLUMN IF NOT EXISTS available_end_time time NOT NULL DEFAULT TIME '18:00';

ALTER TABLE public.organizer_rewards
  DROP CONSTRAINT IF EXISTS organizer_rewards_available_days_valid,
  ADD CONSTRAINT organizer_rewards_available_days_valid
    CHECK (
      array_length(available_days, 1) BETWEEN 1 AND 7
      AND available_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]
    );

ALTER TABLE public.organizer_rewards
  DROP CONSTRAINT IF EXISTS organizer_rewards_available_dates_valid,
  ADD CONSTRAINT organizer_rewards_available_dates_valid
    CHECK (available_until IS NULL OR available_until >= available_from);

ALTER TABLE public.organizer_rewards
  DROP CONSTRAINT IF EXISTS organizer_rewards_available_hours_valid,
  ADD CONSTRAINT organizer_rewards_available_hours_valid
    CHECK (available_end_time > available_start_time);

CREATE INDEX IF NOT EXISTS idx_organizer_rewards_availability
  ON public.organizer_rewards (city_key, status, available_from, available_until);

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
  _local_now timestamp;
  _local_date date;
  _local_time time;
  _local_day integer;
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

  _local_now := timezone(
    CASE
      WHEN _reward.city_key = 'lublin' THEN 'Europe/Warsaw'
      ELSE 'Europe/Brussels'
    END,
    now()
  );
  _local_date := _local_now::date;
  _local_time := _local_now::time;
  _local_day := extract(isodow FROM _local_now)::integer;

  IF _local_date < _reward.available_from
    OR (_reward.available_until IS NOT NULL AND _local_date > _reward.available_until)
    OR NOT (_local_day = ANY(_reward.available_days))
    OR _local_time < _reward.available_start_time
    OR _local_time > _reward.available_end_time THEN
    RETURN jsonb_build_object('success', false, 'error', 'reward_not_available_now');
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
