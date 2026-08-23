-- Intake board (flagship CRM spec + explicit user request 20/08): every
-- inbound inquiry — public form, email, WhatsApp, voice line, phone call —
-- lands in one tenant-scoped triage queue. Staff match it to an existing
-- client (or create one from it), then route it to a partner with a
-- field-level preview of exactly what will be shared
-- (partners.allowed_client_fields) before approving. This is the bridge
-- leads -> triage -> partner_referrals the spec asks for.

CREATE TABLE public.intake_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'form' CHECK (channel IN ('form', 'email', 'whatsapp', 'voice', 'phone', 'other')),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  subject TEXT,
  body TEXT,
  -- caller-suggested partner category (matches partners.category values);
  -- used to pre-filter the routing partner list, never to auto-route
  suggested_category TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_triage', 'converted', 'routed', 'rejected')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  referral_id UUID REFERENCES public.partner_referrals(id) ON DELETE SET NULL,
  handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  rejection_reason TEXT,
  source_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intake_inquiries_tenant ON public.intake_inquiries(tenant_id);
CREATE INDEX idx_intake_inquiries_tenant_status ON public.intake_inquiries(tenant_id, status);
CREATE INDEX idx_intake_inquiries_created ON public.intake_inquiries(created_at DESC);

CREATE TRIGGER trg_intake_inquiries_updated_at BEFORE UPDATE ON public.intake_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_inquiries TO authenticated;
GRANT ALL ON public.intake_inquiries TO service_role;

ALTER TABLE public.intake_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_inquiries_tenant_isolation" ON public.intake_inquiries
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());
