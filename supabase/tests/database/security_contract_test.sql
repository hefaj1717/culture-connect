begin;

select plan(16);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_notifications'::regclass),
  'user_notifications has RLS enabled'
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

select * from finish();
rollback;
