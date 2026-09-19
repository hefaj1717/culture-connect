-- People who plan to attend need a clear, factual update when an event they saved changes.
ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_type_check
  CHECK (type IN (
    'event_details_updated',
    'organizer_announcement',
    'organizer_event_published',
    'organizer_event_updated',
    'organizer_event_deleted'
  ));

CREATE OR REPLACE FUNCTION public.notify_attendees_of_event_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields text[] := ARRAY[]::text[];
  change_summary text;
BEGIN
  -- Do not notify people about edits to a never-published draft or pending submission.
  IF OLD.status <> 'approved' AND NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    changed_fields := array_append(changed_fields, 'title');
  END IF;

  IF NEW.date_label IS DISTINCT FROM OLD.date_label
     OR NEW.end_date_label IS DISTINCT FROM OLD.end_date_label
     OR NEW.starts_at::date IS DISTINCT FROM OLD.starts_at::date
     OR NEW.ends_at::date IS DISTINCT FROM OLD.ends_at::date THEN
    changed_fields := array_append(changed_fields, 'date');
  END IF;

  IF NEW.time_label IS DISTINCT FROM OLD.time_label
     OR NEW.end_time_label IS DISTINCT FROM OLD.end_time_label
     OR NEW.starts_at::time IS DISTINCT FROM OLD.starts_at::time
     OR NEW.ends_at::time IS DISTINCT FROM OLD.ends_at::time THEN
    changed_fields := array_append(changed_fields, 'time');
  END IF;

  IF NEW.venue_name IS DISTINCT FROM OLD.venue_name
     OR NEW.venue_address IS DISTINCT FROM OLD.venue_address
     OR NEW.venue_latitude IS DISTINCT FROM OLD.venue_latitude
     OR NEW.venue_longitude IS DISTINCT FROM OLD.venue_longitude THEN
    changed_fields := array_append(changed_fields, 'location');
  END IF;

  IF NEW.category IS DISTINCT FROM OLD.category THEN
    changed_fields := array_append(changed_fields, 'category');
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    changed_fields := array_append(changed_fields, 'details');
  END IF;

  IF NEW.is_free IS DISTINCT FROM OLD.is_free THEN
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
  AFTER UPDATE OF title, description, category, date_label, end_date_label, time_label,
    end_time_label, starts_at, ends_at, venue_name, venue_address, venue_latitude,
    venue_longitude, is_free ON public.organizer_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_attendees_of_event_changes();
