-- Student university affiliation and city leaderboard.
-- MVP rule: pending and verified student affiliations both contribute to the
-- leaderboard. When student email verification is enabled, tighten the RPC by
-- requiring verified_at IS NOT NULL.

CREATE TABLE IF NOT EXISTS public.universities (
  id text PRIMARY KEY,
  city_key text NOT NULL CHECK (city_key IN ('leuven', 'lublin')),
  name text NOT NULL,
  short_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Universities are viewable by authenticated users"
  ON public.universities;
CREATE POLICY "Universities are viewable by authenticated users"
  ON public.universities FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.universities TO authenticated;

CREATE TABLE IF NOT EXISTS public.university_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id text NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.university_email_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "University email domains are viewable by authenticated users"
  ON public.university_email_domains;
CREATE POLICY "University email domains are viewable by authenticated users"
  ON public.university_email_domains FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.university_email_domains TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_university_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id text NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_university_memberships ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS user_university_memberships_set_updated_at
  ON public.user_university_memberships;
CREATE TRIGGER user_university_memberships_set_updated_at
  BEFORE UPDATE ON public.user_university_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Users view own university membership and admins view all"
  ON public.user_university_memberships;
CREATE POLICY "Users view own university membership and admins view all"
  ON public.user_university_memberships FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own pending university membership"
  ON public.user_university_memberships;
CREATE POLICY "Users insert own pending university membership"
  ON public.user_university_memberships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND verified_at IS NULL);

DROP POLICY IF EXISTS "Users update own pending university membership"
  ON public.user_university_memberships;
CREATE POLICY "Users update own pending university membership"
  ON public.user_university_memberships FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND verified_at IS NULL);

DROP POLICY IF EXISTS "Admins manage university memberships"
  ON public.user_university_memberships;
CREATE POLICY "Admins manage university memberships"
  ON public.user_university_memberships FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE ON public.user_university_memberships TO authenticated;

INSERT INTO public.universities (id, city_key, name, short_name)
VALUES
  ('kul', 'lublin', 'The John Paul II Catholic University of Lublin', 'KUL'),
  ('umcs', 'lublin', 'Maria Curie-Sklodowska University', 'UMCS'),
  ('pollub', 'lublin', 'Lublin University of Technology', 'Politechnika Lubelska'),
  ('umlub', 'lublin', 'Medical University of Lublin', 'UMLub'),
  ('up-lublin', 'lublin', 'University of Life Sciences in Lublin', 'UP Lublin'),
  ('wsei-lublin', 'lublin', 'University of Economics and Innovation in Lublin', 'WSEI'),
  ('vpu-lublin', 'lublin', 'Vincent Pol University in Lublin', 'VPU'),
  ('wspa-lublin', 'lublin', 'University College of Enterprise and Administration in Lublin', 'WSPA'),
  ('ku-leuven', 'leuven', 'KU Leuven', 'KU Leuven'),
  ('ucll', 'leuven', 'UCLL University of Applied Sciences', 'UCLL'),
  ('luca-leuven', 'leuven', 'LUCA School of Arts', 'LUCA'),
  ('etf-leuven', 'leuven', 'Evangelical Theological Faculty Leuven', 'ETF Leuven'),
  ('vlerick-leuven', 'leuven', 'Vlerick Business School - Leuven campus', 'Vlerick')
ON CONFLICT (id) DO UPDATE
SET
  city_key = EXCLUDED.city_key,
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name;

INSERT INTO public.university_email_domains (university_id, domain)
VALUES
  ('kul', 'kul.pl'),
  ('kul', 'student.kul.pl'),
  ('umcs', 'umcs.pl'),
  ('umcs', 'student.umcs.pl'),
  ('pollub', 'pollub.pl'),
  ('pollub', 'student.pollub.pl'),
  ('umlub', 'umlub.pl'),
  ('umlub', 'student.umlub.pl'),
  ('up-lublin', 'up.lublin.pl'),
  ('up-lublin', 'student.up.lublin.pl'),
  ('wsei-lublin', 'wsei.lublin.pl'),
  ('wsei-lublin', 'student.wsei.lublin.pl'),
  ('vpu-lublin', 'vpu.edu.pl'),
  ('vpu-lublin', 'student.vpu.edu.pl'),
  ('wspa-lublin', 'wspa.pl'),
  ('wspa-lublin', 'student.wspa.pl'),
  ('ku-leuven', 'kuleuven.be'),
  ('ku-leuven', 'student.kuleuven.be'),
  ('ucll', 'ucll.be'),
  ('ucll', 'student.ucll.be'),
  ('luca-leuven', 'luca-arts.be'),
  ('luca-leuven', 'student.luca-arts.be'),
  ('etf-leuven', 'etf.edu'),
  ('etf-leuven', 'student.etf.edu'),
  ('vlerick-leuven', 'vlerick.com'),
  ('vlerick-leuven', 'student.vlerick.com')
ON CONFLICT (domain) DO UPDATE
SET university_id = EXCLUDED.university_id;

CREATE OR REPLACE FUNCTION public.sync_university_membership_from_metadata(
  _user_id uuid,
  _metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _student jsonb := COALESCE(_metadata -> 'student_university', '{}'::jsonb);
  _is_student boolean := COALESCE((_student ->> 'is_student')::boolean, false);
  _university_id text := NULLIF(_student ->> 'university_id', '');
  _student_email text := lower(NULLIF(_student ->> 'student_email', ''));
BEGIN
  IF NOT _is_student OR _university_id IS NULL OR _student_email IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.universities WHERE id = _university_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_university_memberships (
    user_id,
    university_id,
    student_email,
    status,
    verified_at
  )
  VALUES (
    _user_id,
    _university_id,
    _student_email,
    'pending',
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    university_id = EXCLUDED.university_id,
    student_email = EXCLUDED.student_email,
    status = CASE
      WHEN public.user_university_memberships.verified_at IS NOT NULL
        AND public.user_university_memberships.university_id = EXCLUDED.university_id
      THEN public.user_university_memberships.status
      ELSE 'pending'
    END,
    verified_at = CASE
      WHEN public.user_university_memberships.university_id = EXCLUDED.university_id
      THEN public.user_university_memberships.verified_at
      ELSE NULL
    END,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_university_membership_from_metadata(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_city_key text;
  profile_first_name text;
  profile_last_name text;
  profile_full_name text;
BEGIN
  profile_city_key := CASE
    WHEN NEW.raw_user_meta_data ->> 'city_id' IN ('leuven', 'lublin')
    THEN NEW.raw_user_meta_data ->> 'city_id'
    ELSE 'leuven'
  END;
  profile_first_name := NULLIF(NEW.raw_user_meta_data ->> 'first_name', '');
  profile_last_name := NULLIF(NEW.raw_user_meta_data ->> 'last_name', '');
  profile_full_name := NULLIF(NEW.raw_user_meta_data ->> 'full_name', '');

  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    first_name,
    last_name,
    city_key
  )
  VALUES (
    NEW.id,
    COALESCE(profile_full_name, split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    profile_first_name,
    profile_last_name,
    profile_city_key
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    city_key = EXCLUDED.city_key;

  PERFORM public.sync_university_membership_from_metadata(NEW.id, NEW.raw_user_meta_data);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_my_university_membership(
  _university_id text,
  _student_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(trim(_student_email));
  _university public.universities%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _university
  FROM public.universities
  WHERE id = _university_id;

  IF _university.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_university');
  END IF;

  IF _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_student_email');
  END IF;

  INSERT INTO public.user_university_memberships (
    user_id,
    university_id,
    student_email,
    status,
    verified_at
  )
  VALUES (_uid, _university_id, _email, 'pending', NULL)
  ON CONFLICT (user_id) DO UPDATE
  SET
    university_id = EXCLUDED.university_id,
    student_email = EXCLUDED.student_email,
    status = CASE
      WHEN public.user_university_memberships.verified_at IS NOT NULL
        AND public.user_university_memberships.university_id = EXCLUDED.university_id
      THEN public.user_university_memberships.status
      ELSE 'pending'
    END,
    verified_at = CASE
      WHEN public.user_university_memberships.university_id = EXCLUDED.university_id
      THEN public.user_university_memberships.verified_at
      ELSE NULL
    END,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_my_university_membership(text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_my_university_membership(text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.university_leaderboard_by_city(_city_key text)
RETURNS TABLE (
  university_id text,
  name text,
  short_name text,
  city_key text,
  total_xp bigint,
  member_count bigint,
  rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scores AS (
    SELECT
      u.id AS university_id,
      u.name,
      u.short_name,
      u.city_key,
      COALESCE(SUM(p.total_xp), 0)::bigint AS total_xp,
      COUNT(m.user_id)::bigint AS member_count
    FROM public.universities u
    LEFT JOIN public.user_university_memberships m
      ON m.university_id = u.id
      AND m.status IN ('pending', 'verified')
    LEFT JOIN public.profiles p
      ON p.id = m.user_id
    WHERE u.city_key = _city_key
    GROUP BY u.id, u.name, u.short_name, u.city_key
  )
  SELECT
    scores.university_id,
    scores.name,
    scores.short_name,
    scores.city_key,
    scores.total_xp,
    scores.member_count,
    ROW_NUMBER() OVER (ORDER BY scores.total_xp DESC, scores.member_count DESC, scores.name ASC)::integer AS rank
  FROM scores
  ORDER BY rank ASC, scores.name ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.university_leaderboard_by_city(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.university_leaderboard_by_city(text)
  TO authenticated;
