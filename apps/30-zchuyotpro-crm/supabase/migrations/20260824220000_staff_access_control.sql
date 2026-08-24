-- Staff access control (flagship spec item 6 — "full permission control:
-- define what each manager/member is exposed to").
--
-- Closes real holes found by audit:
--   * profiles_self_update had no column guard — any agent/viewer could set
--     role='admin' on their own row (privilege escalation).
--   * handle_new_user trusted tenant_id from signup metadata — anyone crafting
--     metadata could join any tenant as staff and read all its client data.
--   * profiles_tenant_insert let any member insert arbitrary-role profiles.
--   * The settings screen's role select silently updated 0 rows (RLS only
--     allowed self-update) while showing a success toast.
--   * Every member — including viewers — could rewrite tenants.settings
--     (integration secrets, live-mode switches, module config).
--   * Viewers could write/delete every staff table.
--
-- Adds:
--   * staff_invites — admin-created invitations. Signup claims the invite by
--     email and receives its tenant + role; metadata tenant_id alone no longer
--     joins an existing tenant (a fresh own-tenant is created instead).
--   * Role enforcement at the DB layer: admin manages members; admin/manager
--     manage tenant settings and catalogs (partners, entitlements, custom-field
--     definitions); agents write day-to-day data; viewers are read-only.
--   * Optional client scoping: tenants.settings.access.restrict_to_assigned
--     = true makes agents/viewers see only clients assigned to them (or
--     unassigned ones). Default off — existing behavior unchanged.

-- =========================================================
-- helpers
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.staff_can_manage()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() IN ('admin','manager')
$$;

CREATE OR REPLACE FUNCTION public.staff_has_write()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() IN ('admin','manager','agent')
$$;

-- True when the current staff member may see the given client's data.
-- NULL client (general rows: unmatched intake, general tasks) is visible.
-- Admin/manager always see everything in their tenant; agents/viewers are
-- limited to assigned-or-unassigned clients only when the tenant opted in
-- via settings.access.restrict_to_assigned.
CREATE OR REPLACE FUNCTION public.staff_sees_client(_client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _client_id IS NULL
    OR public.staff_can_manage()
    OR NOT COALESCE(
         (SELECT (t.settings->'access'->>'restrict_to_assigned')::boolean
            FROM public.tenants t WHERE t.id = public.get_my_tenant_id()),
         false)
    OR EXISTS (
         SELECT 1 FROM public.clients c
          WHERE c.id = _client_id
            AND (c.assigned_agent_id IS NULL
                 OR c.assigned_agent_id = public.get_my_profile_id()))
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile_id(), public.is_staff_admin(),
  public.staff_can_manage(), public.staff_has_write(),
  public.staff_sees_client(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id(), public.is_staff_admin(),
  public.staff_can_manage(), public.staff_has_write(),
  public.staff_sees_client(UUID) TO authenticated;

-- =========================================================
-- staff_invites — the only way into an existing tenant
-- =========================================================
CREATE TABLE public.staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agent',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '14 days',
  accepted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX staff_invites_pending_key
  ON public.staff_invites(tenant_id, lower(email)) WHERE accepted_at IS NULL;
CREATE INDEX staff_invites_email_idx ON public.staff_invites(lower(email));
GRANT SELECT, INSERT, DELETE ON public.staff_invites TO authenticated;
GRANT ALL ON public.staff_invites TO service_role;
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_invites_admin_select" ON public.staff_invites
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.is_staff_admin());
CREATE POLICY "staff_invites_admin_insert" ON public.staff_invites
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_staff_admin());
CREATE POLICY "staff_invites_admin_delete" ON public.staff_invites
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.is_staff_admin());

-- =========================================================
-- signup: honor invites; stop trusting metadata tenant_id
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _tenant_name TEXT;
  _full_name TEXT;
  _role public.app_role := 'admin';
  _invite public.staff_invites%ROWTYPE;
BEGIN
  _tenant_name := NEW.raw_user_meta_data->>'tenant_name';
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  SELECT * INTO _invite
    FROM public.staff_invites
   WHERE lower(email) = lower(NEW.email)
     AND accepted_at IS NULL
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1;

  IF FOUND THEN
    _tenant_id := _invite.tenant_id;
    _role := _invite.role;
    UPDATE public.staff_invites SET accepted_at = now() WHERE id = _invite.id;
  ELSE
    -- No invite: always a fresh own tenant. raw metadata tenant_id is
    -- deliberately ignored — it used to grant staff access to any tenant.
    INSERT INTO public.tenants(name)
      VALUES (COALESCE(NULLIF(_tenant_name, ''), _full_name || ' Organization'))
      RETURNING id INTO _tenant_id;
  END IF;

  INSERT INTO public.profiles(tenant_id, auth_user_id, full_name, role)
    VALUES (_tenant_id, NEW.id, _full_name, _role);

  RETURN NEW;
END;
$$;

-- =========================================================
-- profiles: column guard + real admin management
-- =========================================================
-- Privileged columns may only change under a tenant admin's session.
-- auth.uid() IS NULL covers service_role / internal (definer) contexts.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    IF NOT public.is_staff_admin() OR OLD.tenant_id <> public.get_my_tenant_id() THEN
      RAISE EXCEPTION 'only a tenant admin may change roles or permissions';
    END IF;
    IF OLD.auth_user_id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'admins cannot change their own role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_privilege_guard ON public.profiles;
CREATE TRIGGER trg_profiles_privilege_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- Admins can now actually update tenant members (the role select in settings
-- silently updated 0 rows before). The trigger above keeps it column-safe.
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_staff_admin() AND tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Removing a member: admin only, never yourself (so a tenant cannot end up
-- with zero admins by self-removal).
CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_staff_admin()
         AND tenant_id = public.get_my_tenant_id()
         AND auth_user_id IS DISTINCT FROM auth.uid());

-- Member-created profiles: admin only. handle_new_user is SECURITY DEFINER
-- (table owner) and bypasses RLS, so signup keeps working.
DROP POLICY "profiles_tenant_insert" ON public.profiles;
CREATE POLICY "profiles_tenant_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_admin() AND tenant_id = public.get_my_tenant_id());

-- =========================================================
-- tenants: settings hold integration secrets and live-mode
-- switches — writable by admin/manager only
-- =========================================================
DROP POLICY "tenant_self_update" ON public.tenants;
CREATE POLICY "tenant_manage_update" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_my_tenant_id() AND public.staff_can_manage())
  WITH CHECK (id = public.get_my_tenant_id() AND public.staff_can_manage());

-- =========================================================
-- clients: viewer read-only + optional assigned-only scoping
-- =========================================================
DROP POLICY "clients_tenant_isolation" ON public.clients;
CREATE POLICY "clients_staff_select" ON public.clients
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(id));
CREATE POLICY "clients_staff_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_has_write());
CREATE POLICY "clients_staff_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(id))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_has_write());
CREATE POLICY "clients_staff_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(id));

-- =========================================================
-- client-scoped tables: same pattern
-- =========================================================
DROP POLICY "family_tenant_isolation" ON public.client_family_members;
CREATE POLICY "family_staff_select" ON public.client_family_members
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "family_staff_insert" ON public.client_family_members
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "family_staff_update" ON public.client_family_members
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "family_staff_delete" ON public.client_family_members
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "financial_tenant_isolation" ON public.client_financial_profile;
CREATE POLICY "financial_staff_select" ON public.client_financial_profile
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "financial_staff_insert" ON public.client_financial_profile
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "financial_staff_update" ON public.client_financial_profile
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "financial_staff_delete" ON public.client_financial_profile
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "housing_tenant_isolation" ON public.client_housing_profile;
CREATE POLICY "housing_staff_select" ON public.client_housing_profile
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "housing_staff_insert" ON public.client_housing_profile
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "housing_staff_update" ON public.client_housing_profile
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "housing_staff_delete" ON public.client_housing_profile
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "vehicles_tenant_isolation" ON public.client_vehicles;
CREATE POLICY "vehicles_staff_select" ON public.client_vehicles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "vehicles_staff_insert" ON public.client_vehicles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "vehicles_staff_update" ON public.client_vehicles
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "vehicles_staff_delete" ON public.client_vehicles
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "client_ent_tenant_isolation" ON public.client_entitlements;
CREATE POLICY "client_ent_staff_select" ON public.client_entitlements
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "client_ent_staff_insert" ON public.client_entitlements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_ent_staff_update" ON public.client_entitlements
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_ent_staff_delete" ON public.client_entitlements
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "messages_tenant_isolation" ON public.messages;
CREATE POLICY "messages_staff_select" ON public.messages
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "messages_staff_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "messages_staff_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "messages_staff_delete" ON public.messages
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "documents_tenant_isolation" ON public.documents;
CREATE POLICY "documents_staff_select" ON public.documents
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "documents_staff_insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "documents_staff_update" ON public.documents
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "documents_staff_delete" ON public.documents
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "referrals_tenant_isolation" ON public.partner_referrals;
CREATE POLICY "referrals_staff_select" ON public.partner_referrals
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "referrals_staff_insert" ON public.partner_referrals
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "referrals_staff_update" ON public.partner_referrals
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "referrals_staff_delete" ON public.partner_referrals
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "tenant members manage call transcripts" ON public.call_transcripts;
CREATE POLICY "transcripts_staff_select" ON public.call_transcripts
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id) AND public.staff_sees_client(client_id));
CREATE POLICY "transcripts_staff_insert" ON public.call_transcripts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id)
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "transcripts_staff_update" ON public.call_transcripts
  FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id)
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (public.is_tenant_member(tenant_id)
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "transcripts_staff_delete" ON public.call_transcripts
  FOR DELETE TO authenticated
  USING (public.is_tenant_member(tenant_id)
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "property_media_tenant_isolation" ON public.property_media;
CREATE POLICY "property_media_staff_select" ON public.property_media
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "property_media_staff_insert" ON public.property_media
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "property_media_staff_update" ON public.property_media
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "property_media_staff_delete" ON public.property_media
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "intake_inquiries_tenant_isolation" ON public.intake_inquiries;
CREATE POLICY "intake_staff_select" ON public.intake_inquiries
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "intake_staff_insert" ON public.intake_inquiries
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_has_write());
CREATE POLICY "intake_staff_update" ON public.intake_inquiries
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_has_write());
CREATE POLICY "intake_staff_delete" ON public.intake_inquiries
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "client_transactions_tenant_isolation" ON public.client_transactions;
CREATE POLICY "client_transactions_staff_select" ON public.client_transactions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "client_transactions_staff_insert" ON public.client_transactions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_transactions_staff_update" ON public.client_transactions
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_transactions_staff_delete" ON public.client_transactions
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "client_budget_limits_tenant_isolation" ON public.client_budget_limits;
CREATE POLICY "client_budget_limits_staff_select" ON public.client_budget_limits
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "client_budget_limits_staff_insert" ON public.client_budget_limits
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_budget_limits_staff_update" ON public.client_budget_limits
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_budget_limits_staff_delete" ON public.client_budget_limits
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "client_consents_tenant_isolation" ON public.client_consents;
CREATE POLICY "client_consents_staff_select" ON public.client_consents
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "client_consents_staff_insert" ON public.client_consents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_consents_staff_update" ON public.client_consents
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_consents_staff_delete" ON public.client_consents
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "custom_field_values_tenant_isolation" ON public.custom_field_values;
CREATE POLICY "custom_field_values_staff_select" ON public.custom_field_values
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "custom_field_values_staff_insert" ON public.custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "custom_field_values_staff_update" ON public.custom_field_values
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "custom_field_values_staff_delete" ON public.custom_field_values
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

DROP POLICY "client_personal_areas_tenant_isolation" ON public.client_personal_areas;
CREATE POLICY "client_personal_areas_staff_select" ON public.client_personal_areas
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "client_personal_areas_staff_insert" ON public.client_personal_areas
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_personal_areas_staff_update" ON public.client_personal_areas
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_personal_areas_staff_delete" ON public.client_personal_areas
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

-- tasks (4 named policies; client_id nullable — general tasks stay visible)
DROP POLICY "tenant members can view tasks" ON public.tasks;
DROP POLICY "tenant members can insert tasks" ON public.tasks;
DROP POLICY "tenant members can update tasks" ON public.tasks;
DROP POLICY "tenant members can delete tasks" ON public.tasks;
CREATE POLICY "tasks_staff_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "tasks_staff_insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "tasks_staff_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "tasks_staff_delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

-- =========================================================
-- tenant-level tables
-- =========================================================
-- Catalog shaping is admin/manager: partners (incl. allowed_client_fields —
-- what a partner is exposed to), the entitlements catalog and custom-field
-- definitions define what data flows where.
DROP POLICY "partners_tenant_isolation" ON public.partners;
CREATE POLICY "partners_staff_select" ON public.partners
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "partners_manage_insert" ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());
CREATE POLICY "partners_manage_update" ON public.partners
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());
CREATE POLICY "partners_manage_delete" ON public.partners
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());

DROP POLICY "entitlements_tenant_isolation" ON public.entitlements;
CREATE POLICY "entitlements_staff_select" ON public.entitlements
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "entitlements_manage_insert" ON public.entitlements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());
CREATE POLICY "entitlements_manage_update" ON public.entitlements
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());
CREATE POLICY "entitlements_manage_delete" ON public.entitlements
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());

DROP POLICY "custom_field_definitions_tenant_isolation" ON public.custom_field_definitions;
CREATE POLICY "custom_field_definitions_staff_select" ON public.custom_field_definitions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "custom_field_definitions_manage_insert" ON public.custom_field_definitions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());
CREATE POLICY "custom_field_definitions_manage_update" ON public.custom_field_definitions
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());
CREATE POLICY "custom_field_definitions_manage_delete" ON public.custom_field_definitions
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_can_manage());

-- message templates: day-to-day tooling — any writing role
DROP POLICY "tenant members can insert templates" ON public.message_templates;
DROP POLICY "tenant members can update templates" ON public.message_templates;
DROP POLICY "tenant members can delete templates" ON public.message_templates;
CREATE POLICY "templates_staff_insert" ON public.message_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_has_write());
CREATE POLICY "templates_staff_update" ON public.message_templates
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_has_write())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.staff_has_write());
CREATE POLICY "templates_staff_delete" ON public.message_templates
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_has_write());

-- =========================================================
-- storage: uploads/deletes require a writing role (viewers and
-- portal users keep read via signed URLs; writes were staff-only flows)
-- =========================================================
DROP POLICY "client_docs_tenant_insert" ON storage.objects;
CREATE POLICY "client_docs_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
    AND public.staff_has_write()
  );
DROP POLICY "client_docs_tenant_update" ON storage.objects;
CREATE POLICY "client_docs_tenant_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
    AND public.staff_has_write()
  );
DROP POLICY "client_docs_tenant_delete" ON storage.objects;
CREATE POLICY "client_docs_tenant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
    AND public.staff_has_write()
  );
DROP POLICY "property_media_tenant_insert" ON storage.objects;
CREATE POLICY "property_media_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
    AND public.staff_has_write()
  );
DROP POLICY "property_media_tenant_update" ON storage.objects;
CREATE POLICY "property_media_tenant_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
    AND public.staff_has_write()
  );
DROP POLICY "property_media_tenant_delete" ON storage.objects;
CREATE POLICY "property_media_tenant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
    AND public.staff_has_write()
  );
