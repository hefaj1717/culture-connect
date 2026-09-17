-- These functions are invoked only by database triggers, never by the API.
REVOKE EXECUTE ON FUNCTION public.create_organizer_event_checkin_secret()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_quest_completion_secret()
  FROM PUBLIC, anon, authenticated;
