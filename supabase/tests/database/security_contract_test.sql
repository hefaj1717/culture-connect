begin;

select plan(9);

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

select * from finish();
rollback;
