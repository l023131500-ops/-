-- Let a real tenant admin change a teammate's role -- currently impossible.
--
-- The previous migration (20260819230000_guard_profile_role_change.sql) closed
-- the self-privilege-escalation hole but explicitly left this gap open: the
-- ONLY UPDATE policy on public.profiles (profiles_self_update) restricts
-- USING/WITH CHECK to `auth_user_id = auth.uid()`, so even a genuine tenant
-- admin gets a silent RLS failure (settings.tsx UsersTab shows "עדכון נכשל")
-- when trying to change someone ELSE's role from the "משתמשי הארגון" table --
-- the exact "admin can manage the team" feature the screen advertises.
--
-- A new SECURITY DEFINER RPC (not a new RLS policy) is required because RLS
-- is row-level, not column-level: there is no USING/WITH CHECK expression that
-- says "the caller may update this OTHER row's `role` column only," short of
-- unsafe subqueries comparing against the pre-update value.
CREATE OR REPLACE FUNCTION public.admin_update_member_role(p_profile_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_tenant_id UUID;
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'only a tenant admin can change a member role';
  END IF;

  SELECT tenant_id INTO _target_tenant_id FROM public.profiles WHERE id = p_profile_id;
  IF _target_tenant_id IS NULL OR _target_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'target profile not found in your tenant';
  END IF;

  UPDATE public.profiles SET role = p_role::public.app_role WHERE id = p_profile_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_member_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_member_role(UUID, TEXT) TO authenticated;
