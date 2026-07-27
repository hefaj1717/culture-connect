ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organizer_bio text,
  ADD COLUMN IF NOT EXISTS organizer_location_name text,
  ADD COLUMN IF NOT EXISTS organizer_location_address text,
  ADD COLUMN IF NOT EXISTS organizer_location_latitude double precision,
  ADD COLUMN IF NOT EXISTS organizer_location_longitude double precision;

GRANT UPDATE (
  organizer_bio,
  organizer_location_name,
  organizer_location_address,
  organizer_location_latitude,
  organizer_location_longitude
) ON public.profiles TO authenticated;

GRANT INSERT (
  organizer_bio,
  organizer_location_name,
  organizer_location_address,
  organizer_location_latitude,
  organizer_location_longitude
) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users view own profiles and admins view all"
  ON public.profiles;
DROP POLICY IF EXISTS "Users view own profiles, approved organizers, and admins view all"
  ON public.profiles;

CREATE POLICY "Users view own profiles, approved organizers, and admins view all"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_approved_organizer(id)
  );

CREATE OR REPLACE VIEW public.organizer_directory_profiles AS
SELECT
  p.id,
  p.username,
  p.avatar_url,
  p.city_key,
  p.organizer_bio,
  p.organizer_location_name,
  p.organizer_location_address,
  p.organizer_location_latitude,
  p.organizer_location_longitude
FROM public.profiles p
WHERE public.is_approved_organizer(p.id);

GRANT SELECT ON public.organizer_directory_profiles TO authenticated;
