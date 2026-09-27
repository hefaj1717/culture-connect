-- Keep public reward availability in sync across accounts after moderation.
-- The guard makes the migration safe for a project where the table was already
-- added manually in the Supabase dashboard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'organizer_rewards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.organizer_rewards;
  END IF;
END;
$$;
