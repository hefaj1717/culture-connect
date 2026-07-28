DROP POLICY IF EXISTS "Approved organizers can update unreviewed own events"
  ON public.organizer_events;

CREATE POLICY "Approved organizers can resubmit own events"
  ON public.organizer_events FOR UPDATE TO authenticated
  USING (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending', 'approved', 'rejected')
  )
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending')
  );
