-- Notify attendees only once an organizer's edited event passes review again.
-- Direct edits by an administrator to an already approved event still notify
-- immediately, because they are already public.

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
      -- This snapshot is the public version against which the reviewer and
      -- attendee-notification trigger compare the resubmission.
      NEW.review_previous_snapshot = jsonb_build_object(
        'title', OLD.title,
        'venue_name', OLD.venue_name,
        'venue_address', OLD.venue_address,
        'venue_latitude', OLD.venue_latitude,
        'venue_longitude', OLD.venue_longitude,
        'category', OLD.category,
        'date_label', OLD.date_label,
        'end_date_label', OLD.end_date_label,
        'time_label', OLD.time_label,
        'end_time_label', OLD.end_time_label,
        'starts_at', OLD.starts_at,
        'ends_at', OLD.ends_at,
        'description', OLD.description,
        'is_free', OLD.is_free,
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

CREATE OR REPLACE FUNCTION public.notify_attendees_of_event_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields text[] := ARRAY[]::text[];
  change_summary text;
  previous_snapshot jsonb;
  compare_snapshot boolean := false;
BEGIN
  -- An organizer submitting edits changes approved -> pending. Those values
  -- are not public until an admin changes pending -> approved.
  IF OLD.status = 'pending'
    AND NEW.status = 'approved'
    AND OLD.review_previous_snapshot IS NOT NULL
  THEN
    compare_snapshot := true;
    previous_snapshot := OLD.review_previous_snapshot;
  ELSIF OLD.status = 'approved' AND NEW.status = 'approved' THEN
    -- An administrator can edit a public event directly; notify immediately.
    previous_snapshot := to_jsonb(OLD);
  ELSE
    RETURN NEW;
  END IF;

  IF previous_snapshot ->> 'title' IS DISTINCT FROM NEW.title THEN
    changed_fields := array_append(changed_fields, 'title');
  END IF;

  IF previous_snapshot ->> 'date_label' IS DISTINCT FROM NEW.date_label
     OR (previous_snapshot ? 'end_date_label'
       AND previous_snapshot ->> 'end_date_label' IS DISTINCT FROM NEW.end_date_label)
     OR (previous_snapshot ? 'starts_at'
       AND previous_snapshot ->> 'starts_at' IS DISTINCT FROM NEW.starts_at::text)
     OR (previous_snapshot ? 'ends_at'
       AND previous_snapshot ->> 'ends_at' IS DISTINCT FROM NEW.ends_at::text) THEN
    changed_fields := array_append(changed_fields, 'date');
  END IF;

  IF previous_snapshot ->> 'time_label' IS DISTINCT FROM NEW.time_label
     OR (previous_snapshot ? 'end_time_label'
       AND previous_snapshot ->> 'end_time_label' IS DISTINCT FROM NEW.end_time_label) THEN
    changed_fields := array_append(changed_fields, 'time');
  END IF;

  IF previous_snapshot ->> 'venue_name' IS DISTINCT FROM NEW.venue_name
     OR previous_snapshot ->> 'venue_address' IS DISTINCT FROM NEW.venue_address
     OR (previous_snapshot ? 'venue_latitude'
       AND previous_snapshot ->> 'venue_latitude' IS DISTINCT FROM NEW.venue_latitude::text)
     OR (previous_snapshot ? 'venue_longitude'
       AND previous_snapshot ->> 'venue_longitude' IS DISTINCT FROM NEW.venue_longitude::text) THEN
    changed_fields := array_append(changed_fields, 'location');
  END IF;

  IF previous_snapshot ->> 'category' IS DISTINCT FROM NEW.category THEN
    changed_fields := array_append(changed_fields, 'category');
  END IF;

  IF previous_snapshot ->> 'description' IS DISTINCT FROM NEW.description THEN
    changed_fields := array_append(changed_fields, 'details');
  END IF;

  IF previous_snapshot ? 'is_free'
     AND previous_snapshot ->> 'is_free' IS DISTINCT FROM NEW.is_free::text THEN
    changed_fields := array_append(changed_fields, 'admission');
  END IF;

  IF cardinality(changed_fields) = 0 THEN
    RETURN NEW;
  END IF;

  change_summary := array_to_string(changed_fields, ', ');

  INSERT INTO public.user_notifications (user_id, event_id, type, title, body)
  SELECT
    response.user_id,
    NEW.id,
    'event_details_updated',
    'An event you saved was updated',
    NEW.title || ' changed: ' || change_summary || '.'
  FROM public.user_event_responses response
  WHERE response.event_id = NEW.id
    AND response.status IN ('interested', 'going')
    AND response.user_id <> NEW.organizer_user_id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_attendees_of_event_changes()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizer_events_notify_attendees_of_changes ON public.organizer_events;
CREATE TRIGGER organizer_events_notify_attendees_of_changes
  AFTER UPDATE OF status, title, description, category, date_label, end_date_label, time_label,
    end_time_label, starts_at, ends_at, venue_name, venue_address, venue_latitude,
    venue_longitude, is_free ON public.organizer_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_attendees_of_event_changes();
