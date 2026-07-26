-- ============================================================
-- ORGANIZER REWARD REDEMPTIONS
-- ============================================================

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
