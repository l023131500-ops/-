-- Loan management (flagship CRM spec item 7 — "ניהול הלוואות, חישוב רכישת
-- דירה, דירה להשקעה"): every client keeps a real list of their loans
-- (mortgage, bank, gmach, credit…) with balance, rate and monthly payment,
-- editable both by staff inside the client file and by the client in the
-- self-portal — the data foundation for the loan-burden and home-purchase
-- calculators in the cashflow panel. Like budget limits, loans are the
-- client's own data: full self CRUD, no partner policy.
--
-- This migration runs after 20260824220000_staff_access_control, so staff
-- policies are written directly in the final role-aware form.

CREATE TABLE public.client_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lender TEXT NOT NULL,
  loan_type TEXT NOT NULL DEFAULT 'other'
    CHECK (loan_type IN ('mortgage', 'bank', 'credit_card', 'gmach', 'family', 'other')),
  -- original amount borrowed; NULL when the client only knows current numbers
  principal NUMERIC(12,2) CHECK (principal IS NULL OR principal >= 0),
  balance NUMERIC(12,2) NOT NULL CHECK (balance >= 0),
  annual_rate_pct NUMERIC(6,3) CHECK (annual_rate_pct IS NULL OR annual_rate_pct >= 0),
  monthly_payment NUMERIC(12,2) NOT NULL CHECK (monthly_payment >= 0),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_loans_client ON public.client_loans(client_id);
CREATE INDEX idx_client_loans_tenant ON public.client_loans(tenant_id);

CREATE TRIGGER trg_client_loans_updated_at BEFORE UPDATE ON public.client_loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_loans TO authenticated;
GRANT ALL ON public.client_loans TO service_role;

ALTER TABLE public.client_loans ENABLE ROW LEVEL SECURITY;

-- Staff: role-aware access inside their tenant (viewer read-only, optional
-- assigned-only scoping) — same shape 20260824220000 gave every client_* table
CREATE POLICY "client_loans_staff_select" ON public.client_loans
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.staff_sees_client(client_id));
CREATE POLICY "client_loans_staff_insert" ON public.client_loans
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_loans_staff_update" ON public.client_loans
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id()
              AND public.staff_has_write() AND public.staff_sees_client(client_id));
CREATE POLICY "client_loans_staff_delete" ON public.client_loans
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_my_tenant_id()
         AND public.staff_has_write() AND public.staff_sees_client(client_id));

-- Client self-portal: the loans are the client's own — full CRUD on the own
-- file. The tenant_id subquery pins new rows to the client's real tenant.
CREATE POLICY "client_loans_self_select" ON public.client_loans
  FOR SELECT TO authenticated
  USING (public.is_self_client(client_id));

CREATE POLICY "client_loans_self_insert" ON public.client_loans
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_self_client(client_id)
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
  );

CREATE POLICY "client_loans_self_update" ON public.client_loans
  FOR UPDATE TO authenticated
  USING (public.is_self_client(client_id))
  WITH CHECK (
    public.is_self_client(client_id)
    AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = client_id)
  );

CREATE POLICY "client_loans_self_delete" ON public.client_loans
  FOR DELETE TO authenticated
  USING (public.is_self_client(client_id));
