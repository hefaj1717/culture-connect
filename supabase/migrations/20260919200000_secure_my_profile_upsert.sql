-- Profile rows may be absent after an administrative cleanup even though the
-- corresponding auth.users row remains. Keep this self-service operation
-- narrowly scoped to auth.uid() and validate every client-provided field.
CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  _username text,
  _first_name text,
  _last_name text,
  _city_key text,
  _avatar_url text DEFAULT NULL,
  _organizer_bio text DEFAULT NULL,
  _organizer_location_name text DEFAULT NULL,
  _organizer_location_address text DEFAULT NULL,
  _organizer_location_latitude double precision DEFAULT NULL,
  _organizer_location_longitude double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _normalized_first_name text := NULLIF(left(trim(COALESCE(_first_name, '')), 40), '');
  _normalized_last_name text := NULLIF(left(trim(COALESCE(_last_name, '')), 40), '');
  _normalized_username text := NULLIF(left(trim(COALESCE(_username, '')), 120), '');
  _normalized_city_key text := lower(trim(COALESCE(_city_key, '')));
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _normalized_first_name IS NULL OR _normalized_last_name IS NULL OR _normalized_username IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_name');
  END IF;

  IF _normalized_city_key NOT IN ('leuven', 'lublin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_city');
  END IF;

  IF (_organizer_location_latitude IS NULL) <> (_organizer_location_longitude IS NULL)
    OR (_organizer_location_latitude IS NOT NULL AND _organizer_location_latitude NOT BETWEEN -90 AND 90)
    OR (_organizer_location_longitude IS NOT NULL AND _organizer_location_longitude NOT BETWEEN -180 AND 180)
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_location');
  END IF;

  INSERT INTO public.profiles (
    id,
    username,
    first_name,
    last_name,
    city_key,
    avatar_url,
    organizer_bio,
    organizer_location_name,
    organizer_location_address,
    organizer_location_latitude,
    organizer_location_longitude
  )
  VALUES (
    _uid,
    _normalized_username,
    _normalized_first_name,
    _normalized_last_name,
    _normalized_city_key,
    NULLIF(left(trim(COALESCE(_avatar_url, '')), 2000), ''),
    NULLIF(left(trim(COALESCE(_organizer_bio, '')), 500), ''),
    NULLIF(left(trim(COALESCE(_organizer_location_name, '')), 120), ''),
    NULLIF(left(trim(COALESCE(_organizer_location_address, '')), 500), ''),
    _organizer_location_latitude,
    _organizer_location_longitude
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    city_key = EXCLUDED.city_key,
    avatar_url = EXCLUDED.avatar_url,
    organizer_bio = EXCLUDED.organizer_bio,
    organizer_location_name = EXCLUDED.organizer_location_name,
    organizer_location_address = EXCLUDED.organizer_location_address,
    organizer_location_latitude = EXCLUDED.organizer_location_latitude,
    organizer_location_longitude = EXCLUDED.organizer_location_longitude,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_my_profile(
  text, text, text, text, text, text, text, text, double precision, double precision
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_my_profile(
  text, text, text, text, text, text, text, text, double precision, double precision
) TO authenticated;
