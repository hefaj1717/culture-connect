-- Deterministic data for local development and Maestro E2E only.
-- `supabase db reset --local` recreates this data. Never run this file remotely.

DO $$
DECLARE
  v_student_id uuid := '10000000-0000-4000-8000-000000000001';
  v_organizer_id uuid := '20000000-0000-4000-8000-000000000002';
  v_admin_id uuid := '30000000-0000-4000-8000-000000000003';
  v_event_id uuid := '40000000-0000-4000-8000-000000000004';
  v_upcoming_event_id uuid := '40000000-0000-4000-8000-000000000005';
  v_reward_id uuid := '50000000-0000-4000-8000-000000000005';
  v_quest_id uuid := '60000000-0000-4000-8000-000000000006';
  password_hash text := crypt('CultureQuestE2E!2026', gen_salt('bf'));
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      v_student_id,
      'authenticated',
      'authenticated',
      'student.e2e@culturequest.local',
      password_hash,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"E2E","last_name":"Student","full_name":"E2E Student","city_id":"lublin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      v_organizer_id,
      'authenticated',
      'authenticated',
      'organizer.e2e@culturequest.local',
      password_hash,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"E2E","last_name":"Organizer","full_name":"E2E Culture House","city_id":"lublin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'admin.e2e@culturequest.local',
      password_hash,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"E2E","last_name":"Admin","full_name":"E2E Admin","city_id":"lublin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES
    (
      v_student_id::text,
      v_student_id,
      jsonb_build_object('sub', v_student_id::text, 'email', 'student.e2e@culturequest.local'),
      'email',
      now(),
      now(),
      now()
    ),
    (
      v_organizer_id::text,
      v_organizer_id,
      jsonb_build_object('sub', v_organizer_id::text, 'email', 'organizer.e2e@culturequest.local'),
      'email',
      now(),
      now(),
      now()
    ),
    (
      v_admin_id::text,
      v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin.e2e@culturequest.local'),
      'email',
      now(),
      now(),
      now()
    )
  ON CONFLICT (provider_id, provider) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (v_organizer_id, 'organizer'),
    (v_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
  SET
    organizer_bio = 'A deterministic organizer profile used by local E2E tests.',
    organizer_location_name = 'E2E Culture House',
    organizer_location_address = 'Plac Litewski 1, Lublin',
    organizer_location_latitude = 51.2478,
    organizer_location_longitude = 22.5601
  WHERE id = v_organizer_id;

  -- Give the student enough credits to exercise reward redemption while keeping
  -- XP below the amount earned by the event/quest journey.
  UPDATE public.profiles
  SET total_xp = 0, total_qc = 20
  WHERE id = v_student_id;

  INSERT INTO public.organizer_events (
    id,
    organizer_user_id,
    city_key,
    venue_key,
    venue_name,
    venue_address,
    venue_latitude,
    venue_longitude,
    title,
    description,
    category,
    date_label,
    end_date_label,
    time_label,
    end_time_label,
    starts_at,
    ends_at,
    xp_bonus,
    qc_bonus,
    language,
    is_free,
    is_international,
    image_kind,
    status,
    reviewed_by,
    reviewed_at
  ) VALUES
    (
      v_event_id,
      v_organizer_id,
      'lublin',
      'e2e-live-venue',
      'E2E Culture House',
      'Plac Litewski 1, Lublin',
      51.2478,
      22.5601,
      'E2E Live Culture Night',
      'A live event reserved for deterministic RSVP and check-in tests.',
      'concert',
      to_char(current_date, 'Dy, Mon DD'),
      to_char(current_date, 'Dy, Mon DD'),
      to_char(now() - interval '5 minutes', 'HH24:MI'),
      to_char(now() + interval '2 hours', 'HH24:MI'),
      now() - interval '5 minutes',
      now() + interval '2 hours',
      50,
      5,
      'en',
      true,
      true,
      'theater',
      'approved',
      v_admin_id,
      now()
    ),
    (
      v_upcoming_event_id,
      v_organizer_id,
      'lublin',
      'e2e-upcoming-venue',
      'E2E Gallery',
      'Krakowskie Przedmieście 1, Lublin',
      51.2472,
      22.5610,
      'E2E Upcoming Exhibition',
      'A future event used to verify event to organizer to event navigation.',
      'exhibition',
      to_char(current_date + 1, 'Dy, Mon DD'),
      to_char(current_date + 1, 'Dy, Mon DD'),
      '18:00',
      '20:00',
      date_trunc('day', now()) + interval '1 day 18 hours',
      date_trunc('day', now()) + interval '1 day 20 hours',
      50,
      5,
      'en',
      true,
      true,
      'museum',
      'approved',
      v_admin_id,
      now()
    )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.organizer_event_checkin_secrets
  SET
    check_in_code = 'culturequest:event:e2e-live-check-in-token',
    expires_at = now() + interval '24 hours'
  WHERE organizer_event_checkin_secrets.event_id = v_event_id;

  INSERT INTO public.organizer_rewards (
    id,
    organizer_user_id,
    city_key,
    place_key,
    place_name,
    place_address,
    place_latitude,
    place_longitude,
    title,
    description,
    xp_cost,
    qc_cost,
    category,
    stock,
    status,
    reviewed_by,
    reviewed_at,
    available_from,
    available_until,
    available_days,
    available_start_time,
    available_end_time
  ) VALUES (
    v_reward_id,
    v_organizer_id,
    'lublin',
    'e2e-reward-place',
    'E2E Culture Café',
    'Plac Litewski 1, Lublin',
    51.2478,
    22.5601,
    'E2E Coffee Reward',
    'A five-credit reward reserved for the local E2E redemption journey.',
    0,
    5,
    'cafe',
    100,
    'approved',
    v_admin_id,
    now(),
    current_date - 1,
    current_date + 30,
    ARRAY[1, 2, 3, 4, 5, 6, 7],
    '00:00',
    '23:59'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.quests (
    id,
    city_key,
    title,
    theme,
    description,
    total_xp,
    total_qc,
    image_kind,
    status,
    created_by,
    available_from,
    available_until
  ) VALUES (
    v_quest_id,
    'lublin',
    'E2E Old Town Route',
    'city_route',
    'A deterministic quest used by local completion tests.',
    30,
    5,
    'museum',
    'approved',
    v_admin_id,
    current_date - 1,
    current_date + 30
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.quest_stops (
    id,
    quest_id,
    title,
    description,
    eta,
    position,
    venue_key,
    latitude,
    longitude
  ) VALUES (
    '70000000-0000-4000-8000-000000000007',
    v_quest_id,
    'E2E Old Town Stop',
    'A deterministic stop that makes the seeded quest completable.',
    '1 min',
    1,
    'e2e-quest-stop',
    51.2478,
    22.5601
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.quest_completion_secrets
  SET completion_code = 'culturequest:quest:e2e-completion-token'
  WHERE quest_completion_secrets.quest_id = v_quest_id;
END $$;
