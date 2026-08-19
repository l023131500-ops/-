-- Close self-privilege-escalation hole on public.profiles.
--
-- profiles_self_update (20260610191501) allows any authenticated user to
-- update their own profile row with USING/WITH CHECK (auth_user_id = auth.uid())
-- only -- it does not restrict which columns change. Since it is the ONLY
-- UPDATE policy on this table, any signed-in tenant member (agent/viewer) can
-- call `update({ role: 'admin' })` on their own profile id and self-promote,
-- exactly the id/role pair the UsersTab role dropdown in settings.tsx sends
-- for every row it renders, including the caller's own.
--
-- This does not open up cross-user role changes (still blocked by the
-- self_update USING clause, auth_user_id = auth.uid()) -- an admin still
-- cannot change a teammate's role through this policy. That remains a
-- separate, non-security follow-up (feature gap, not a hole): see
-- DECISIONS.md for this migration's entry.

CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'only a tenant admin can change a member role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_role_change_trg ON public.profiles;
CREATE TRIGGER guard_profile_role_change_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_change();
