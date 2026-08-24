-- Client consent flow (flagship CRM spec item 4): the client approves every
-- data hand-off per topic, sees exactly which fields will be transferred
-- BEFORE the transfer, and only after approval does the referral reach the
-- partner. Enforced at the RLS level, not just in the UI: a partner gains
-- zero access to the client's data while a referral is still awaiting the
-- client's decision.

-- =========================================================
-- 1) consent decision per referral
--    Existing rows (and any legacy insert that doesn't set the column) keep
--    behaving exactly as today via DEFAULT 'approved' — zero regression.
-- =========================================================
ALTER TABLE public.partner_referrals
  ADD COLUMN consent_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (consent_status IN ('awaiting_client', 'approved', 'declined'));

CREATE INDEX idx_referrals_consent ON public.partner_referrals(client_id, consent_status);

-- =========================================================
-- 2) standing per-category consents (the Hebrew-Bridge client_consents model):
--    once the client granted a topic, future referrals in that topic are sent
--    immediately; the client can revoke at any time from the portal.
-- =========================================================
CREATE TABLE public.client_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  is_granted BOOLEAN NOT NULL DEFAULT false,
  decided_via TEXT NOT NULL DEFAULT 'portal' CHECK (decided_via IN ('portal', 'staff')),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, category)
);

CREATE INDEX idx_client_consents_client ON public.client_consents(client_id);
CREATE INDEX idx_client_consents_tenant ON public.client_consents(tenant_id);

CREATE TRIGGER trg_client_consents_updated_at BEFORE UPDATE ON public.client_consents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_consents TO authenticated;
GRANT ALL ON public.client_consents TO service_role;

ALTER TABLE public.client_consents ENABLE ROW LEVEL SECURITY;

-- Staff: full access inside their tenant (same pattern as every client_* table)
CREATE POLICY "client_consents_tenant_isolation" ON public.client_consents
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Client self-portal: read own standing consents. Writes from the portal go
-- exclusively through the SECURITY DEFINER RPCs below, so no self write policy.
CREATE POLICY "client_consents_self_select" ON public.client_consents
  FOR SELECT TO authenticated
  USING (public.is_self_client(client_id));

-- =========================================================
-- 3) THE GATE — a partner sees nothing before the client approved.
--    is_partner_for_client() backs the partner SELECT policies on clients,
--    client_family_members, client_financial_profile, client_housing_profile,
--    client_vehicles, documents etc., so tightening it here gates them all.
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_partner_for_client(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_referrals r
    JOIN public.partners p ON p.id = r.partner_id
    WHERE r.client_id = _client_id
      AND p.auth_user_id = auth.uid()
      AND r.consent_status = 'approved'
  )
$$;

-- The referral row itself is also hidden from the partner until approved.
DROP POLICY "referrals_partner_select" ON public.partner_referrals;
CREATE POLICY "referrals_partner_select" ON public.partner_referrals FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() AND consent_status = 'approved');

DROP POLICY "referrals_partner_update" ON public.partner_referrals;
CREATE POLICY "referrals_partner_update" ON public.partner_referrals FOR UPDATE TO authenticated
  USING (partner_id = public.current_partner_id() AND consent_status = 'approved')
  WITH CHECK (partner_id = public.current_partner_id() AND consent_status = 'approved');

-- Client self-portal: read the referrals on the own file (any consent state).
CREATE POLICY "referrals_self_select" ON public.partner_referrals
  FOR SELECT TO authenticated
  USING (public.is_self_client(client_id));

-- =========================================================
-- 4) portal API (SECURITY DEFINER RPCs — expose exactly what the client
--    needs and nothing else; the client never gets raw access to partners)
-- =========================================================

-- Referral requests on my file, joined with the partner's name, topic and the
-- exact field list that would be shared — the "see before you approve" view.
CREATE OR REPLACE FUNCTION public.get_my_referral_requests()
RETURNS TABLE (
  id uuid,
  status text,
  consent_status text,
  notes text,
  sent_at timestamptz,
  partner_name text,
  partner_category text,
  allowed_fields jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.status, r.consent_status, r.notes, r.sent_at,
         p.company_name, p.category, COALESCE(p.allowed_client_fields, '[]'::jsonb)
  FROM public.partner_referrals r
  JOIN public.partners p ON p.id = r.partner_id
  JOIN public.clients c ON c.id = r.client_id
  WHERE c.auth_user_id = auth.uid()
  ORDER BY r.sent_at DESC
$$;

-- Approve or decline one awaiting referral. Approving also grants a standing
-- consent for the topic (revocable in the portal); declining records the
-- refusal. Either way the decision lands on the client's timeline so staff see
-- it. Only the client the referral belongs to can decide, and only once.
CREATE OR REPLACE FUNCTION public.respond_referral_consent(_referral_id uuid, _approve boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ref RECORD;
BEGIN
  SELECT r.id, r.tenant_id, r.client_id, r.consent_status,
         p.category AS partner_category, p.company_name
    INTO ref
    FROM public.partner_referrals r
    JOIN public.partners p ON p.id = r.partner_id
    JOIN public.clients c ON c.id = r.client_id
   WHERE r.id = _referral_id AND c.auth_user_id = auth.uid()
     FOR UPDATE OF r;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF ref.consent_status <> 'awaiting_client' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_decided');
  END IF;

  IF _approve THEN
    UPDATE public.partner_referrals
       SET consent_status = 'approved', status = 'sent', sent_at = now()
     WHERE id = _referral_id;
  ELSE
    UPDATE public.partner_referrals
       SET consent_status = 'declined', status = 'rejected',
           rejection_reason = COALESCE(rejection_reason, 'הלקוח לא אישר את העברת המידע')
     WHERE id = _referral_id;
  END IF;

  INSERT INTO public.client_consents (tenant_id, client_id, category, is_granted, decided_via)
  VALUES (ref.tenant_id, ref.client_id, ref.partner_category, _approve, 'portal')
  ON CONFLICT (client_id, category)
  DO UPDATE SET is_granted = EXCLUDED.is_granted, decided_at = now(), decided_via = 'portal';

  INSERT INTO public.messages (tenant_id, client_id, channel, direction, content, status)
  VALUES (ref.tenant_id, ref.client_id, 'internal', 'inbound',
          CASE WHEN _approve
               THEN 'אישרתי את העברת הפרטים אל ' || ref.company_name
               ELSE 'דחיתי את העברת הפרטים אל ' || ref.company_name
          END,
          'sent');

  RETURN jsonb_build_object('ok', true,
    'consent_status', CASE WHEN _approve THEN 'approved' ELSE 'declined' END);
END;
$$;

-- Toggle a standing topic consent from the portal.
CREATE OR REPLACE FUNCTION public.set_my_consent(_category text, _grant boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me RECORD;
BEGIN
  SELECT id, tenant_id INTO me FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_client');
  END IF;
  IF _category IS NULL OR btrim(_category) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_category');
  END IF;

  INSERT INTO public.client_consents (tenant_id, client_id, category, is_granted, decided_via)
  VALUES (me.tenant_id, me.id, _category, _grant, 'portal')
  ON CONFLICT (client_id, category)
  DO UPDATE SET is_granted = EXCLUDED.is_granted, decided_at = now(), decided_via = 'portal';

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- The standing-consents panel: every topic that has active partners in my
-- tenant, the union of fields those partners are allowed to see, and my
-- current decision. Deliberately does NOT expose partner names or counts of
-- anything outside the client's own tenant.
CREATE OR REPLACE FUNCTION public.get_my_consent_state()
RETURNS TABLE (
  category text,
  partner_count bigint,
  fields jsonb,
  is_granted boolean,
  decided_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT id, tenant_id FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
  ),
  cats AS (
    SELECT p.category,
           count(DISTINCT p.id) AS partner_count,
           COALESCE(jsonb_agg(DISTINCT f.val) FILTER (WHERE f.val IS NOT NULL), '[]'::jsonb) AS fields
    FROM public.partners p
    JOIN me ON p.tenant_id = me.tenant_id
    LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(p.allowed_client_fields, '[]'::jsonb)) AS f(val) ON true
    WHERE p.is_active
    GROUP BY p.category
  )
  SELECT cats.category, cats.partner_count, cats.fields, cc.is_granted, cc.decided_at
  FROM cats
  CROSS JOIN me
  LEFT JOIN public.client_consents cc ON cc.client_id = me.id AND cc.category = cats.category
  ORDER BY cats.category
$$;

REVOKE ALL ON FUNCTION public.get_my_referral_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_referral_consent(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_consent(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_consent_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_referral_consent(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_consent(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_consent_state() TO authenticated;
