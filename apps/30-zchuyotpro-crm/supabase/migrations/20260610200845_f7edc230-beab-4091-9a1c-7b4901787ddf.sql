
-- Link clients to auth users for client self-portal
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clients_auth_user_id_key ON public.clients(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_self_client(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id AND auth_user_id = auth.uid())
$$;

-- Allow clients to read their own record
DROP POLICY IF EXISTS clients_self_select ON public.clients;
CREATE POLICY clients_self_select ON public.clients FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Read-only self access to related data
DROP POLICY IF EXISTS messages_self_select ON public.messages;
CREATE POLICY messages_self_select ON public.messages FOR SELECT TO authenticated
  USING (client_id IS NOT NULL AND public.is_self_client(client_id));

DROP POLICY IF EXISTS messages_self_insert ON public.messages;
CREATE POLICY messages_self_insert ON public.messages FOR INSERT TO authenticated
  WITH CHECK (client_id IS NOT NULL AND public.is_self_client(client_id) AND direction = 'inbound');

DROP POLICY IF EXISTS documents_self_select ON public.documents;
CREATE POLICY documents_self_select ON public.documents FOR SELECT TO authenticated
  USING (client_id IS NOT NULL AND public.is_self_client(client_id));

DROP POLICY IF EXISTS client_entitlements_self_select ON public.client_entitlements;
CREATE POLICY client_entitlements_self_select ON public.client_entitlements FOR SELECT TO authenticated
  USING (public.is_self_client(client_id));

DROP POLICY IF EXISTS entitlements_public_read ON public.entitlements;
CREATE POLICY entitlements_public_read ON public.entitlements FOR SELECT TO authenticated
  USING (is_active = true);
