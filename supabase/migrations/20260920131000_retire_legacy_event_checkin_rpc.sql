-- The original events table is no longer part of the product. Remove its old
-- SECURITY DEFINER endpoint instead of leaving a callable path for future data.
DROP FUNCTION IF EXISTS public.check_in_at_event(uuid, double precision, double precision);
