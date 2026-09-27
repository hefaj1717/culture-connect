-- Public campus profiles expose only aggregate university data. They never
-- reveal individual students or their XP balances.
CREATE OR REPLACE FUNCTION public.get_university_profile_summary(_university_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _university public.universities%ROWTYPE;
  _member_count bigint := 0;
  _total_xp bigint := 0;
  _current_rank integer := 0;
  _ranking_history jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _university
  FROM public.universities
  WHERE id = _university_id;

  IF _university.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_university');
  END IF;

  SELECT
    COUNT(membership.user_id)::bigint,
    COALESCE(SUM(profile.total_xp), 0)::bigint
  INTO _member_count, _total_xp
  FROM public.user_university_memberships AS membership
  LEFT JOIN public.profiles AS profile ON profile.id = membership.user_id
  WHERE membership.university_id = _university.id
    AND membership.status IN ('pending', 'verified');

  WITH scores AS (
    SELECT
      university.id AS university_id,
      COALESCE(SUM(profile.total_xp), 0)::bigint AS total_xp,
      COUNT(membership.user_id)::bigint AS member_count
    FROM public.universities AS university
    LEFT JOIN public.user_university_memberships AS membership
      ON membership.university_id = university.id
      AND membership.status IN ('pending', 'verified')
    LEFT JOIN public.profiles AS profile ON profile.id = membership.user_id
    WHERE university.city_key = _university.city_key
    GROUP BY university.id
  ), ranked AS (
    SELECT
      university_id,
      ROW_NUMBER() OVER (ORDER BY total_xp DESC, member_count DESC, university_id ASC)::integer AS rank
    FROM scores
  )
  SELECT rank INTO _current_rank
  FROM ranked
  WHERE university_id = _university.id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'academic_year', season.academic_year,
        'finalized_at', season.finalized_at,
        'member_count', entry.member_count,
        'rank', entry.rank,
        'total_xp', entry.total_xp
      )
      ORDER BY season.academic_year DESC, entry.rank ASC
    ),
    '[]'::jsonb
  ) INTO _ranking_history
  FROM public.university_leaderboard_season_entries AS entry
  JOIN public.university_leaderboard_seasons AS season ON season.id = entry.season_id
  WHERE entry.university_id = _university.id
    AND entry.rank IN (1, 2, 3);

  RETURN jsonb_build_object(
    'success', true,
    'active_member_count', _member_count,
    'city_key', _university.city_key,
    'current_rank', COALESCE(_current_rank, 0),
    'ranking_history', _ranking_history,
    'total_xp', _total_xp,
    'university_id', _university.id,
    'university_name', _university.name,
    'university_short_name', _university.short_name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_university_profile_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_university_profile_summary(text) TO authenticated;
