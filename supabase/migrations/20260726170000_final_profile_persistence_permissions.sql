-- ============================================================
-- FINAL PROFILE PERSISTENCE + SAFE PROFILE PERMISSIONS
-- ============================================================
-- User-editable profile data belongs in public.profiles so it survives
-- app resets and can be read consistently by server-side review tools.
-- XP remains server-managed only.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS city_key text NOT NULL DEFAULT 'leuven';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_city_key_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_city_key_check CHECK (city_key IN ('leuven', 'lublin'));

UPDATE public.profiles
SET
  first_name = COALESCE(
    NULLIF(TRIM(first_name), ''),
    NULLIF(split_part(TRIM(COALESCE(username, '')), ' ', 1), '')
  ),
  last_name = COALESCE(
    NULLIF(TRIM(last_name), ''),
    NULLIF(TRIM(regexp_replace(TRIM(COALESCE(username, '')), '^\S+\s*', '')), '')
  )
WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer_application jsonb;
  full_name text;
  first_name text;
  last_name text;
  profile_city_key text;
BEGIN
  first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'first_name', '')), '');
  last_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')), '');
  full_name := NULLIF(
    TRIM(
      COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        CONCAT_WS(' ', first_name, last_name),
        ''
      )
    ),
    ''
  );

  profile_city_key := CASE
    WHEN NEW.raw_user_meta_data ->> 'city_id' = 'lublin' THEN 'lublin'
    ELSE 'leuven'
  END;

  INSERT INTO public.profiles (
    id,
    username,
    first_name,
    last_name,
    avatar_url,
    city_key
  )
  VALUES (
    NEW.id,
    COALESCE(full_name, NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    first_name,
    last_name,
    NEW.raw_user_meta_data ->> 'avatar_url',
    profile_city_key
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = EXCLUDED.avatar_url,
    city_key = EXCLUDED.city_key,
    updated_at = now();

  organizer_application := NEW.raw_user_meta_data -> 'organizer_application';

  IF organizer_application IS NOT NULL
    AND jsonb_typeof(organizer_application) = 'object'
    AND NULLIF(TRIM(COALESCE(organizer_application ->> 'institution_name', '')), '') IS NOT NULL
  THEN
    INSERT INTO public.organizer_applications (
      user_id,
      city_key,
      institution_name,
      institution_type,
      website_url,
      contact_name,
      contact_email,
      contact_role,
      note,
      status
    )
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.raw_user_meta_data ->> 'city_id' = 'lublin' THEN 'lublin'
        ELSE 'leuven'
      END,
      TRIM(organizer_application ->> 'institution_name'),
      COALESCE(NULLIF(organizer_application ->> 'institution_type', ''), 'cultural_institution'),
      NULLIF(TRIM(COALESCE(organizer_application ->> 'website_url', '')), ''),
      COALESCE(full_name, split_part(NEW.email, '@', 1)),
      NEW.email,
      NULLIF(TRIM(COALESCE(organizer_application ->> 'contact_role', '')), ''),
      NULLIF(TRIM(COALESCE(organizer_application ->> 'note', '')), ''),
      'pending'
    )
    ON CONFLICT (user_id, institution_name) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.profiles TO authenticated;

REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (
  id,
  username,
  first_name,
  last_name,
  avatar_url,
  city_key
) ON public.profiles TO authenticated;
GRANT UPDATE (
  username,
  first_name,
  last_name,
  avatar_url,
  city_key
) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users"
  ON public.profiles;
DROP POLICY IF EXISTS "Users view own profiles and admins view all"
  ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"
  ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"
  ON public.profiles;
DROP POLICY IF EXISTS "Users update their own profile"
  ON public.profiles;

CREATE POLICY "Users view own profiles and admins view all"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
