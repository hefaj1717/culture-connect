ALTER TABLE public.organizer_events
  DROP CONSTRAINT IF EXISTS organizer_events_status_check;

UPDATE public.organizer_events
SET status = 'approved'
WHERE status = 'published';

ALTER TABLE public.organizer_events
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD CONSTRAINT organizer_events_status_check
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled'));

DROP POLICY IF EXISTS "Approved organizers can update their events"
  ON public.organizer_events;

DROP POLICY IF EXISTS "Approved organizers can update unreviewed own events"
  ON public.organizer_events;

DROP POLICY IF EXISTS "Approved organizers can resubmit own events"
  ON public.organizer_events;

CREATE POLICY "Approved organizers can resubmit own events"
  ON public.organizer_events FOR UPDATE TO authenticated
  USING (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending', 'approved', 'rejected')
  )
  WITH CHECK (
    organizer_user_id = auth.uid()
    AND public.is_approved_organizer(auth.uid())
    AND status IN ('draft', 'pending')
  );

CREATE OR REPLACE FUNCTION public.force_organizer_event_review_on_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.organizer_user_id
    AND NOT public.has_role(auth.uid(), 'admin')
  THEN
    NEW.status = 'pending';
    NEW.reviewed_at = NULL;
    NEW.reviewed_by = NULL;
    NEW.rejection_reason = NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.force_organizer_event_review_on_owner_update()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizer_events_force_review_on_owner_update
  ON public.organizer_events;

CREATE TRIGGER organizer_events_force_review_on_owner_update
  BEFORE UPDATE OF
    city_key,
    venue_key,
    venue_name,
    venue_address,
    venue_latitude,
    venue_longitude,
    title,
    description,
    category,
    date_label,
    end_time_label,
    ends_at,
    time_label,
    starts_at,
    language,
    is_free,
    is_international,
    image_kind,
    image_url
  ON public.organizer_events
  FOR EACH ROW
  EXECUTE FUNCTION public.force_organizer_event_review_on_owner_update();

CREATE INDEX IF NOT EXISTS idx_organizer_events_pending_updated
  ON public.organizer_events (status, updated_at DESC)
  WHERE status = 'pending';
