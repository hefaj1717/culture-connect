-- The app now uses organizer_reward_redemptions. Disable the legacy rewards RPCs
-- rather than leaving a second, non-atomic redemption path callable by users.
REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_redemption_used(text) FROM PUBLIC, anon, authenticated;

-- Respect profiles RLS when selecting the organizer directory and never expose it
-- to unauthenticated callers. Approved organizers remain readable to signed-in users
-- through the existing profiles SELECT policy.
ALTER VIEW public.organizer_directory_profiles SET (security_invoker = true);
REVOKE ALL ON TABLE public.organizer_directory_profiles FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.organizer_directory_profiles TO authenticated;
