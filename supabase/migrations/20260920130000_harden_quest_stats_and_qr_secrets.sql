-- Completion rows contain user activity, so the client reads only a safe aggregate
-- from an authenticated RPC. The old view becomes invoker-safe and is no longer
-- granted to API roles.
ALTER VIEW public.quest_completion_stats SET (security_invoker = true);
REVOKE ALL ON TABLE public.quest_completion_stats FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_approved_quest_completion_stats(_quest_ids uuid[])
RETURNS TABLE(quest_id uuid, completion_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  RETURN QUERY
  SELECT completion.quest_id, count(*)::integer AS completion_count
  FROM public.quest_completions AS completion
  INNER JOIN public.quests AS quest ON quest.id = completion.quest_id
  WHERE quest.status = 'approved'
    AND completion.quest_id = ANY(_quest_ids)
  GROUP BY completion.quest_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_approved_quest_completion_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_approved_quest_completion_stats(uuid[]) TO authenticated;

-- These tables are reached only by narrowly-authorized SECURITY DEFINER RPCs.
-- Privilege revocation is the primary barrier; restrictive policies keep that
-- contract explicit and resist an accidental future grant.
REVOKE ALL ON TABLE public.organizer_event_checkin_secrets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.quest_completion_secrets FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Deny direct access to event check-in secrets"
  ON public.organizer_event_checkin_secrets;
CREATE POLICY "Deny direct access to event check-in secrets"
  ON public.organizer_event_checkin_secrets
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct access to quest completion secrets"
  ON public.quest_completion_secrets;
CREATE POLICY "Deny direct access to quest completion secrets"
  ON public.quest_completion_secrets
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
