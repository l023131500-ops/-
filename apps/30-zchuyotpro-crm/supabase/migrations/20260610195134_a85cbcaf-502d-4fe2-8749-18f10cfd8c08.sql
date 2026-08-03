
-- Phase 3: partner portal access
CREATE OR REPLACE FUNCTION public.is_partner_for_client(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_referrals r
    JOIN public.partners p ON p.id = r.partner_id
    WHERE r.client_id = _client_id AND p.auth_user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.partners WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- partners: allow partner to see their own row even outside tenant
CREATE POLICY "partners_self_select" ON public.partners FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- partner_referrals: partner read + update own
CREATE POLICY "referrals_partner_select" ON public.partner_referrals FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id());
CREATE POLICY "referrals_partner_update" ON public.partner_referrals FOR UPDATE TO authenticated
  USING (partner_id = public.current_partner_id())
  WITH CHECK (partner_id = public.current_partner_id());

-- clients: partner read
CREATE POLICY "clients_partner_select" ON public.clients FOR SELECT TO authenticated
  USING (public.is_partner_for_client(id));

-- child tables: partner read via client_id
CREATE POLICY "family_partner_select" ON public.client_family_members FOR SELECT TO authenticated
  USING (public.is_partner_for_client(client_id));
CREATE POLICY "financial_partner_select" ON public.client_financial_profile FOR SELECT TO authenticated
  USING (public.is_partner_for_client(client_id));
CREATE POLICY "housing_partner_select" ON public.client_housing_profile FOR SELECT TO authenticated
  USING (public.is_partner_for_client(client_id));
CREATE POLICY "vehicles_partner_select" ON public.client_vehicles FOR SELECT TO authenticated
  USING (public.is_partner_for_client(client_id));
CREATE POLICY "client_ents_partner_select" ON public.client_entitlements FOR SELECT TO authenticated
  USING (public.is_partner_for_client(client_id));
CREATE POLICY "documents_partner_select" ON public.documents FOR SELECT TO authenticated
  USING (public.is_partner_for_client(client_id));
CREATE POLICY "messages_partner_select" ON public.messages FOR SELECT TO authenticated
  USING (public.is_partner_for_client(client_id));
CREATE POLICY "messages_partner_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (public.is_partner_for_client(client_id) AND direction = 'outbound');
