-- Organizers may revise their own public content, but every revision becomes
-- pending again. A short note is held until the revised event is approved.
ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS organizer_update_message text;

ALTER TABLE public.organizer_rewards
  ADD COLUMN IF NOT EXISTS review_previous_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS organizer_update_message text;

ALTER TABLE public.organizer_events
  DROP CONSTRAINT IF EXISTS organizer_events_organizer_update_message_length;
ALTER TABLE public.organizer_events
  ADD CONSTRAINT organizer_events_organizer_update_message_length
  CHECK (organizer_update_message IS NULL OR char_length(organizer_update_message) <= 500);

-- A note on its own is also a revision, so it must never bypass moderation.
DROP TRIGGER IF EXISTS organizer_events_force_review_on_owner_update ON public.organizer_events;
CREATE TRIGGER organizer_events_force_review_on_owner_update
  BEFORE UPDATE OF city_key, venue_key, venue_name, venue_address, venue_latitude,
    venue_longitude, title, description, category, date_label, end_date_label,
    time_label, end_time_label, starts_at, ends_at, language, is_free,
    is_international, image_kind, image_url, organizer_update_message
  ON public.organizer_events
  FOR EACH ROW EXECUTE FUNCTION public.force_organizer_event_review_on_owner_update();

ALTER TABLE public.organizer_rewards
  DROP CONSTRAINT IF EXISTS organizer_rewards_organizer_update_message_length;
ALTER TABLE public.organizer_rewards
  ADD CONSTRAINT organizer_rewards_organizer_update_message_length
  CHECK (organizer_update_message IS NULL OR char_length(organizer_update_message) <= 500);

DROP POLICY IF EXISTS "Approved organizers can update unreviewed own rewards" ON public.organizer_rewards;
DROP POLICY IF EXISTS "Approved organizers can resubmit own rewards" ON public.organizer_rewards;
CREATE POLICY "Approved organizers can resubmit own rewards"
  ON public.organizer_rewards FOR UPDATE TO authenticated
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

CREATE OR REPLACE FUNCTION public.force_organizer_reward_review_on_owner_update()
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
        'description', OLD.description,
        'place_name', OLD.place_name,
        'place_address', OLD.place_address,
        'category', OLD.category,
        'available_days', OLD.available_days,
        'available_from', OLD.available_from,
        'available_until', OLD.available_until,
        'available_start_time', OLD.available_start_time,
        'available_end_time', OLD.available_end_time
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

REVOKE EXECUTE ON FUNCTION public.force_organizer_reward_review_on_owner_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS organizer_rewards_force_review_on_owner_update ON public.organizer_rewards;
CREATE TRIGGER organizer_rewards_force_review_on_owner_update
  BEFORE UPDATE OF title, description, category, place_key, place_name, place_address,
    available_days, available_from, available_until, available_start_time,
    available_end_time, organizer_update_message ON public.organizer_rewards
  FOR EACH ROW EXECUTE FUNCTION public.force_organizer_reward_review_on_owner_update();

-- Append the organizer's public explanation only after the revised event is
-- approved. The old implementation already computes the changed fields.
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
  notification_body text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' AND OLD.review_previous_snapshot IS NOT NULL THEN
    previous_snapshot := OLD.review_previous_snapshot;
  ELSIF OLD.status = 'approved' AND NEW.status = 'approved' THEN
    previous_snapshot := to_jsonb(OLD);
  ELSE
    RETURN NEW;
  END IF;

  IF previous_snapshot ->> 'title' IS DISTINCT FROM NEW.title THEN changed_fields := array_append(changed_fields, 'title'); END IF;
  IF previous_snapshot ->> 'date_label' IS DISTINCT FROM NEW.date_label
     OR (previous_snapshot ? 'end_date_label' AND previous_snapshot ->> 'end_date_label' IS DISTINCT FROM NEW.end_date_label)
     OR (previous_snapshot ? 'starts_at' AND previous_snapshot ->> 'starts_at' IS DISTINCT FROM NEW.starts_at::text)
     OR (previous_snapshot ? 'ends_at' AND previous_snapshot ->> 'ends_at' IS DISTINCT FROM NEW.ends_at::text) THEN changed_fields := array_append(changed_fields, 'date'); END IF;
  IF previous_snapshot ->> 'time_label' IS DISTINCT FROM NEW.time_label
     OR (previous_snapshot ? 'end_time_label' AND previous_snapshot ->> 'end_time_label' IS DISTINCT FROM NEW.end_time_label) THEN changed_fields := array_append(changed_fields, 'time'); END IF;
  IF previous_snapshot ->> 'venue_name' IS DISTINCT FROM NEW.venue_name OR previous_snapshot ->> 'venue_address' IS DISTINCT FROM NEW.venue_address THEN changed_fields := array_append(changed_fields, 'location'); END IF;
  IF previous_snapshot ->> 'category' IS DISTINCT FROM NEW.category THEN changed_fields := array_append(changed_fields, 'category'); END IF;
  IF previous_snapshot ->> 'description' IS DISTINCT FROM NEW.description THEN changed_fields := array_append(changed_fields, 'details'); END IF;
  IF previous_snapshot ? 'is_free' AND previous_snapshot ->> 'is_free' IS DISTINCT FROM NEW.is_free::text THEN changed_fields := array_append(changed_fields, 'admission'); END IF;
  IF cardinality(changed_fields) = 0
    AND NULLIF(btrim(COALESCE(NEW.organizer_update_message, '')), '') IS NULL
  THEN RETURN NEW; END IF;

  change_summary := array_to_string(changed_fields, ', ');
  notification_body := CASE
    WHEN cardinality(changed_fields) > 0 THEN NEW.title || ' changed: ' || change_summary || '.'
    ELSE 'The organizer shared an update about ' || NEW.title || '.'
  END;
  IF NULLIF(btrim(COALESCE(NEW.organizer_update_message, '')), '') IS NOT NULL THEN
    notification_body := notification_body || ' Note from the organizer: ' || NEW.organizer_update_message;
  END IF;

  INSERT INTO public.user_notifications (user_id, event_id, type, title, body)
  SELECT response.user_id, NEW.id, 'event_details_updated', 'An event you saved was updated', notification_body
  FROM public.user_event_responses response
  WHERE response.event_id = NEW.id
    AND response.status IN ('interested', 'going')
    AND response.user_id <> NEW.organizer_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizer_events_notify_attendees_of_changes ON public.organizer_events;
CREATE TRIGGER organizer_events_notify_attendees_of_changes
  AFTER UPDATE OF status, title, description, category, date_label, end_date_label, time_label,
    end_time_label, starts_at, ends_at, venue_name, venue_address, venue_latitude,
    venue_longitude, is_free, organizer_update_message ON public.organizer_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_attendees_of_event_changes();
