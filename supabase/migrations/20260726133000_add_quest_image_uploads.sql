-- ============================================================
-- ADMIN QUEST IMAGE UPLOADS
-- ============================================================

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quest-images',
  'quest-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Quest images are publicly readable"
  ON storage.objects;

CREATE POLICY "Quest images are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'quest-images');

DROP POLICY IF EXISTS "Admins can upload quest images"
  ON storage.objects;

CREATE POLICY "Admins can upload quest images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quest-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can update quest images"
  ON storage.objects;

CREATE POLICY "Admins can update quest images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'quest-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'quest-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete quest images"
  ON storage.objects;

CREATE POLICY "Admins can delete quest images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'quest-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'admin')
  );
