-- ============================================================
-- ORGANIZER APPLICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_key text NOT NULL CHECK (city_key IN ('leuven', 'lublin')),
  institution_name text NOT NULL,
  institution_type text NOT NULL CHECK (
    institution_type IN (
      'cultural_institution',
      'cafe_or_business',
      'student_organization',
      'city_partner'
    )
  ),
  website_url text,
  contact_name text,
  contact_email text NOT NULL,
  contact_role text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, institution_name)
);

ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organizer applications"
  ON public.organizer_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit their own organizer applications"
  ON public.organizer_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE TRIGGER organizer_applications_set_updated_at
  BEFORE UPDATE ON public.organizer_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer_application jsonb;
  full_name text;
BEGIN
  full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '');

  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(full_name, NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

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
