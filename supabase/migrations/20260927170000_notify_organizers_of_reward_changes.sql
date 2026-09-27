-- Reward moderation needs the same private feedback loop as event moderation.
-- Keep the link nullable so a notification remains visible after a reward is archived or removed.
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS reward_id uuid
    REFERENCES public.organizer_rewards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_reward
  ON public.user_notifications (reward_id)
  WHERE reward_id IS NOT NULL;

ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_type_check
  CHECK (type IN (
    'organizer_event_published',
    'organizer_event_updated',
    'organizer_event_deleted',
    'organizer_announcement',
    'organizer_reward_updated',
    'organizer_reward_reviewed'
  ));

CREATE OR REPLACE FUNCTION public.notify_organizer_of_admin_reward_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields text[] := ARRAY[]::text[];
  notification_body text;
  notification_title text;
BEGIN
  -- Only an authenticated administrator may generate a moderation notification.
  -- This keeps an organizer's own edits from notifying themselves.
  IF auth.uid() IS NULL
     OR NOT public.has_role(auth.uid(), 'admin')
     OR NEW.organizer_user_id = auth.uid()
  THEN
    RETURN NEW;
  END IF;

  IF OLD.available_days IS DISTINCT FROM NEW.available_days
     OR OLD.available_from IS DISTINCT FROM NEW.available_from
     OR OLD.available_until IS DISTINCT FROM NEW.available_until
     OR OLD.available_start_time IS DISTINCT FROM NEW.available_start_time
     OR OLD.available_end_time IS DISTINCT FROM NEW.available_end_time THEN
    changed_fields := array_append(changed_fields, 'availability');
  END IF;

  IF OLD.title IS DISTINCT FROM NEW.title THEN
    changed_fields := array_append(changed_fields, 'title');
  END IF;

  IF OLD.description IS DISTINCT FROM NEW.description THEN
    changed_fields := array_append(changed_fields, 'details');
  END IF;

  IF OLD.place_name IS DISTINCT FROM NEW.place_name
     OR OLD.place_address IS DISTINCT FROM NEW.place_address THEN
    changed_fields := array_append(changed_fields, 'location');
  END IF;

  IF OLD.category IS DISTINCT FROM NEW.category THEN
    changed_fields := array_append(changed_fields, 'category');
  END IF;

  IF OLD.qc_cost IS DISTINCT FROM NEW.qc_cost THEN
    changed_fields := array_append(changed_fields, 'QC cost');
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    notification_title := CASE
      WHEN NEW.status = 'approved' THEN 'Your reward was approved'
      WHEN NEW.status = 'rejected' THEN 'Your reward was not approved'
      WHEN NEW.status = 'archived' THEN 'Your reward was archived'
      ELSE 'Your reward review was updated'
    END;
    notification_body := NEW.title || ' is now ' || NEW.status || '.';
  ELSIF cardinality(changed_fields) > 0 THEN
    notification_title := 'Your reward was updated by CultureQuest';
    notification_body := NEW.title || ' changed: ' || array_to_string(changed_fields, ', ') || '.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, reward_id, type, title, body)
  VALUES (
    NEW.organizer_user_id,
    NEW.id,
    CASE
      WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'organizer_reward_reviewed'
      ELSE 'organizer_reward_updated'
    END,
    notification_title,
    notification_body
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_organizer_of_admin_reward_update()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizer_rewards_notify_admin_update ON public.organizer_rewards;
CREATE TRIGGER organizer_rewards_notify_admin_update
  AFTER UPDATE OF status, title, description, category, place_name, place_address,
    available_days, available_from, available_until, available_start_time,
    available_end_time, qc_cost ON public.organizer_rewards
  FOR EACH ROW EXECUTE FUNCTION public.notify_organizer_of_admin_reward_update();
