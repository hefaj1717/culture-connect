-- Announcements are write-only through publish_organizer_announcement().
-- Keep the table private even if a client guesses its PostgREST endpoint.
CREATE POLICY "No direct organizer announcement access"
  ON public.organizer_announcements
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
