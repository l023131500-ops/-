-- Personal-areas & passwords vault (flagship CRM spec item 3): every client
-- keeps a per-topic list of their online personal areas (health fund, national
-- insurance, bank, gov.il, email…) with the login details next to each one, so
-- both the client and the office staff handling their rights always know where
-- and how to sign in. Visible ONLY to the client and to office staff of the
-- owning tenant — there is deliberately NO partner policy on this table, so
-- partners can never read it regardless of consents/allowed_client_fields, and
-- it is likewise excluded from the printed client report.

CREATE TABLE public.client_personal_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- topic keys mirror the portal UI (health_fund/national_insurance/bank/…);
  -- free-text values are allowed so a client can invent their own topics
  topic TEXT NOT NULL DEFAULT 'other',
  label TEXT NOT NULL,
  url TEXT,
  username TEXT,
  password TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_personal_areas_client ON public.client_personal_areas(client_id, topic);
CREATE INDEX idx_client_personal_areas_tenant ON public.client_personal_areas(tenant_id);

CREATE TRIGGER trg_client_personal_areas_updated_at BEFORE UPDATE ON public.client_personal_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_personal_areas TO authenticated;
GRANT ALL ON public.client_personal_areas TO service_role;

ALTER TABLE public.client_personal_areas ENABLE ROW LEVEL SECURITY;

-- Staff: full access inside their tenant (same pattern as every client_* table)
CREATE POLICY "client_personal_areas_tenant_isolation" ON public.client_personal_areas
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Client self-portal: the vault is the client's own — full CRUD on the own
-- file. The tenant_id subquery pins new rows to the client's real tenant.
CREATE POLICY "client_personal_areas_self_select" ON public.client_personal_areas
  FOR SELECT TO authenticated
  USING (public.is_self_client(client_id));

CREATE POLICY "client_personal_areas_self_insert" ON public.client_personal_areas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_self_client(client_id)
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
  );

CREATE POLICY "client_personal_areas_self_update" ON public.client_personal_areas
  FOR UPDATE TO authenticated
  USING (public.is_self_client(client_id))
  WITH CHECK (
    public.is_self_client(client_id)
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
  );

CREATE POLICY "client_personal_areas_self_delete" ON public.client_personal_areas
  FOR DELETE TO authenticated
  USING (public.is_self_client(client_id));
