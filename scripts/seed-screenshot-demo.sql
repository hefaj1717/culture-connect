-- Screenshot-only content for the linked CultureQuest project.
-- Idempotent: rerunning updates the same deterministic rows instead of duplicating them.

begin;

with event_seed (
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
  start_offset,
  duration,
  xp_bonus,
  qc_bonus,
  language,
  is_free,
  is_international,
  interested_count,
  attendee_count,
  image_kind,
  city_timezone
) as (
  values
    (
      'd1000000-0000-4000-8000-000000000001'::uuid,
      '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
      'lublin', 'demo-lublin-po-farze', 'Plac Po Farze', 'Grodzka 18, Lublin',
      51.24862, 22.56845,
      'Old Town Courtyard Concert',
      'An intimate evening of live music in the heart of Lublin Old Town.',
      'concert', interval '-25 minutes', interval '2 hours 30 minutes',
      50, 5, 'multilingual', true, true, 34, 14, 'theater', 'Europe/Warsaw'
    ),
    (
      'd1000000-0000-4000-8000-000000000002'::uuid,
      '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
      'lublin', 'demo-lublin-csk', 'Centre for the Meeting of Cultures', 'Plac Teatralny 1, Lublin',
      51.24717, 22.54855,
      'Student Jazz Session',
      'A relaxed live jazz set with local student musicians and an open final jam.',
      'performance', interval '-10 minutes', interval '1 hour 50 minutes',
      60, 6, 'en', true, true, 23, 9, 'theater', 'Europe/Warsaw'
    ),
    (
      'd1000000-0000-4000-8000-000000000003'::uuid,
      '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
      'lublin', 'demo-lublin-castle', 'Lublin Castle', 'Zamkowa 9, Lublin',
      51.25067, 22.57224,
      'Night Museum Walk',
      'A guided evening route through selected exhibitions and stories of the castle.',
      'exhibition', interval '3 hours', interval '2 hours',
      50, 5, 'pl', false, false, 42, 0, 'museum', 'Europe/Warsaw'
    ),
    (
      'd1000000-0000-4000-8000-000000000004'::uuid,
      '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
      'lublin', 'demo-lublin-workshop', 'Workshops of Culture', 'Grodzka 5A, Lublin',
      51.24801, 22.56651,
      'Urban Sketching Workshop',
      'Learn quick observational drawing while capturing the details of the Old Town.',
      'workshop', interval '1 day 2 hours', interval '2 hours',
      70, 7, 'en', true, true, 19, 0, 'cafe', 'Europe/Warsaw'
    ),
    (
      'd1000000-0000-4000-8000-000000000005'::uuid,
      '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
      'lublin', 'demo-lublin-litewski', 'Plac Litewski', 'Plac Litewski, Lublin',
      51.24779, 22.56012,
      'Local Makers Market',
      'A small open-air market featuring prints, ceramics, books, and local design.',
      'market', interval '3 days 4 hours', interval '4 hours',
      40, 4, 'multilingual', true, true, 28, 0, 'museum', 'Europe/Warsaw'
    ),
    (
      'd2000000-0000-4000-8000-000000000001'::uuid,
      '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
      'leuven', 'demo-leuven-ladeuze', 'Ladeuzeplein', 'Monseigneur Ladeuzeplein, Leuven',
      50.87908, 4.70066,
      'Ladeuze Open-Air Sessions',
      'A live city-centre set bringing students and local artists together.',
      'concert', interval '-35 minutes', interval '2 hours 45 minutes',
      50, 5, 'multilingual', true, true, 39, 17, 'theater', 'Europe/Brussels'
    ),
    (
      'd2000000-0000-4000-8000-000000000002'::uuid,
      '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
      'leuven', 'demo-leuven-museum', 'M Leuven', 'Leopold Vanderkelenstraat 28, Leuven',
      50.87932, 4.70163,
      'Museum Late: New Perspectives',
      'An after-hours programme with short talks, music, and a fresh look at the collection.',
      'exhibition', interval '-15 minutes', interval '2 hours',
      65, 6, 'en', false, true, 27, 11, 'museum', 'Europe/Brussels'
    ),
    (
      'd2000000-0000-4000-8000-000000000003'::uuid,
      '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
      'leuven', 'demo-leuven-library', 'University Library', 'Monseigneur Ladeuzeplein 21, Leuven',
      50.87896, 4.70050,
      'Ideas After Class',
      'A concise public lecture followed by an informal student discussion.',
      'lecture', interval '4 hours', interval '1 hour 30 minutes',
      45, 5, 'en', true, true, 31, 0, 'museum', 'Europe/Brussels'
    ),
    (
      'd2000000-0000-4000-8000-000000000004'::uuid,
      '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
      'leuven', 'demo-leuven-stuk', 'STUK Arts Centre', 'Naamsestraat 96, Leuven',
      50.87494, 4.70032,
      'Movement and Sound Lab',
      'A hands-on workshop exploring rhythm, movement, and collaborative performance.',
      'workshop', interval '1 day 3 hours', interval '2 hours',
      75, 8, 'en', true, true, 21, 0, 'theater', 'Europe/Brussels'
    ),
    (
      'd2000000-0000-4000-8000-000000000005'::uuid,
      '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
      'leuven', 'demo-leuven-oude-markt', 'Oude Markt', 'Oude Markt, Leuven',
      50.87702, 4.70048,
      'International Student Social',
      'An easy-going evening to meet people, exchange languages, and discover Leuven.',
      'party', interval '2 days 5 hours', interval '3 hours',
      55, 6, 'multilingual', true, true, 36, 0, 'cafe', 'Europe/Brussels'
    )
),
prepared_events as (
  select
    id, organizer_user_id, city_key, venue_key, venue_name, venue_address,
    venue_latitude, venue_longitude, title, description, category,
    to_char((now() + start_offset) at time zone city_timezone, 'Dy, Mon DD') as date_label,
    to_char((now() + start_offset + duration) at time zone city_timezone, 'Dy, Mon DD') as end_date_label,
    to_char((now() + start_offset) at time zone city_timezone, 'HH24:MI') as time_label,
    to_char((now() + start_offset + duration) at time zone city_timezone, 'HH24:MI') as end_time_label,
    now() + start_offset as starts_at,
    now() + start_offset + duration as ends_at,
    xp_bonus, qc_bonus, language, is_free, is_international,
    interested_count, attendee_count, image_kind
  from event_seed
)
insert into public.organizer_events (
  id, organizer_user_id, city_key, venue_key, venue_name, venue_address,
  venue_latitude, venue_longitude, title, description, category,
  date_label, end_date_label, time_label, end_time_label, starts_at, ends_at,
  xp_bonus, qc_bonus, language, is_free, is_international,
  interested_count, attendee_count, image_kind,
  status, reviewed_by, reviewed_at
)
select
  prepared_events.*,
  'approved',
  'c6d0fd6f-c5fc-4466-a6c9-f37c1b73dfac'::uuid,
  now()
from prepared_events
on conflict (id) do update set
  organizer_user_id = excluded.organizer_user_id,
  city_key = excluded.city_key,
  venue_key = excluded.venue_key,
  venue_name = excluded.venue_name,
  venue_address = excluded.venue_address,
  venue_latitude = excluded.venue_latitude,
  venue_longitude = excluded.venue_longitude,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  date_label = excluded.date_label,
  end_date_label = excluded.end_date_label,
  time_label = excluded.time_label,
  end_time_label = excluded.end_time_label,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  xp_bonus = excluded.xp_bonus,
  qc_bonus = excluded.qc_bonus,
  language = excluded.language,
  is_free = excluded.is_free,
  is_international = excluded.is_international,
  interested_count = excluded.interested_count,
  attendee_count = excluded.attendee_count,
  image_kind = excluded.image_kind,
  status = 'approved',
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  rejection_reason = null;

with reward_seed (
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
  qc_cost,
  category,
  stock
) as (
  values
    (
      'd3000000-0000-4000-8000-000000000001'::uuid,
      '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
      'lublin', 'demo-reward-lublin-coffee', 'Old Town Coffee', 'Rynek 8, Lublin',
      51.24796, 22.56814,
      'Free specialty coffee', 'Choose any classic coffee from the student menu.',
      5, 'cafe', 80
    ),
    (
      'd3000000-0000-4000-8000-000000000002'::uuid,
      '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
      'lublin', 'demo-reward-lublin-books', 'City Bookstore', 'Krakowskie Przedmieście 12, Lublin',
      51.24770, 22.56260,
      '20% off a book', 'Use your CultureQuest Credits on one book from the featured shelf.',
      8, 'bookstore', 40
    ),
    (
      'd3000000-0000-4000-8000-000000000003'::uuid,
      '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
      'lublin', 'demo-reward-lublin-dessert', 'Lublin Bakery Lab', 'Narutowicza 6, Lublin',
      51.24620, 22.55970,
      'Dessert with any drink', 'Pick the daily dessert when ordering a hot or cold drink.',
      10, 'restaurant', 30
    ),
    (
      'd4000000-0000-4000-8000-000000000001'::uuid,
      '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
      'leuven', 'demo-reward-leuven-coffee', 'Ladeuze Coffee Bar', 'Monseigneur Ladeuzeplein 7, Leuven',
      50.87916, 4.69992,
      'Student coffee on us', 'Redeem a cappuccino, tea, or filter coffee from the student selection.',
      5, 'cafe', 80
    ),
    (
      'd4000000-0000-4000-8000-000000000002'::uuid,
      '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
      'leuven', 'demo-reward-leuven-shop', 'M Leuven Shop', 'Leopold Vanderkelenstraat 28, Leuven',
      50.87932, 4.70163,
      'Art postcard set', 'Collect a curated set of postcards inspired by the museum collection.',
      8, 'shop', 45
    ),
    (
      'd4000000-0000-4000-8000-000000000003'::uuid,
      '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
      'leuven', 'demo-reward-leuven-lunch', 'Oude Markt Kitchen', 'Oude Markt 24, Leuven',
      50.87704, 4.70065,
      'Lunch upgrade', 'Add a soup or dessert to a student lunch at no extra charge.',
      12, 'restaurant', 35
    )
)
insert into public.organizer_rewards (
  id, organizer_user_id, city_key, place_key, place_name, place_address,
  place_latitude, place_longitude, title, description,
  xp_cost, qc_cost, category, stock, status, reviewed_by, reviewed_at,
  available_from, available_until, available_days,
  available_start_time, available_end_time
)
select
  id, organizer_user_id, city_key, place_key, place_name, place_address,
  place_latitude, place_longitude, title, description,
  0, qc_cost, category, stock, 'approved',
  'c6d0fd6f-c5fc-4466-a6c9-f37c1b73dfac'::uuid, now(),
  current_date - 1, current_date + 45, array[1,2,3,4,5,6,7],
  '08:00'::time, '22:00'::time
from reward_seed
on conflict (id) do update set
  organizer_user_id = excluded.organizer_user_id,
  city_key = excluded.city_key,
  place_key = excluded.place_key,
  place_name = excluded.place_name,
  place_address = excluded.place_address,
  place_latitude = excluded.place_latitude,
  place_longitude = excluded.place_longitude,
  title = excluded.title,
  description = excluded.description,
  xp_cost = 0,
  qc_cost = excluded.qc_cost,
  category = excluded.category,
  stock = excluded.stock,
  status = 'approved',
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  rejection_reason = null,
  available_from = excluded.available_from,
  available_until = excluded.available_until,
  available_days = excluded.available_days,
  available_start_time = excluded.available_start_time,
  available_end_time = excluded.available_end_time;

commit;

select
  city_key,
  count(*) filter (where id::text like 'd1%' or id::text like 'd2%') as demo_events,
  count(*) filter (where starts_at <= now() and ends_at >= now()) as live_events
from public.organizer_events
where id::text like 'd1%' or id::text like 'd2%'
group by city_key
order by city_key;

