-- Quest Credits (QC) are spendable. XP remains a permanent progress metric.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_qc integer NOT NULL DEFAULT 0
    CHECK (total_qc >= 0);

ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS qc_bonus integer NOT NULL DEFAULT 5
    CHECK (qc_bonus BETWEEN 0 AND 500);

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS total_qc integer NOT NULL DEFAULT 5
    CHECK (total_qc BETWEEN 0 AND 1000);

ALTER TABLE public.organizer_rewards
  ADD COLUMN IF NOT EXISTS qc_cost integer NOT NULL DEFAULT 5
    CHECK (qc_cost > 0 AND qc_cost <= 5000);

ALTER TABLE public.organizer_reward_redemptions
  ADD COLUMN IF NOT EXISTS qc_spent integer NOT NULL DEFAULT 0
    CHECK (qc_spent >= 0 AND qc_spent <= 5000);

-- XP is now a permanent unlock threshold, not a balance that is deducted.
ALTER TABLE public.organizer_reward_redemptions
  DROP CONSTRAINT IF EXISTS organizer_reward_redemptions_xp_spent_check;
ALTER TABLE public.organizer_reward_redemptions
  ADD CONSTRAINT organizer_reward_redemptions_xp_spent_check
    CHECK (xp_spent >= 0 AND xp_spent <= 5000);

CREATE TABLE IF NOT EXISTS public.qc_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  reason text NOT NULL,
  source_key text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('event', 'quest', 'reward', 'adjustment')),
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_key)
);

ALTER TABLE public.qc_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.qc_transactions FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.qc_transactions TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.qc_transactions FROM authenticated;

CREATE POLICY "Users view own QC transactions and admins view all"
  ON public.qc_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_qc_transactions_user_created
  ON public.qc_transactions (user_id, created_at DESC);

-- This is trigger-only: clients never receive EXECUTE on it.
CREATE OR REPLACE FUNCTION public.award_qc_for_xp_earn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _qc integer := 0;
  _new_total integer;
BEGIN
  IF NEW.transaction_type <> 'earn' OR NEW.source_type NOT IN ('event', 'quest') THEN
    RETURN NEW;
  END IF;

  IF NEW.source_type = 'event' THEN
    SELECT COALESCE(qc_bonus, 5) INTO _qc FROM public.organizer_events WHERE id = NEW.source_id;
  ELSE
    SELECT COALESCE(total_qc, 5) INTO _qc FROM public.quests WHERE id = NEW.source_id;
  END IF;

  _qc := GREATEST(0, COALESCE(_qc, 0));
  IF _qc = 0 THEN RETURN NEW; END IF;

  INSERT INTO public.qc_transactions (user_id, amount, balance_after, reason, source_key, source_type, source_id)
  SELECT NEW.user_id, _qc, p.total_qc + _qc,
    CASE WHEN NEW.source_type = 'event' THEN 'Event attendance' ELSE 'Quest completed' END,
    NEW.source_key, NEW.source_type, NEW.source_id
  FROM public.profiles p WHERE p.id = NEW.user_id
  ON CONFLICT (user_id, source_key) DO NOTHING
  RETURNING balance_after INTO _new_total;

  IF _new_total IS NOT NULL THEN
    UPDATE public.profiles SET total_qc = _new_total WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_qc_for_xp_earn ON public.xp_transactions;
CREATE TRIGGER award_qc_for_xp_earn
AFTER INSERT ON public.xp_transactions
FOR EACH ROW EXECUTE FUNCTION public.award_qc_for_xp_earn();

REVOKE EXECUTE ON FUNCTION public.award_qc_for_xp_earn() FROM PUBLIC, anon, authenticated;

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
  _xp integer;
  _qc integer;
  _code text;
  _redemption_id uuid;
  _redeemed_at timestamptz := now();
  _expires_at timestamptz := now() + interval '5 minutes';
  _new_qc integer;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO _reward FROM public.organizer_rewards WHERE id = _reward_id AND status = 'approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'reward_unavailable'); END IF;

  IF _reward.available_from IS NOT NULL AND _reward.available_from > CURRENT_DATE
    OR _reward.available_until IS NOT NULL AND _reward.available_until < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'reward_not_available_now');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_uid::text || ':' || _reward_id::text));
  SELECT * INTO _existing FROM public.organizer_reward_redemptions WHERE user_id = _uid AND reward_id = _reward_id;
  IF FOUND THEN
    SELECT total_xp, total_qc INTO _xp, _qc FROM public.profiles WHERE id = _uid;
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'redemption_id', _existing.id,
      'code', _existing.code, 'redeemed_at', _existing.redeemed_at, 'expires_at', _existing.expires_at,
      'used_at', _existing.used_at, 'qc_spent', _existing.qc_spent, 'total_xp', COALESCE(_xp, 0), 'total_qc', COALESCE(_qc, 0));
  END IF;

  SELECT total_xp, total_qc INTO _xp, _qc FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF COALESCE(_xp, 0) < _reward.xp_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_xp', 'xp_needed', _reward.xp_cost - COALESCE(_xp, 0), 'total_xp', COALESCE(_xp, 0), 'total_qc', COALESCE(_qc, 0));
  END IF;
  IF COALESCE(_qc, 0) < _reward.qc_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_qc', 'qc_needed', _reward.qc_cost - COALESCE(_qc, 0), 'total_xp', COALESCE(_xp, 0), 'total_qc', COALESCE(_qc, 0));
  END IF;

  _new_qc := _qc - _reward.qc_cost;
  UPDATE public.profiles SET total_qc = _new_qc WHERE id = _uid;
  INSERT INTO public.qc_transactions (user_id, amount, balance_after, reason, source_key, source_type, source_id)
  VALUES (_uid, -_reward.qc_cost, _new_qc, 'Reward redeemed: ' || _reward.title, 'reward:' || _reward.id::text, 'reward', _reward.id);

  _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.organizer_reward_redemptions (user_id, reward_id, code, xp_spent, qc_spent, redeemed_at, expires_at)
  VALUES (_uid, _reward_id, _code, 0, _reward.qc_cost, _redeemed_at, _expires_at)
  RETURNING id INTO _redemption_id;

  RETURN jsonb_build_object('success', true, 'duplicate', false, 'redemption_id', _redemption_id,
    'code', _code, 'redeemed_at', _redeemed_at, 'expires_at', _expires_at, 'used_at', NULL,
    'xp_spent', 0, 'qc_spent', _reward.qc_cost, 'total_xp', COALESCE(_xp, 0), 'total_qc', _new_qc);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_organizer_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_organizer_reward(uuid) TO authenticated;
