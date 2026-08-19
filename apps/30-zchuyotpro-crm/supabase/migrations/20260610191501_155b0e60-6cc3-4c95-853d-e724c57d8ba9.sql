
-- =========================================================
-- ZchuyotPro Phase 1 schema
-- =========================================================

-- Enum for roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','manager','agent','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- tenants ----------
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'basic',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agent',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_auth_user ON public.profiles(auth_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- security-definer helpers ----------
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND tenant_id = _tenant_id
  )
$$;

-- ---------- updated_at trigger fn ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- tenant policies ----------
CREATE POLICY "tenant_self_select" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_my_tenant_id());

CREATE POLICY "tenant_self_update" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_my_tenant_id())
  WITH CHECK (id = public.get_my_tenant_id());

-- ---------- profiles policies ----------
CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_tenant_member(tenant_id));

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "profiles_tenant_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id));

-- =========================================================
-- clients
-- =========================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  id_number TEXT,
  birth_date DATE,
  gender TEXT,
  marital_status TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  nedarim_id TEXT,
  imot_id TEXT,
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX idx_clients_assigned_agent ON public.clients(assigned_agent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_tenant_isolation" ON public.clients
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- file_number sequence + trigger
CREATE SEQUENCE IF NOT EXISTS public.client_file_number_seq;
CREATE OR REPLACE FUNCTION public.set_client_file_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.file_number IS NULL THEN
    NEW.file_number := to_char(now(),'YYYY') || '-' || lpad(nextval('public.client_file_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_clients_file_number BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_client_file_number();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- client_family_members
-- =========================================================
CREATE TABLE public.client_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  id_number TEXT,
  birth_date DATE,
  gender TEXT,
  health_status TEXT,
  health_fund TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_client ON public.client_family_members(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_family_members TO authenticated;
GRANT ALL ON public.client_family_members TO service_role;
ALTER TABLE public.client_family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_tenant_isolation" ON public.client_family_members
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- =========================================================
-- client_financial_profile
-- =========================================================
CREATE TABLE public.client_financial_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  employment_status TEXT,
  employer_name TEXT,
  occupation TEXT,
  gross_monthly_income NUMERIC(12,2),
  net_monthly_income NUMERIC(12,2),
  spouse_income NUMERIC(12,2),
  other_income NUMERIC(12,2),
  income_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_pension BOOLEAN,
  pension_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_life_insurance BOOLEAN,
  insurance_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_financial_profile TO authenticated;
GRANT ALL ON public.client_financial_profile TO service_role;
ALTER TABLE public.client_financial_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_tenant_isolation" ON public.client_financial_profile
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());
CREATE TRIGGER trg_financial_updated_at BEFORE UPDATE ON public.client_financial_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- client_housing_profile
-- =========================================================
CREATE TABLE public.client_housing_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  housing_type TEXT,
  has_mortgage BOOLEAN,
  mortgage_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  property_address TEXT,
  arnona_account_number TEXT,
  electricity_meter_number TEXT,
  water_account_number TEXT,
  has_additional_property BOOLEAN,
  additional_properties JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_rent NUMERIC(10,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_housing_client ON public.client_housing_profile(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_housing_profile TO authenticated;
GRANT ALL ON public.client_housing_profile TO service_role;
ALTER TABLE public.client_housing_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "housing_tenant_isolation" ON public.client_housing_profile
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());
CREATE TRIGGER trg_housing_updated_at BEFORE UPDATE ON public.client_housing_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- client_vehicles
-- =========================================================
CREATE TABLE public.client_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vehicle_type TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  has_insurance BOOLEAN,
  insurance_expiry DATE,
  disability_badge BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_client ON public.client_vehicles(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_vehicles TO authenticated;
GRANT ALL ON public.client_vehicles TO service_role;
ALTER TABLE public.client_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_tenant_isolation" ON public.client_vehicles
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- =========================================================
-- partners
-- =========================================================
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  category TEXT NOT NULL,
  allowed_client_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partners_tenant ON public.partners(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_tenant_isolation" ON public.partners
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- =========================================================
-- partner_referrals
-- =========================================================
CREATE TABLE public.partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  notes TEXT,
  partner_notes TEXT,
  rejection_reason TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_referrals_tenant ON public.partner_referrals(tenant_id);
CREATE INDEX idx_referrals_client ON public.partner_referrals(client_id);
CREATE INDEX idx_referrals_partner ON public.partner_referrals(partner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_referrals TO authenticated;
GRANT ALL ON public.partner_referrals TO service_role;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_tenant_isolation" ON public.partner_referrals
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());
CREATE TRIGGER trg_referrals_updated_at BEFORE UPDATE ON public.partner_referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- entitlements
-- =========================================================
CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  eligible_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  year INTEGER,
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entitlements_tenant ON public.entitlements(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entitlements_tenant_isolation" ON public.entitlements
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- =========================================================
-- client_entitlements
-- =========================================================
CREATE TABLE public.client_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entitlement_id UUID NOT NULL REFERENCES public.entitlements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'to_check',
  year INTEGER,
  notes TEXT,
  handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_ent_client ON public.client_entitlements(client_id);
CREATE INDEX idx_client_ent_ent ON public.client_entitlements(entitlement_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_entitlements TO authenticated;
GRANT ALL ON public.client_entitlements TO service_role;
ALTER TABLE public.client_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_ent_tenant_isolation" ON public.client_entitlements
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());
CREATE TRIGGER trg_client_ent_updated_at BEFORE UPDATE ON public.client_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- messages
-- =========================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  external_message_id TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_tenant ON public.messages(tenant_id);
CREATE INDEX idx_messages_client ON public.messages(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_tenant_isolation" ON public.messages
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- =========================================================
-- documents
-- =========================================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  analysis_result JSONB,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  signature_status TEXT,
  signed_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX idx_documents_client ON public.documents(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_tenant_isolation" ON public.documents
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- =========================================================
-- handle_new_user trigger: create tenant + admin profile on signup
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
BEGIN
  _tenant_name := NEW.raw_user_meta_data->>'tenant_name';
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  IF NEW.raw_user_meta_data ? 'tenant_id' THEN
    _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
    _role := 'agent';
  ELSE
    INSERT INTO public.tenants(name)
      VALUES (COALESCE(NULLIF(_tenant_name, ''), _full_name || ' Organization'))
      RETURNING id INTO _tenant_id;
  END IF;

  INSERT INTO public.profiles(tenant_id, auth_user_id, full_name, role)
    VALUES (_tenant_id, NEW.id, _full_name, _role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
