begin;

select plan(45);

select ok(
  to_regprocedure('public.get_my_digital_passport_progress()') is not null,
  'passport progress is calculated by a server-side RPC'
);

select is(
  has_function_privilege(
    'anon',
    'public.get_my_digital_passport_progress()'::regprocedure,
    'EXECUTE'
  ),
  false,
  'anonymous callers cannot read passport progress'
);

select ok(
  to_regprocedure('public.finalize_university_leaderboard_season(text,text)') is not null,
  'an admin-only RPC finalizes an immutable university ranking season'
);

select is(
  has_function_privilege(
    'anon',
    'public.finalize_university_leaderboard_season(text,text)'::regprocedure,
    'EXECUTE'
  ),
  false,
  'anonymous callers cannot finalize a university ranking season'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_university_leaderboard_awards'::regclass),
  'university ranking awards have RLS enabled'
);

select ok(
  to_regprocedure('public.get_university_profile_summary(text)') is not null,
  'university profiles use an aggregate-only RPC'
);

select is(
  has_function_privilege('anon', 'public.get_university_profile_summary(text)'::regprocedure, 'EXECUTE'),
  false,
  'anonymous callers cannot read university profile aggregates'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'total_qc'
  ),
  'profiles maintain a spendable QC balance separately from permanent XP'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.qc_transactions'::regclass),
  'QC transaction ledger has RLS enabled'
);

select is(
  has_table_privilege('authenticated', 'public.qc_transactions', 'INSERT'),
  false,
  'clients cannot write QC ledger entries directly'
);

select is(
  has_function_privilege(
    'anon',
    'public.award_qc_for_xp_earn()'::regprocedure,
    'EXECUTE'
  ),
  false,
  'anonymous callers cannot invoke the QC award trigger function'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_notifications'::regclass),
  'user_notifications has RLS enabled'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_notifications' and column_name = 'reward_id'
  ),
  'notifications can retain a reference to the moderated reward'
);

select ok(
  to_regprocedure('public.notify_organizer_of_admin_reward_update()') is not null,
  'reward moderation notifications are generated server-side'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.organizer_rewards'::regclass
      and tgname = 'organizer_rewards_notify_admin_update'
      and not tgisinternal
  ),
  'admin reward updates trigger organizer notifications'
);

select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'organizer_rewards'
  ),
  'approved rewards can be refreshed in real time after moderation'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_notifications'
      and policyname in ('Users view their own notifications', 'Users mark their own notifications read')
  ),
  2,
  'notifications keep their owner-only read policies'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_notifications'
      and cmd = 'INSERT'
  ),
  0,
  'no RLS policy lets clients create arbitrary notifications'
);

select ok(
  to_regprocedure('public.confirm_organizer_event_attendance(uuid,text,double precision,double precision)') is not null,
  'check-in RPC exists with server-validated inputs'
);

select ok(
  to_regprocedure('public.complete_quest(uuid,text)') is not null,
  'quest completion RPC requires a completion proof'
);

select ok(
  to_regprocedure('public.redeem_organizer_reward(uuid)') is not null,
  'reward redemption RPC exists'
);

select ok(
  (select reloptions @> array['security_invoker=true']
   from pg_class
   where oid = 'public.quest_completion_stats'::regclass),
  'quest completion stats view uses the caller security context'
);

select ok(
  to_regprocedure('public.get_approved_quest_completion_stats(uuid[])') is not null,
  'approved quest completion totals are exposed only through a narrow RPC'
);

select is(
  has_function_privilege(
    'anon',
    'public.get_approved_quest_completion_stats(uuid[])'::regprocedure,
    'EXECUTE'
  ),
  false,
  'anonymous callers cannot read quest completion totals'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('organizer_event_checkin_secrets', 'quest_completion_secrets')
      and policyname like 'Deny direct access to % secrets'
  ),
  2,
  'QR secret tables have explicit deny-all policies'
);

select is(
  has_table_privilege('authenticated', 'public.organizer_event_checkin_secrets', 'SELECT'),
  false,
  'authenticated callers cannot read event check-in secrets directly'
);

select is(
  has_table_privilege('authenticated', 'public.quest_completion_secrets', 'SELECT'),
  false,
  'authenticated callers cannot read quest completion secrets directly'
);

select is(
  has_function_privilege(
    'anon',
    'public.refresh_organizer_event_response_counts_trigger()'::regprocedure,
    'EXECUTE'
  ),
  false,
  'anonymous callers cannot execute the internal response-count trigger'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.refresh_organizer_event_response_counts_trigger()'::regprocedure,
    'EXECUTE'
  ),
  false,
  'authenticated callers cannot execute the internal response-count trigger'
);

select is(
  has_function_privilege(
    'anon',
    'public.redeem_reward(uuid)'::regprocedure,
    'EXECUTE'
  ),
  false,
  'anonymous callers cannot execute the retired reward RPC'
);

select ok(
  to_regprocedure('public.check_in_at_event(uuid,double precision,double precision)') is null,
  'the retired legacy event check-in RPC is removed'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizer_events'
      and column_name = 'organizer_update_message'
  ),
  'event revisions can retain an organizer message until approval'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizer_rewards'
      and column_name = 'review_previous_snapshot'
  ),
  'reward revisions retain a review snapshot'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.organizer_rewards'::regclass
      and tgname = 'organizer_rewards_force_review_on_owner_update'
      and not tgisinternal
  ),
  'organizer reward updates are forced back into review'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Event images are publicly readable',
        'Quest images are publicly readable'
      )
  ),
  0,
  'public image buckets cannot be enumerated through storage SELECT policies'
);

select is(
  has_column_privilege('authenticated', 'public.user_notifications', 'read_at', 'UPDATE'),
  true,
  'users can mark notifications as read'
);

select is(
  has_column_privilege('authenticated', 'public.user_notifications', 'body', 'UPDATE'),
  false,
  'users cannot rewrite trusted notification content'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_event_responses'
      and policyname in (
        'Users view their own event responses',
        'Users create RSVP responses for approved events',
        'Users update RSVP responses for approved events',
        'Users delete their own event responses'
      )
  ),
  4,
  'RSVP access is split into least-privilege policies'
);

select ok(
  (
    select with_check like '%interested%going%'
      and with_check not like '%attended%'
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_event_responses'
      and policyname = 'Users create RSVP responses for approved events'
  ),
  'clients cannot create attended responses without the QR check-in RPC'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.organizer_events'::regclass
      and tgname = 'organizer_events_force_review_on_owner_update'
      and tgattr = ''::int2vector
      and not tgisinternal
  ),
  'every organizer event update passes through the server-owned field guard'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.organizer_rewards'::regclass
      and tgname = 'organizer_rewards_force_review_on_owner_update'
      and tgattr = ''::int2vector
      and not tgisinternal
  ),
  'every organizer reward update passes through the server-owned field guard'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.enforce_organizer_event_insert_defaults()'::regprocedure,
    'EXECUTE'
  ),
  false,
  'clients cannot invoke the organizer event insert guard directly'
);

select ok(
  position(
    'membership.status = ''verified'''
    in pg_get_functiondef('public.university_leaderboard_by_city(text)'::regprocedure)
  ) > 0
  and position(
    'pending'
    in pg_get_functiondef('public.university_leaderboard_by_city(text)'::regprocedure)
  ) = 0,
  'only verified students contribute to the university leaderboard'
);

select is(
  (
    with foreign_keys as (
      select conrelid, conkey
      from pg_constraint
      where contype = 'f' and connamespace = 'public'::regnamespace
    ), indexes as (
      select indrelid, indkey
      from pg_index
      where indisvalid
    )
    select count(*)::integer
    from foreign_keys
    where not exists (
      select 1
      from indexes
      where indexes.indrelid = foreign_keys.conrelid
        and (indexes.indkey::smallint[])[0:cardinality(foreign_keys.conkey) - 1]
          @> foreign_keys.conkey
    )
  ),
  0,
  'every public foreign key has a supporting index'
);

select is(
  to_regclass('public.idx_xp_transactions_user_source_key'),
  null,
  'the duplicate XP source-key index is removed'
);

select * from finish();
rollback;
