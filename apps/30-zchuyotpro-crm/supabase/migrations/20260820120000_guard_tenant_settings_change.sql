-- Close self-privilege-escalation-style hole on public.tenants.settings.
--
-- tenant_self_update (20260610191501) allows any authenticated tenant member
-- to update their tenant's row with USING/WITH CHECK (id = get_my_tenant_id())
-- only -- it does not restrict which columns change or by which role. Since it
-- is the ONLY UPDATE policy on this table, any signed-in tenant member
-- (agent/viewer), not just admins, can call
-- `update({ settings: newSettings })` on their own tenant row -- exactly what
-- IntegrationsTab and NotificationsTab in settings.tsx do for every signed-in
-- member, with no client-side role gate either. `settings.integrations` holds
-- real credentials (`nedarim_token`, `imot_token`, `whatsapp_instance_id`,
-- `n8n_base_url`), so a non-admin member could silently redirect/disable a
-- tenant's payment or messaging integration, or a compromised low-privilege
-- account could exfiltrate/rotate those tokens -- the same class of hole as
-- the profiles.role self-escalation closed by
-- 20260819230000_guard_profile_role_change.sql, applied here to the
-- integration/notification config surface instead of the role column.
--
-- Grepped src/ for every `.from("tenants")` call: only the two `.update({
-- settings })` call sites in settings.tsx write to this table (queries.ts only
-- selects). No other write path is affected by this guard.

CREATE OR REPLACE FUNCTION public.guard_tenant_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.settings IS DISTINCT FROM OLD.settings AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'only a tenant admin can change integration/notification settings';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_tenant_settings_change_trg ON public.tenants;
CREATE TRIGGER guard_tenant_settings_change_trg
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_tenant_settings_change();
