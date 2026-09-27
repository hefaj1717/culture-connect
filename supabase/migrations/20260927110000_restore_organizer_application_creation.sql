-- Keep both onboarding side effects when a user is created: university membership
-- and an optional organizer application from the trusted Auth metadata payload.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer_application jsonb;
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

  INSERT INTO public.profiles (id, username, avatar_url, first_name, last_name, city_key)
  VALUES (
    NEW.id,
    COALESCE(profile_full_name, split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    profile_first_name,
    profile_last_name,
    profile_city_key
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    city_key = EXCLUDED.city_key;

  PERFORM public.sync_university_membership_from_metadata(NEW.id, NEW.raw_user_meta_data);

  organizer_application := NEW.raw_user_meta_data -> 'organizer_application';
  IF organizer_application IS NOT NULL
    AND jsonb_typeof(organizer_application) = 'object'
    AND NULLIF(TRIM(COALESCE(organizer_application ->> 'institution_name', '')), '') IS NOT NULL
  THEN
    INSERT INTO public.organizer_applications (
      user_id, city_key, institution_name, institution_type, website_url,
      contact_name, contact_email, contact_role, note, status
    ) VALUES (
      NEW.id,
      profile_city_key,
      TRIM(organizer_application ->> 'institution_name'),
      COALESCE(NULLIF(organizer_application ->> 'institution_type', ''), 'cultural_institution'),
      NULLIF(TRIM(COALESCE(organizer_application ->> 'website_url', '')), ''),
      COALESCE(profile_full_name, split_part(NEW.email, '@', 1)),
      NEW.email,
      NULLIF(TRIM(COALESCE(organizer_application ->> 'contact_role', '')), ''),
      NULLIF(TRIM(COALESCE(organizer_application ->> 'note', '')), ''),
      'pending'
    ) ON CONFLICT (user_id, institution_name) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Repair applications lost while the prior trigger revision was active.
INSERT INTO public.organizer_applications (
  user_id, city_key, institution_name, institution_type, website_url,
  contact_name, contact_email, contact_role, note, status
)
SELECT
  users.id,
  CASE WHEN users.raw_user_meta_data ->> 'city_id' = 'lublin' THEN 'lublin' ELSE 'leuven' END,
  TRIM(users.raw_user_meta_data -> 'organizer_application' ->> 'institution_name'),
  COALESCE(
    NULLIF(users.raw_user_meta_data -> 'organizer_application' ->> 'institution_type', ''),
    'cultural_institution'
  ),
  NULLIF(TRIM(COALESCE(users.raw_user_meta_data -> 'organizer_application' ->> 'website_url', '')), ''),
  COALESCE(NULLIF(TRIM(users.raw_user_meta_data ->> 'full_name'), ''), split_part(users.email, '@', 1)),
  users.email,
  NULLIF(TRIM(COALESCE(users.raw_user_meta_data -> 'organizer_application' ->> 'contact_role', '')), ''),
  NULLIF(TRIM(COALESCE(users.raw_user_meta_data -> 'organizer_application' ->> 'note', '')), ''),
  'pending'
FROM auth.users AS users
WHERE jsonb_typeof(users.raw_user_meta_data -> 'organizer_application') = 'object'
  AND NULLIF(TRIM(COALESCE(users.raw_user_meta_data -> 'organizer_application' ->> 'institution_name', '')), '') IS NOT NULL
ON CONFLICT (user_id, institution_name) DO NOTHING;
