-- The inbox is private: Realtime delivery remains subject to the table's RLS
-- "Users view their own notifications" policy. Adding it to this publication
-- lets the signed-in app receive new rows without polling or reopening Home.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
END;
$$;

-- Future UPDATE subscriptions (for example, synchronising read state across
-- devices) need both versions of a row. It does not relax table RLS.
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
