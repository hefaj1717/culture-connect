-- Demo events for testing the home-screen activity heatmap and event lists.
-- Start times are relative to now(), so rerun this file whenever the demo
-- should look "fresh" again. Idempotent: rows are upserted by fixed ids.
--
-- The heatmap only shows events that are live, start within 24 h, or ended
-- less than 2 h ago, weighted by attended/interested counts. This seed
-- covers every one of those cases plus events outside the window (lists only).
--
-- Run:    supabase db query --linked -f scripts/seed-heatmap-demo.sql
-- Remove: supabase db query --linked "delete from public.organizer_events where id::text like 'e_00%'"

begin;

with event_seed (
  id, organizer_user_id, city_key, venue_key, venue_name, venue_address,
  venue_latitude, venue_longitude, title, description, category,
  start_offset, duration, language, is_free, is_international,
  interested_count, attendee_count, image_kind, city_timezone
) as (
  values
    -- ── Lublin: Old Town hotspot (several live / imminent events close together)
    ('e1000000-0000-4000-8000-000000000001'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-rynek', 'Rynek Starego Miasta', 'Rynek, Lublin', 51.24796, 22.56787,
     'Old Town Street Theatre', 'Open-air street theatre around the Old Town market square.',
     'performance', interval '-40 minutes', interval '3 hours', 'multilingual', true, true, 48, 22, 'theater', 'Europe/Warsaw'),
    ('e1000000-0000-4000-8000-000000000002'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-brama', 'Brama Krakowska', 'Plac Łokietka 3, Lublin', 51.24763, 22.56506,
     'Gate Tower Night Tour', 'A short guided climb with stories of the city gate.',
     'exhibition', interval '1 hour', interval '1 hour 30 minutes', 'pl', false, false, 26, 0, 'museum', 'Europe/Warsaw'),
    ('e1000000-0000-4000-8000-000000000003'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-grodzka', 'Brama Grodzka', 'Grodzka 21, Lublin', 51.24913, 22.56960,
     'Poetry by Candlelight', 'Readings in Polish and English inside the historic gate.',
     'lecture', interval '2 hours 30 minutes', interval '1 hour 30 minutes', 'multilingual', true, true, 18, 0, 'theater', 'Europe/Warsaw'),
    -- ── Lublin: city centre (medium)
    ('e1000000-0000-4000-8000-000000000004'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-osterwy', 'Teatr im. Osterwy', 'Narutowicza 17, Lublin', 51.24524, 22.55902,
     'Student Theatre Premiere', 'Premiere of a student-written comedy.',
     'performance', interval '5 hours', interval '2 hours', 'pl', false, false, 30, 0, 'theater', 'Europe/Warsaw'),
    ('e1000000-0000-4000-8000-000000000005'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-chatka', 'Chatka Żaka', 'Radziszewskiego 16, Lublin', 51.24590, 22.54250,
     'Indie Film Night', 'Screening of three short films followed by a Q&A.',
     'screening', interval '-1 hour 30 minutes', interval '1 hour', 'en', true, true, 22, 8, 'theater', 'Europe/Warsaw'),
    -- ── Lublin: campus (UMCS / KUL), ends soon or later today
    ('e1000000-0000-4000-8000-000000000006'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-umcs', 'Plac Marii Curie-Skłodowskiej', 'Plac M. Curie-Skłodowskiej 5, Lublin', 51.24633, 22.54100,
     'Erasmus Welcome Picnic', 'Meet other international students over food and games.',
     'party', interval '10 hours', interval '3 hours', 'multilingual', true, true, 40, 0, 'cafe', 'Europe/Warsaw'),
    ('e1000000-0000-4000-8000-000000000007'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-kul', 'KUL Aula', 'Al. Racławickie 14, Lublin', 51.24938, 22.54563,
     'Science Slam', 'Researchers explain their work in 10 minutes or less.',
     'lecture', interval '20 hours', interval '2 hours', 'en', true, true, 15, 0, 'museum', 'Europe/Warsaw'),
    -- ── Lublin: far from centre, weak signal
    ('e1000000-0000-4000-8000-000000000008'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-zalew', 'Zalew Zemborzycki', 'Krężnicka, Lublin', 51.20530, 22.53150,
     'Sunset Run by the Lake', 'A relaxed 5 km social run.',
     'sports', interval '22 hours', interval '1 hour 30 minutes', 'multilingual', true, true, 6, 0, 'cafe', 'Europe/Warsaw'),
    -- ── Lublin: outside the heat window (lists only)
    ('e1000000-0000-4000-8000-000000000009'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-filharmonia', 'Filharmonia Lubelska', 'Marii Curie-Skłodowskiej 5, Lublin', 51.24410, 22.54760,
     'Symphony for Students', 'Discounted evening concert with the Lublin Philharmonic.',
     'concert', interval '3 days', interval '2 hours', 'pl', false, false, 55, 0, 'theater', 'Europe/Warsaw'),
    ('e1000000-0000-4000-8000-000000000010'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-skansen', 'Muzeum Wsi Lubelskiej', 'Warszawska 96, Lublin', 51.26450, 22.48620,
     'Folk Craft Fair', 'Traditional crafts, food and music in the open-air museum.',
     'market', interval '6 days', interval '6 hours', 'multilingual', false, true, 33, 0, 'museum', 'Europe/Warsaw'),
    ('e1000000-0000-4000-8000-000000000011'::uuid, '1a7fd12e-7340-4ab1-bde7-7dfb13860250'::uuid,
     'lublin', 'heat-lublin-centrum-kultury', 'Centrum Kultury', 'Peowiaków 12, Lublin', 51.24660, 22.55880,
     'Morning Yoga Class', 'Ended a few hours ago — should not appear on the heatmap.',
     'sports', interval '-6 hours', interval '1 hour', 'en', true, true, 12, 10, 'cafe', 'Europe/Warsaw'),

    -- ── Leuven: Oude Markt hotspot
    ('e2000000-0000-4000-8000-000000000001'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-oude-markt', 'Oude Markt', 'Oude Markt, Leuven', 50.87710, 4.70040,
     'Oude Markt Live', 'Bands on a pop-up stage on the longest bar in Europe.',
     'concert', interval '-30 minutes', interval '3 hours', 'multilingual', true, true, 60, 27, 'theater', 'Europe/Brussels'),
    ('e2000000-0000-4000-8000-000000000002'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-grote-markt', 'Grote Markt', 'Grote Markt, Leuven', 50.87870, 4.70120,
     'Town Hall Light Show', 'Projection mapping on the Gothic town hall facade.',
     'exhibition', interval '1 hour 30 minutes', interval '1 hour', 'multilingual', true, true, 45, 0, 'museum', 'Europe/Brussels'),
    ('e2000000-0000-4000-8000-000000000003'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-sint-pieter', 'Sint-Pieterskerk', 'Grote Markt 1, Leuven', 50.87900, 4.70060,
     'Organ Evening', 'A short organ recital in St. Peter''s Church.',
     'concert', interval '3 hours', interval '1 hour', 'nl', false, false, 14, 0, 'theater', 'Europe/Brussels'),
    -- ── Leuven: station area (medium)
    ('e2000000-0000-4000-8000-000000000004'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-30cc', '30CC Wagehuys', 'Brusselsestraat 63, Leuven', 50.88010, 4.69560,
     'Improv Comedy Jam', 'English-language improv with audience suggestions.',
     'performance', interval '6 hours', interval '2 hours', 'en', false, true, 25, 0, 'theater', 'Europe/Brussels'),
    ('e2000000-0000-4000-8000-000000000005'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-station', 'Martelarenplein', 'Martelarenplein, Leuven', 50.88140, 4.71550,
     'Bike Repair Café', 'Bring your bike — volunteers help you fix it.',
     'workshop', interval '-2 hours 30 minutes', interval '2 hours', 'multilingual', true, true, 10, 9, 'cafe', 'Europe/Brussels'),
    -- ── Leuven: Arenberg campus (Heverlee)
    ('e2000000-0000-4000-8000-000000000006'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-arenberg', 'Arenberg Castle', 'Kasteelpark Arenberg 1, Heverlee', 50.86290, 4.68570,
     'Castle Park Picnic', 'International student picnic in the castle gardens.',
     'party', interval '12 hours', interval '3 hours', 'multilingual', true, true, 35, 0, 'cafe', 'Europe/Brussels'),
    ('e2000000-0000-4000-8000-000000000007'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-alma3', 'Alma 3', 'Kasteelpark Arenberg 3, Heverlee', 50.86440, 4.68330,
     'Engineering Career Talk', 'Alumni share how they landed their first job.',
     'lecture', interval '19 hours', interval '1 hour 30 minutes', 'en', true, true, 16, 0, 'museum', 'Europe/Brussels'),
    -- ── Leuven: Kessel-Lo, weak signal
    ('e2000000-0000-4000-8000-000000000008'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-kessel-lo', 'Provinciedomein Kessel-Lo', 'Holsbeeksesteenweg, Kessel-Lo', 50.89120, 4.72100,
     'Park Run', 'An easy-paced 5 km run around the lake.',
     'sports', interval '23 hours', interval '1 hour', 'multilingual', true, true, 5, 0, 'cafe', 'Europe/Brussels'),
    -- ── Leuven: outside the heat window (lists only)
    ('e2000000-0000-4000-8000-000000000009'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-het-depot', 'Het Depot', 'Martelarenplein 12, Leuven', 50.88080, 4.71450,
     'Indie Rock Night', 'Three up-and-coming Belgian bands.',
     'concert', interval '4 days', interval '3 hours', 'en', false, true, 70, 0, 'theater', 'Europe/Brussels'),
    ('e2000000-0000-4000-8000-000000000010'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-begijnhof', 'Groot Begijnhof', 'Groot Begijnhof, Leuven', 50.87180, 4.69760,
     'Heritage Photo Walk', 'Photograph the UNESCO-listed beguinage with a local guide.',
     'exhibition', interval '8 days', interval '2 hours', 'en', true, true, 21, 0, 'museum', 'Europe/Brussels'),
    ('e2000000-0000-4000-8000-000000000011'::uuid, '882ff6f0-6800-4316-b4b9-4b8ca9512c73'::uuid,
     'leuven', 'heat-leuven-library-cafe', 'Library Café', 'Monseigneur Ladeuzeplein 21, Leuven', 50.87870, 4.70000,
     'Language Exchange Brunch', 'Ended a few hours ago — should not appear on the heatmap.',
     'other', interval '-7 hours', interval '2 hours', 'multilingual', true, true, 18, 15, 'cafe', 'Europe/Brussels')
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
    language, is_free, is_international,
    interested_count, attendee_count, image_kind
  from event_seed
)
insert into public.organizer_events (
  id, organizer_user_id, city_key, venue_key, venue_name, venue_address,
  venue_latitude, venue_longitude, title, description, category,
  date_label, end_date_label, time_label, end_time_label, starts_at, ends_at,
  language, is_free, is_international,
  interested_count, attendee_count, image_kind,
  xp_bonus, qc_bonus, status, reviewed_by, reviewed_at
)
select
  prepared_events.*,
  50, 5, 'approved', 'c6d0fd6f-c5fc-4466-a6c9-f37c1b73dfac'::uuid, now()
from prepared_events
on conflict (id) do update set
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

commit;

select
  city_key,
  count(*) as heatmap_demo_events,
  count(*) filter (where starts_at <= now() and ends_at >= now()) as live_now,
  count(*) filter (where starts_at > now() and starts_at <= now() + interval '24 hours') as next_24h
from public.organizer_events
where id::text like 'e_00%'
group by city_key
order by city_key;
