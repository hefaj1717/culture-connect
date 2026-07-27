DROP POLICY IF EXISTS "Admins delete organizer events"
  ON public.organizer_events;

CREATE POLICY "Admins delete organizer events"
  ON public.organizer_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
