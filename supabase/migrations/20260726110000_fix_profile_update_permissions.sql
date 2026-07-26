-- ============================================================
-- PROFILE UPDATE PERMISSIONS
-- ============================================================
-- Re-applies explicit grants/policies for profile editing after RBAC hardening.

GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, username, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (username, avatar_url) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can insert their own profile"
  ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update their own profile"
  ON public.profiles;

CREATE POLICY "Users update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
