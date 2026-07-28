ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS review_previous_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

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
    IF OLD.status IN ('approved', 'rejected')
      AND OLD.review_previous_snapshot IS NULL
    THEN
      NEW.review_previous_snapshot = jsonb_build_object(
        'title', OLD.title,
        'venue_name', OLD.venue_name,
        'venue_address', OLD.venue_address,
        'category', OLD.category,
        'date_label', OLD.date_label,
        'time_label', OLD.time_label,
        'end_time_label', OLD.end_time_label,
        'description', OLD.description,
        'image_url', OLD.image_url
      );
    ELSE
      NEW.review_previous_snapshot = OLD.review_previous_snapshot;
    END IF;

    NEW.status = 'pending';
    NEW.review_requested_at = now();
    NEW.reviewed_at = NULL;
    NEW.reviewed_by = NULL;
    NEW.rejection_reason = NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.force_organizer_event_review_on_owner_update()
  FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_organizer_events_pending_review_requested
  ON public.organizer_events (status, review_requested_at DESC)
  WHERE status = 'pending';
