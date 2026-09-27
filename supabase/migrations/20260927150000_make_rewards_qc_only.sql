-- QC is the only spendable currency for organizer rewards. XP remains permanent progress.

UPDATE public.organizer_rewards
SET xp_cost = 0
WHERE xp_cost <> 0;

ALTER TABLE public.organizer_rewards
  DROP CONSTRAINT IF EXISTS organizer_rewards_xp_cost_check;

ALTER TABLE public.organizer_rewards
  ADD CONSTRAINT organizer_rewards_xp_cost_check
  CHECK (xp_cost >= 0 AND xp_cost <= 5000);

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
  _qc integer;
  _code text;
  _redemption_id uuid;
  _redeemed_at timestamptz := now();
  _expires_at timestamptz := now() + interval '5 minutes';
  _new_qc integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _reward
  FROM public.organizer_rewards
  WHERE id = _reward_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'reward_unavailable');
  END IF;

  IF (_reward.available_from IS NOT NULL AND _reward.available_from > CURRENT_DATE)
    OR (_reward.available_until IS NOT NULL AND _reward.available_until < CURRENT_DATE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'reward_not_available_now');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_uid::text || ':' || _reward_id::text));

  SELECT * INTO _existing
  FROM public.organizer_reward_redemptions
  WHERE user_id = _uid AND reward_id = _reward_id;

  IF FOUND THEN
    SELECT total_qc INTO _qc FROM public.profiles WHERE id = _uid;
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'redemption_id', _existing.id,
      'code', _existing.code,
      'redeemed_at', _existing.redeemed_at,
      'expires_at', _existing.expires_at,
      'used_at', _existing.used_at,
      'xp_spent', 0,
      'qc_spent', _existing.qc_spent,
      'total_qc', COALESCE(_qc, 0)
    );
  END IF;

  SELECT total_qc INTO _qc
  FROM public.profiles
  WHERE id = _uid
  FOR UPDATE;

  IF COALESCE(_qc, 0) < _reward.qc_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_qc',
      'qc_needed', _reward.qc_cost - COALESCE(_qc, 0),
      'total_qc', COALESCE(_qc, 0)
    );
  END IF;

  _new_qc := _qc - _reward.qc_cost;
  UPDATE public.profiles SET total_qc = _new_qc WHERE id = _uid;

  INSERT INTO public.qc_transactions (user_id, amount, balance_after, reason, source_key, source_type, source_id)
  VALUES (
    _uid,
    -_reward.qc_cost,
    _new_qc,
    'Reward redeemed: ' || _reward.title,
    'reward:' || _reward.id::text,
    'reward',
    _reward.id
  );

  _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.organizer_reward_redemptions (
    user_id, reward_id, code, xp_spent, qc_spent, redeemed_at, expires_at
  )
  VALUES (_uid, _reward_id, _code, 0, _reward.qc_cost, _redeemed_at, _expires_at)
  RETURNING id INTO _redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'redemption_id', _redemption_id,
    'code', _code,
    'redeemed_at', _redeemed_at,
    'expires_at', _expires_at,
    'used_at', NULL,
    'xp_spent', 0,
    'qc_spent', _reward.qc_cost,
    'total_qc', _new_qc
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_organizer_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_organizer_reward(uuid) TO authenticated;
