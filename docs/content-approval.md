# CultureQuest content approval

Organizer-created events and rewards are submitted as `pending`.
Students only see rows with `status = 'approved'`.
Quests are curated by CultureQuest/admins only.

## Approve an organizer event

In Supabase SQL Editor, replace the id and run:

```sql
update public.organizer_events
set
  status = 'approved',
  reviewed_at = now(),
  reviewed_by = null,
  rejection_reason = null
where id = 'EVENT_ID_HERE';
```

## Reject an organizer event

```sql
update public.organizer_events
set
  status = 'rejected',
  reviewed_at = now(),
  reviewed_by = null,
  rejection_reason = 'Reason shown internally'
where id = 'EVENT_ID_HERE';
```

## Approve an organizer reward

```sql
update public.organizer_rewards
set
  status = 'approved',
  reviewed_at = now(),
  reviewed_by = null,
  rejection_reason = null
where id = 'REWARD_ID_HERE';
```

## Reject an organizer reward

```sql
update public.organizer_rewards
set
  status = 'rejected',
  reviewed_at = now(),
  reviewed_by = null,
  rejection_reason = 'Reason shown internally'
where id = 'REWARD_ID_HERE';
```

## Create an approved quest

Admin users can create quests from the app Profile tab after the
`20260726133000_add_quest_image_uploads.sql` migration has been applied.
Persistent XP requires `20260726134500_persistent_xp_transactions.sql`.

```sql
with created_quest as (
  insert into public.quests (
    city_key,
    title,
    theme,
    description,
    total_xp,
    image_kind,
    status,
    created_by
  )
  values (
    'lublin',
    'Old Town Culture Trail',
    'City route',
    'A curated CultureQuest route through partner venues and cultural stops.',
    200,
    'museum',
    'approved',
    null
  )
  returning id
)
insert into public.quest_stops (quest_id, position, title, description, eta)
select id, 1, 'Start at Lublin Castle', 'Check the opening stop and route context.', '6 min'
from created_quest
union all
select id, 2, 'Old Town checkpoint', 'Find the next cultural marker near the main route.', '10 min'
from created_quest
union all
select id, 3, 'Partner cafe finish', 'Finish the route at a partner venue.', '8 min'
from created_quest;
```

Use `city_key = 'leuven'` for Leuven quests.
