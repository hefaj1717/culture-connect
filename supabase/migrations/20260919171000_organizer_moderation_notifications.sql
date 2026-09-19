-- Let admins attach a human explanation to an edit or deletion, then deliver it privately.
ALTER TABLE public.organizer_events
  ADD COLUMN IF NOT EXISTS moderation_message text;

ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_type_check
  CHECK (type IN (
    'organizer_event_published',
    'organizer_event_updated',
    'organizer_event_deleted'
  ));

ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_event_id_fkey;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.organizer_events(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.notify_organizer_of_admin_event_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reviewed_by IS NULL
     OR NULLIF(btrim(COALESCE(NEW.moderation_message, '')), '') IS NULL
     OR NEW.moderation_message IS NOT DISTINCT FROM OLD.moderation_message THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, event_id, type, title, body)
  VALUES (
    NEW.organizer_user_id,
    NEW.id,
    'organizer_event_updated',
    'Your event was updated by CultureQuest',
    NEW.moderation_message
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_organizer_of_admin_event_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(btrim(COALESCE(OLD.moderation_message, '')), '') IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, event_id, type, title, body)
    VALUES (
      OLD.organizer_user_id,
      OLD.id,
      'organizer_event_deleted',
      'Your event was removed by CultureQuest',
      OLD.moderation_message
    );
  END IF;
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_organizer_of_admin_event_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_organizer_of_admin_event_deletion() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS organizer_events_notify_admin_update ON public.organizer_events;
CREATE TRIGGER organizer_events_notify_admin_update
  AFTER UPDATE OF moderation_message ON public.organizer_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_organizer_of_admin_event_update();

DROP TRIGGER IF EXISTS organizer_events_notify_admin_deletion ON public.organizer_events;
CREATE TRIGGER organizer_events_notify_admin_deletion
  BEFORE DELETE ON public.organizer_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_organizer_of_admin_event_deletion();
