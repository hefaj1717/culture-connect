-- Trigger functions are invoked by PostgreSQL, never by the public API.
REVOKE EXECUTE ON FUNCTION public.refresh_organizer_event_response_counts_trigger()
  FROM PUBLIC, anon, authenticated;
