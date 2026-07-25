-- ============================================================
-- ORGANIZER EVENT IMAGE UPLOADS
-- ============================================================

ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Event images are publicly readable"
  ON storage.objects;

CREATE POLICY "Event images are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Approved organizers can upload event images"
  ON storage.objects;

CREATE POLICY "Approved organizers can upload event images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_approved_organizer(auth.uid())
  );

DROP POLICY IF EXISTS "Approved organizers can update their event images"
  ON storage.objects;

CREATE POLICY "Approved organizers can update their event images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_approved_organizer(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_approved_organizer(auth.uid())
  );

DROP POLICY IF EXISTS "Approved organizers can delete their event images"
  ON storage.objects;

CREATE POLICY "Approved organizers can delete their event images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_approved_organizer(auth.uid())
  );
