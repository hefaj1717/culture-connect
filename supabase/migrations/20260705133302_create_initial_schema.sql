-- ============================================================
-- HELPER FUNCTIONS (używane przez triggery poniżej)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- CITIES
-- ============================================================

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities are viewable by authenticated users"
  ON public.cities FOR SELECT TO authenticated USING (true);

  -- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  total_xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- ============================================================
-- VENUES (miejsca — np. muzeum, klub studencki)
-- ============================================================

CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are viewable by authenticated users"
  ON public.venues FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_venues_city ON public.venues (city_id);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Other',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  xp_reward integer NOT NULL DEFAULT 50,
  is_flash_quest boolean NOT NULL DEFAULT false,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by authenticated users"
  ON public.events FOR SELECT TO authenticated USING (true);

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_events_time ON public.events (start_time, end_time);
CREATE INDEX idx_events_city ON public.events (city_id);

-- ============================================================
-- CHECK-INS
-- ============================================================

CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  xp_earned integer NOT NULL DEFAULT 0,
  user_lat double precision,
  user_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own check-ins"
  ON public.check_ins FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_checkins_user ON public.check_ins (user_id);

-- ============================================================
-- REWARDS (przypisane do miasta — lokalny partner/kawiarnia)
-- ============================================================

CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  partner_name text,
  xp_cost integer NOT NULL,
  stock integer,
  is_active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rewards viewable by authenticated users"
  ON public.rewards FOR SELECT TO authenticated USING (true);

CREATE TRIGGER rewards_set_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_rewards_city ON public.rewards (city_id);

-- ============================================================
-- REDEMPTIONS (per-user, niezależnie od miasta)
-- ============================================================

CREATE TABLE public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  xp_spent integer NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own redemptions"
  ON public.redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Merchants can mark unused vouchers as used"
  ON public.redemptions FOR UPDATE TO authenticated
  USING (used_at IS NULL)
  WITH CHECK (used_at IS NOT NULL AND used_by = auth.uid());

CREATE INDEX idx_redemptions_user ON public.redemptions (user_id);
CREATE INDEX idx_redemptions_code ON public.redemptions (code);

-- ============================================================
-- ROLES (admin / user)
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Roles viewable by authenticated"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert venues" ON public.venues FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update venues" ON public.venues FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete venues" ON public.venues FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update events" ON public.events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete events" ON public.events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert rewards" ON public.rewards FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update rewards" ON public.rewards FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete rewards" ON public.rewards FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert cities" ON public.cities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update cities" ON public.cities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

  -- ============================================================
-- HELPER: dystans w metrach (haversine)
-- ============================================================

CREATE OR REPLACE FUNCTION public.haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  r double precision := 6371000;
  dlat double precision := radians(lat2 - lat1);
  dlng double precision := radians(lng2 - lng1);
  a double precision;
BEGIN
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  RETURN 2 * r * asin(sqrt(a));
END;
$$;

-- ============================================================
-- FUNCTION: check_in_at_event
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_in_at_event(
  _event_id uuid,
  _user_lat double precision,
  _user_lng double precision
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _event public.events%ROWTYPE;
  _venue public.venues%ROWTYPE;
  _distance double precision;
  _xp integer;
  _now timestamptz := now();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _event FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  IF _now < _event.start_time OR _now > _event.end_time THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_live');
  END IF;

  SELECT * INTO _venue FROM public.venues WHERE id = _event.venue_id;

  _distance := public.haversine_m(_user_lat, _user_lng, _venue.latitude, _venue.longitude);
  IF _distance > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_far', 'distance_m', round(_distance));
  END IF;

  IF EXISTS (SELECT 1 FROM public.check_ins WHERE user_id = _uid AND event_id = _event_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_checked_in');
  END IF;

  _xp := _event.xp_reward * (CASE WHEN _event.is_flash_quest THEN 2 ELSE 1 END);

  INSERT INTO public.check_ins (user_id, event_id, xp_earned, user_lat, user_lng)
  VALUES (_uid, _event_id, _xp, _user_lat, _user_lng);

  UPDATE public.profiles SET total_xp = total_xp + _xp WHERE id = _uid;

  RETURN jsonb_build_object('success', true, 'xp_earned', _xp, 'flash_quest', _event.is_flash_quest);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_in_at_event(uuid, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_at_event(uuid, double precision, double precision) TO authenticated;

-- ============================================================
-- FUNCTION: redeem_reward
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _reward public.rewards%ROWTYPE;
  _balance integer;
  _code text;
  _redemption_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _reward FROM public.rewards WHERE id = _reward_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'reward_unavailable');
  END IF;

  IF _reward.stock IS NOT NULL AND _reward.stock <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'out_of_stock');
  END IF;

  SELECT total_xp INTO _balance FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _balance < _reward.xp_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_xp');
  END IF;

  _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.redemptions (user_id, reward_id, code, xp_spent)
  VALUES (_uid, _reward_id, _code, _reward.xp_cost)
  RETURNING id INTO _redemption_id;

  UPDATE public.profiles SET total_xp = total_xp - _reward.xp_cost WHERE id = _uid;

  IF _reward.stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = stock - 1 WHERE id = _reward_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'code', _code, 'redemption_id', _redemption_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid) TO authenticated;

-- ============================================================
-- FUNCTION: mark_redemption_used (merchant scan)
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_redemption_used(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.redemptions%ROWTYPE;
  _reward public.rewards%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
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

-- ============================================================
-- FUNCTION: leaderboard_by_city
-- ============================================================

CREATE OR REPLACE FUNCTION public.leaderboard_by_city()
RETURNS TABLE (city_name text, total_xp bigint, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(c.name, 'Unknown') AS city_name,
    SUM(p.total_xp)::bigint AS total_xp,
    COUNT(*)::bigint AS member_count
  FROM public.profiles p
  LEFT JOIN public.cities c ON c.id = p.city_id
  GROUP BY COALESCE(c.name, 'Unknown')
  ORDER BY total_xp DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.leaderboard_by_city() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leaderboard_by_city() TO authenticated;