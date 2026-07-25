-- Phase 4 auth hardening:
-- - Supabase Auth owns passwords, password hashing, JWTs, refresh sessions.
-- - App authorization is enforced with RLS policies and SECURITY DEFINER helpers.
-- - Frontend role checks are UX only; these policies are the actual gate.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    ),
    false
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_default_user_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_user_role();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_organizer_role_from_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'organizer'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role = 'organizer';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_organizer_role_from_application()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizer_applications_sync_role ON public.organizer_applications;
CREATE TRIGGER organizer_applications_sync_role
  AFTER INSERT OR UPDATE OF status ON public.organizer_applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_organizer_role_from_application();

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, 'organizer'::public.app_role
FROM public.organizer_applications
WHERE status = 'approved'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_approved_organizer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.has_role(_user_id, 'organizer')
    OR EXISTS (
      SELECT 1
      FROM public.organizer_applications
      WHERE user_id = _user_id
        AND status = 'approved'
    ),
    false
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_approved_organizer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_organizer(uuid) TO authenticated;

DROP POLICY IF EXISTS "Roles viewable by authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Users view own roles and admins view all"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins view organizer applications" ON public.organizer_applications;
DROP POLICY IF EXISTS "Admins review organizer applications" ON public.organizer_applications;

CREATE POLICY "Admins view organizer applications"
  ON public.organizer_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins review organizer applications"
  ON public.organizer_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users view own profiles and admins view all"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (id, username, avatar_url, city_id) ON public.profiles TO authenticated;
GRANT UPDATE (username, avatar_url, city_id) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Admins view all check-ins" ON public.check_ins;
CREATE POLICY "Admins view all check-ins"
  ON public.check_ins FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins view all redemptions" ON public.redemptions;
CREATE POLICY "Admins view all redemptions"
  ON public.redemptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Merchants can mark unused vouchers as used" ON public.redemptions;
DROP POLICY IF EXISTS "Organizers and admins can mark unused vouchers as used"
  ON public.redemptions;

CREATE POLICY "Organizers and admins can mark unused vouchers as used"
  ON public.redemptions FOR UPDATE TO authenticated
  USING (
    used_at IS NULL
    AND (
      public.has_role(auth.uid(), 'organizer')
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    used_at IS NOT NULL
    AND used_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'organizer')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.mark_redemption_used(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.redemptions%ROWTYPE;
  _reward public.rewards%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT (public.has_role(_uid, 'organizer') OR public.has_role(_uid, 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO _row FROM public.redemptions WHERE code = upper(_code);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF _row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used', 'used_at', _row.used_at);
  END IF;

  UPDATE public.redemptions SET used_at = now(), used_by = _uid WHERE id = _row.id;
  SELECT * INTO _reward FROM public.rewards WHERE id = _row.reward_id;

  RETURN jsonb_build_object(
    'success', true,
    'reward_title', _reward.title,
    'partner_name', _reward.partner_name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_redemption_used(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_redemption_used(text) TO authenticated;
