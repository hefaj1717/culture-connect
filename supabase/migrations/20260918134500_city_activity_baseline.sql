-- Aggregate only the counts needed to scale the public activity map.
-- An active resident has interacted with an event in this city in the last 45 days.

CREATE OR REPLACE FUNCTION public.city_activity_baseline(_city_key text)
RETURNS TABLE (
  registered_users integer,
  active_users integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _city_key NOT IN ('leuven', 'lublin') THEN
    RAISE EXCEPTION 'Unsupported city';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::integer FROM public.profiles WHERE city_key = _city_key),
    (
      SELECT count(DISTINCT response.user_id)::integer
      FROM public.user_event_responses response
      INNER JOIN public.organizer_events event ON event.id = response.event_id
      WHERE event.city_key = _city_key
        AND response.updated_at >= now() - interval '45 days'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.city_activity_baseline(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.city_activity_baseline(text) TO authenticated;
