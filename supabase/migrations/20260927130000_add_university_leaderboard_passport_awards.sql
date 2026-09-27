-- Campus rank is only meaningful after a season closes. Snapshot both the
-- leaderboard and eligible members so later XP or university changes cannot
-- rewrite an earned Digital Passport badge.
CREATE TABLE IF NOT EXISTS public.university_leaderboard_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL CHECK (academic_year ~ '^20[0-9]{2}/20[0-9]{2}$'),
  city_key text NOT NULL CHECK (city_key IN ('leuven', 'lublin')),
  finalized_at timestamptz NOT NULL DEFAULT now(),
  finalized_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  UNIQUE (academic_year, city_key)
);

CREATE TABLE IF NOT EXISTS public.university_leaderboard_season_entries (
  season_id uuid NOT NULL REFERENCES public.university_leaderboard_seasons(id) ON DELETE CASCADE,
  university_id text NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  rank integer NOT NULL CHECK (rank > 0),
  total_xp bigint NOT NULL CHECK (total_xp >= 0),
  member_count bigint NOT NULL CHECK (member_count >= 0),
  PRIMARY KEY (season_id, university_id),
  UNIQUE (season_id, rank)
);

CREATE TABLE IF NOT EXISTS public.user_university_leaderboard_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.university_leaderboard_seasons(id) ON DELETE CASCADE,
  university_id text NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  rank integer NOT NULL CHECK (rank IN (1, 2, 3)),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_university_leaderboard_awards_user
  ON public.user_university_leaderboard_awards (user_id, awarded_at DESC);

ALTER TABLE public.university_leaderboard_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_leaderboard_season_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_university_leaderboard_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read finalized ranking seasons"
  ON public.university_leaderboard_seasons FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users read finalized ranking entries"
  ON public.university_leaderboard_season_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users read their own university ranking awards"
  ON public.user_university_leaderboard_awards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.university_leaderboard_seasons,
  public.university_leaderboard_season_entries,
  public.user_university_leaderboard_awards TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_university_leaderboard_season(
  _academic_year text,
  _city_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid := auth.uid();
  _season_id uuid;
  _ranked_universities integer := 0;
  _awarded_users integer := 0;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF _academic_year !~ '^20[0-9]{2}/20[0-9]{2}$' OR _city_key NOT IN ('leuven', 'lublin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_season');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.university_leaderboard_seasons
    WHERE academic_year = _academic_year AND city_key = _city_key
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'season_already_finalized');
  END IF;

  INSERT INTO public.university_leaderboard_seasons (academic_year, city_key, finalized_by)
  VALUES (_academic_year, _city_key, _uid)
  RETURNING id INTO _season_id;

  WITH scores AS (
    SELECT
      university.id AS university_id,
      COALESCE(SUM(profile.total_xp), 0)::bigint AS total_xp,
      COUNT(membership.user_id)::bigint AS member_count
    FROM public.universities AS university
    JOIN public.user_university_memberships AS membership
      ON membership.university_id = university.id
      AND membership.status IN ('pending', 'verified')
    JOIN public.profiles AS profile ON profile.id = membership.user_id
    WHERE university.city_key = _city_key
    GROUP BY university.id
    HAVING COALESCE(SUM(profile.total_xp), 0) > 0
  ), ranked AS (
    SELECT
      university_id,
      total_xp,
      member_count,
      ROW_NUMBER() OVER (ORDER BY total_xp DESC, member_count DESC, university_id ASC)::integer AS rank
    FROM scores
  )
  INSERT INTO public.university_leaderboard_season_entries (
    season_id, university_id, rank, total_xp, member_count
  )
  SELECT _season_id, university_id, rank, total_xp, member_count
  FROM ranked;

  GET DIAGNOSTICS _ranked_universities = ROW_COUNT;

  INSERT INTO public.user_university_leaderboard_awards (user_id, season_id, university_id, rank)
  SELECT membership.user_id, _season_id, entry.university_id, entry.rank
  FROM public.university_leaderboard_season_entries AS entry
  JOIN public.user_university_memberships AS membership
    ON membership.university_id = entry.university_id
    AND membership.status IN ('pending', 'verified')
  WHERE entry.season_id = _season_id
    AND entry.rank IN (1, 2, 3);

  GET DIAGNOSTICS _awarded_users = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'academic_year', _academic_year,
    'awarded_users', _awarded_users,
    'ranked_universities', _ranked_universities,
    'season_id', _season_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_university_leaderboard_season(text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_university_leaderboard_season(text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_digital_passport_progress()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid := auth.uid();
  _created_at timestamptz;
  _events_completed integer := 0;
  _quests_completed integer := 0;
  _same_organizer_events integer := 0;
  _university_ranking_awards jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT created_at INTO _created_at FROM auth.users WHERE id = _uid;

  SELECT count(*) INTO _events_completed
  FROM public.user_event_responses
  WHERE user_id = _uid AND status = 'attended';

  SELECT count(*) INTO _quests_completed
  FROM public.quest_completions
  WHERE user_id = _uid;

  SELECT COALESCE(max(organizer_events.completed_count), 0) INTO _same_organizer_events
  FROM (
    SELECT event.organizer_user_id, count(*)::integer AS completed_count
    FROM public.user_event_responses AS response
    JOIN public.organizer_events AS event ON event.id = response.event_id
    WHERE response.user_id = _uid AND response.status = 'attended'
    GROUP BY event.organizer_user_id
  ) AS organizer_events;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'academic_year', season.academic_year,
        'city_key', season.city_key,
        'rank', award.rank,
        'university_name', university.name
      )
      ORDER BY season.academic_year DESC, award.rank ASC
    ),
    '[]'::jsonb
  ) INTO _university_ranking_awards
  FROM public.user_university_leaderboard_awards AS award
  JOIN public.university_leaderboard_seasons AS season ON season.id = award.season_id
  JOIN public.universities AS university ON university.id = award.university_id
  WHERE award.user_id = _uid;

  RETURN jsonb_build_object(
    'success', true,
    'beta_user', _created_at < timestamptz '2027-01-01 00:00:00+00',
    'events_completed', _events_completed,
    'quests_completed', _quests_completed,
    'same_organizer_events', _same_organizer_events,
    'university_ranking_awards', _university_ranking_awards
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_digital_passport_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_digital_passport_progress() TO authenticated;
