-- ============================================================
-- PERSISTENT XP TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0 AND amount <= 5000),
  reason text NOT NULL,
  source_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_key)
);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own xp transactions and admins view all"
  ON public.xp_transactions;

CREATE POLICY "Users view own xp transactions and admins view all"
  ON public.xp_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_created
  ON public.xp_transactions (user_id, created_at DESC);

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
  _inserted_id uuid;
  _new_total integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _amount IS NULL OR _amount <= 0 OR _amount > 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  IF NULLIF(TRIM(COALESCE(_source_key, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_source_key');
  END IF;

  INSERT INTO public.xp_transactions (user_id, amount, reason, source_key)
  VALUES (_uid, _amount, COALESCE(NULLIF(TRIM(_reason), ''), 'CultureQuest activity'), TRIM(_source_key))
  ON CONFLICT (user_id, source_key) DO NOTHING
  RETURNING id INTO _inserted_id;

  IF _inserted_id IS NULL THEN
    SELECT total_xp INTO _new_total
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
  VALUES (_uid, _amount)
  ON CONFLICT (id) DO UPDATE
  SET total_xp = public.profiles.total_xp + EXCLUDED.total_xp
  RETURNING total_xp INTO _new_total;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'xp_earned', _amount,
    'total_xp', COALESCE(_new_total, _amount)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_user_xp(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_user_xp(integer, text, text) TO authenticated;
