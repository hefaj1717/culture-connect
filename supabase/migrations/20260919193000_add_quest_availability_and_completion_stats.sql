-- Quest cards need a real availability window and a safe, aggregate completion count.
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS available_until date;

UPDATE public.quests
SET available_from = created_at::date
WHERE available_from IS NULL;

ALTER TABLE public.quests
  ALTER COLUMN available_from SET DEFAULT CURRENT_DATE,
  ALTER COLUMN available_from SET NOT NULL;

ALTER TABLE public.quests
  DROP CONSTRAINT IF EXISTS quests_available_dates_valid,
  ADD CONSTRAINT quests_available_dates_valid
    CHECK (available_until IS NULL OR available_until >= available_from);

CREATE INDEX IF NOT EXISTS idx_quests_city_status_availability
  ON public.quests (city_key, status, available_from, available_until);

-- This intentionally exposes only a count per quest. It never exposes user IDs
-- or completion timestamps, while allowing authenticated users to see social proof.
CREATE OR REPLACE VIEW public.quest_completion_stats
WITH (security_invoker = false)
AS
SELECT quest_id, count(*)::integer AS completion_count
FROM public.quest_completions
GROUP BY quest_id;

REVOKE ALL ON public.quest_completion_stats FROM PUBLIC, anon;
GRANT SELECT ON public.quest_completion_stats TO authenticated;
