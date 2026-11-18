-- Preserve historical audit records without preventing a user from deleting
-- their own Auth account. Personal activity tables already cascade from
-- auth.users; these two historical references previously used restrictive
-- defaults.

ALTER TABLE public.redemptions
  DROP CONSTRAINT IF EXISTS redemptions_used_by_fkey;

ALTER TABLE public.redemptions
  ADD CONSTRAINT redemptions_used_by_fkey
  FOREIGN KEY (used_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE public.university_leaderboard_seasons
  DROP CONSTRAINT IF EXISTS university_leaderboard_seasons_finalized_by_fkey;

ALTER TABLE public.university_leaderboard_seasons
  ALTER COLUMN finalized_by DROP NOT NULL;

ALTER TABLE public.university_leaderboard_seasons
  ADD CONSTRAINT university_leaderboard_seasons_finalized_by_fkey
  FOREIGN KEY (finalized_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
