CREATE POLICY "Users mark their own notifications read"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
