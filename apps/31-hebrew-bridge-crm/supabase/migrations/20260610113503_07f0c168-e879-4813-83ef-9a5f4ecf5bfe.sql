
-- 1. Move pg_net out of public schema (extension doesn't support SET SCHEMA, so drop+recreate)
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Drop overly-permissive public insert policy on leads
DROP POLICY IF EXISTS leads_public_insert ON public.leads;

-- 3. Tighten partner communication_logs select policy to active assignments only
DROP POLICY IF EXISTS comm_logs_partner_select ON public.communication_logs;
CREATE POLICY comm_logs_partner_select ON public.communication_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_assignments pa
      WHERE pa.client_id = communication_logs.client_id
        AND pa.partner_id = auth.uid()
        AND pa.treatment_status IN ('sent','in_progress')
    )
  );

-- 4. Restrict tasks UPDATE for authenticated to only status/priority/updated_at columns
REVOKE UPDATE ON public.tasks FROM authenticated;
GRANT UPDATE (status, priority, updated_at) ON public.tasks TO authenticated;
