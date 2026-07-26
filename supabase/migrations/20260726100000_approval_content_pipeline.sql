-- ============================================================
-- APPROVAL-BASED CONTENT PIPELINE
-- ============================================================
-- Organizers submit events/rewards for review.
-- Users only see approved content.
-- Quests are curated by CultureQuest/admins, not free-form organizer content.

ALTER TABLE public.organizer_events
  DROP CONSTRAINT IF EXISTS organizer_events_status_check;

UPDATE public.organizer_events
SET status = 'approved'
WHERE status = 'published';

ALTER TABLE public.organizer_events
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD CONSTRAINT organizer_events_status_check
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled'));

ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

DROP POLICY IF EXISTS "Organizer events are viewable by authenticated users"
  ON public.organizer_events;

CREATE POLICY "Approved events are public and owners can view drafts"
  ON public.organizer_events FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR organizer_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Approved organizers can create events"
  ON public.organizer_events;

CREATE POLICY "Approved organizers can submit events for review"
  ON public.organizer_events FOR INSERT TO authenticated
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending')
  );

DROP POLICY IF EXISTS "Approved organizers can update their events"
  ON public.organizer_events;

CREATE POLICY "Approved organizers can update unreviewed own events"
  ON public.organizer_events FOR UPDATE TO authenticated
  USING (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending', 'rejected')
  )
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending')
  );

DROP POLICY IF EXISTS "Admins review organizer events"
  ON public.organizer_events;

CREATE POLICY "Admins review organizer events"
  ON public.organizer_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- ORGANIZER REWARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizer_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_key text NOT NULL CHECK (city_key IN ('leuven', 'lublin')),
  place_key text NOT NULL,
  place_name text NOT NULL,
  place_address text NOT NULL,
  place_latitude double precision,
  place_longitude double precision,
  title text NOT NULL,
  description text NOT NULL,
  xp_cost integer NOT NULL CHECK (xp_cost > 0 AND xp_cost <= 5000),
  category text NOT NULL DEFAULT 'cafe'
    CHECK (category IN ('cafe', 'bar', 'restaurant', 'shop', 'bookstore')),
  stock integer CHECK (stock IS NULL OR stock >= 0),
  image_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_rewards ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS organizer_rewards_set_updated_at
  ON public.organizer_rewards;

CREATE TRIGGER organizer_rewards_set_updated_at
  BEFORE UPDATE ON public.organizer_rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Approved rewards are public and owners can view drafts"
  ON public.organizer_rewards;

CREATE POLICY "Approved rewards are public and owners can view drafts"
  ON public.organizer_rewards FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR organizer_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Approved organizers can submit rewards for review"
  ON public.organizer_rewards;

CREATE POLICY "Approved organizers can submit rewards for review"
  ON public.organizer_rewards FOR INSERT TO authenticated
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending')
  );

DROP POLICY IF EXISTS "Approved organizers can update unreviewed own rewards"
  ON public.organizer_rewards;

CREATE POLICY "Approved organizers can update unreviewed own rewards"
  ON public.organizer_rewards FOR UPDATE TO authenticated
  USING (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending', 'rejected')
  )
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending')
  );

DROP POLICY IF EXISTS "Admins review organizer rewards"
  ON public.organizer_rewards;

CREATE POLICY "Admins review organizer rewards"
  ON public.organizer_rewards FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_organizer_rewards_city_status
  ON public.organizer_rewards (city_key, status);

CREATE INDEX IF NOT EXISTS idx_organizer_rewards_organizer
  ON public.organizer_rewards (organizer_user_id);

-- ============================================================
-- ADMIN-CURATED QUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_key text NOT NULL CHECK (city_key IN ('leuven', 'lublin')),
  title text NOT NULL,
  theme text NOT NULL,
  description text NOT NULL,
  total_xp integer NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  image_kind text NOT NULL DEFAULT 'museum' CHECK (image_kind IN ('museum', 'cafe', 'theater')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quest_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  eta text NOT NULL DEFAULT '5 min',
  position integer NOT NULL CHECK (position >= 1),
  venue_key text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, position)
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_stops ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS quests_set_updated_at ON public.quests;
CREATE TRIGGER quests_set_updated_at
  BEFORE UPDATE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Approved quests are viewable"
  ON public.quests;

CREATE POLICY "Approved quests are viewable"
  ON public.quests FOR SELECT TO authenticated
  USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage quests"
  ON public.quests;

CREATE POLICY "Admins manage quests"
  ON public.quests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Approved quest stops are viewable"
  ON public.quest_stops;

CREATE POLICY "Approved quest stops are viewable"
  ON public.quest_stops FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quests
      WHERE quests.id = quest_stops.quest_id
        AND (quests.status = 'approved' OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "Admins manage quest stops"
  ON public.quest_stops;

CREATE POLICY "Admins manage quest stops"
  ON public.quest_stops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_quests_city_status
  ON public.quests (city_key, status);

CREATE INDEX IF NOT EXISTS idx_quest_stops_quest_position
  ON public.quest_stops (quest_id, position);
