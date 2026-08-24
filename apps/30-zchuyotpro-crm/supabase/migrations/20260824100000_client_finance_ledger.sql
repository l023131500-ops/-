-- Personal finance ledger (flagship CRM spec item 7): every client gets a
-- real income/expense ledger plus monthly budget limits per category —
-- editable both by staff inside the client file (tenant-scoped) and by the
-- client in the self-portal (self-scoped, rows marked source='client').
-- This is also the data foundation for spec item 8 (Yemot voice extensions),
-- which will write the same rows with source='voice'.

CREATE TABLE public.client_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  category TEXT NOT NULL DEFAULT 'other_expense',
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  -- who keyed the row in: CRM staff, the client from the portal, a voice
  -- call (Yemot, spec item 8) or a bulk import
  source TEXT NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'client', 'voice', 'import')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_transactions_client_date ON public.client_transactions(client_id, occurred_on DESC);
CREATE INDEX idx_client_transactions_tenant ON public.client_transactions(tenant_id);

CREATE TRIGGER trg_client_transactions_updated_at BEFORE UPDATE ON public.client_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL CHECK (monthly_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, category)
);

CREATE INDEX idx_client_budget_limits_client ON public.client_budget_limits(client_id);
CREATE INDEX idx_client_budget_limits_tenant ON public.client_budget_limits(tenant_id);

CREATE TRIGGER trg_client_budget_limits_updated_at BEFORE UPDATE ON public.client_budget_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_transactions TO authenticated;
GRANT ALL ON public.client_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_budget_limits TO authenticated;
GRANT ALL ON public.client_budget_limits TO service_role;

ALTER TABLE public.client_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_budget_limits ENABLE ROW LEVEL SECURITY;

-- Staff: full access inside their tenant (same pattern as every client_* table)
CREATE POLICY "client_transactions_tenant_isolation" ON public.client_transactions
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "client_budget_limits_tenant_isolation" ON public.client_budget_limits
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Client self-portal: read everything on the own file; write only rows the
-- client keyed in (source='client'), never staff/voice/import rows. The
-- tenant_id subquery pins the row to the client's real tenant — the client
-- can read the own clients row via clients_self_select, so it resolves.
CREATE POLICY "client_transactions_self_select" ON public.client_transactions
  FOR SELECT TO authenticated
  USING (public.is_self_client(client_id));

CREATE POLICY "client_transactions_self_insert" ON public.client_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_self_client(client_id)
    AND source = 'client'
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
  );

CREATE POLICY "client_transactions_self_update" ON public.client_transactions
  FOR UPDATE TO authenticated
  USING (public.is_self_client(client_id) AND source = 'client')
  WITH CHECK (
    public.is_self_client(client_id)
    AND source = 'client'
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
  );

CREATE POLICY "client_transactions_self_delete" ON public.client_transactions
  FOR DELETE TO authenticated
  USING (public.is_self_client(client_id) AND source = 'client');

-- Budget limits are the client's own budget — full self CRUD
CREATE POLICY "client_budget_limits_self_select" ON public.client_budget_limits
  FOR SELECT TO authenticated
  USING (public.is_self_client(client_id));

CREATE POLICY "client_budget_limits_self_insert" ON public.client_budget_limits
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_self_client(client_id)
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
  );

CREATE POLICY "client_budget_limits_self_update" ON public.client_budget_limits
  FOR UPDATE TO authenticated
  USING (public.is_self_client(client_id))
  WITH CHECK (
    public.is_self_client(client_id)
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
  );

CREATE POLICY "client_budget_limits_self_delete" ON public.client_budget_limits
  FOR DELETE TO authenticated
  USING (public.is_self_client(client_id));
