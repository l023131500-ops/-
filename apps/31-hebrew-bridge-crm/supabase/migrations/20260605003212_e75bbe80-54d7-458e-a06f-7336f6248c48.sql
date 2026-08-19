
-- =========================================================================
-- Security hardening migration
-- =========================================================================

-- 1. Move has_role and get_user_primary_role to a private schema
--    so they are not exposed via PostgREST API.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.get_user_primary_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'partner' THEN 2 ELSE 3 END
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_user_primary_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_primary_role(uuid) TO authenticated, service_role;

-- 2. Recreate every policy that depended on public.has_role
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage partner profiles" ON public.partner_profiles;
DROP POLICY IF EXISTS "Admins manage consents" ON public.client_consents;
DROP POLICY IF EXISTS "Admins manage visibility rules" ON public.visibility_rules;
DROP POLICY IF EXISTS "Admins manage assignments" ON public.partner_assignments;
DROP POLICY IF EXISTS "comm_logs_admin_all" ON public.communication_logs;
DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;

CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage client profiles" ON public.client_profiles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage partner profiles" ON public.partner_profiles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage consents" ON public.client_consents
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage visibility rules" ON public.visibility_rules
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage assignments" ON public.partner_assignments
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "comm_logs_admin_all" ON public.communication_logs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "tasks_admin_all" ON public.tasks
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- 3. Drop public-schema versions so they are no longer callable via API
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.get_user_primary_role(uuid);

-- 4. client_profiles — hide sensitive columns from authenticated role
--    (admins read via service_role; clients only need uploaded_documents and
--     basic non-sensitive fields). Service role retains full access.
REVOKE SELECT, UPDATE ON public.client_profiles FROM authenticated;
GRANT SELECT (id, lead_source, payment_status, uploaded_documents, created_at, updated_at)
  ON public.client_profiles TO authenticated;
GRANT UPDATE (uploaded_documents)
  ON public.client_profiles TO authenticated;

-- 5. partner_assignments — partners may only update partner_feedback_notes
REVOKE UPDATE ON public.partner_assignments FROM authenticated;
GRANT UPDATE (partner_feedback_notes)
  ON public.partner_assignments TO authenticated;

-- 6. user_roles — explicit RESTRICTIVE policy to prevent any non-admin
--    INSERT/UPDATE/DELETE even if a permissive policy is added later.
CREATE POLICY "user_roles_block_non_admin_writes" ON public.user_roles
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
