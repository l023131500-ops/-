
CREATE TABLE public.client_personal_details (
  client_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_number text, date_of_birth date, gender text, marital_status text,
  address_street text, address_city text, address_zip text, address_country text,
  residency_status text, occupation text, employer text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_personal_details TO authenticated;
GRANT ALL ON public.client_personal_details TO service_role;
ALTER TABLE public.client_personal_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpd_all" ON public.client_personal_details FOR ALL TO authenticated
  USING (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_cpd_upd BEFORE UPDATE ON public.client_personal_details FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_financial_profile (
  client_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income numeric(14,2), monthly_expenses numeric(14,2),
  assets_summary text, liabilities_summary text,
  bank_name text, account_type text, tax_residency text, risk_profile text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_financial_profile TO authenticated;
GRANT ALL ON public.client_financial_profile TO service_role;
ALTER TABLE public.client_financial_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfp_all" ON public.client_financial_profile FOR ALL TO authenticated
  USING (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_cfp_upd BEFORE UPDATE ON public.client_financial_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relation text NOT NULL, full_name text NOT NULL, id_number text, date_of_birth date,
  dependent boolean NOT NULL DEFAULT false, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_client ON public.client_family_members(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_family_members TO authenticated;
GRANT ALL ON public.client_family_members TO service_role;
ALTER TABLE public.client_family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfm_all" ON public.client_family_members FOR ALL TO authenticated
  USING (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_cfm_upd BEFORE UPDATE ON public.client_family_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_employment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer text NOT NULL, role text, start_date date, end_date date,
  monthly_gross numeric(14,2), notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_emp_client ON public.client_employment_history(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_employment_history TO authenticated;
GRANT ALL ON public.client_employment_history TO service_role;
ALTER TABLE public.client_employment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ceh_all" ON public.client_employment_history FOR ALL TO authenticated
  USING (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_ceh_upd BEFORE UPDATE ON public.client_employment_history FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank text NOT NULL, branch text, account_number_last4 text, account_type text,
  currency text DEFAULT 'ILS', is_primary boolean NOT NULL DEFAULT false, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bank_client ON public.client_bank_accounts(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_bank_accounts TO authenticated;
GRANT ALL ON public.client_bank_accounts TO service_role;
ALTER TABLE public.client_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cba_all" ON public.client_bank_accounts FOR ALL TO authenticated
  USING (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_cba_upd BEFORE UPDATE ON public.client_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.custom_field_entity AS ENUM ('client','partner','professional','topic');
CREATE TYPE public.custom_field_type AS ENUM ('text','number','date','boolean','select','multiselect');

CREATE TABLE public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.custom_field_entity NOT NULL,
  key text NOT NULL, label text NOT NULL, type public.custom_field_type NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  visible_to_roles text[] NOT NULL DEFAULT ARRAY['admin']::text[],
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_definitions TO authenticated;
GRANT ALL ON public.custom_field_definitions TO service_role;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfd_admin_write" ON public.custom_field_definitions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "cfd_read_auth" ON public.custom_field_definitions FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_cfd_upd BEFORE UPDATE ON public.custom_field_definitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL, value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (definition_id, entity_id)
);
CREATE INDEX idx_cfv_entity ON public.custom_field_values(entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_values TO authenticated;
GRANT ALL ON public.custom_field_values TO service_role;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfv_admin" ON public.custom_field_values FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "cfv_owner" ON public.custom_field_values FOR ALL TO authenticated
  USING (entity_id = auth.uid()) WITH CHECK (entity_id = auth.uid());
CREATE TRIGGER trg_cfv_upd BEFORE UPDATE ON public.custom_field_values FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text, name text NOT NULL, storage_path text NOT NULL,
  mime text, size bigint,
  status text NOT NULL DEFAULT 'pending_review',
  partner_visible boolean NOT NULL DEFAULT true, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_owner ON public.documents(owner_client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_all" ON public.documents FOR ALL TO authenticated
  USING (owner_client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (owner_client_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_doc_upd BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill documents from client_profiles.uploaded_documents jsonb (kept for one release)
INSERT INTO public.documents (id, owner_client_id, uploaded_by, category, name, storage_path, mime, size, status, created_at)
SELECT
  COALESCE(NULLIF(d->>'id','')::uuid, gen_random_uuid()),
  cp.id, cp.id,
  NULLIF(d->>'category',''),
  COALESCE(NULLIF(d->>'name',''),'document'),
  COALESCE(d->>'path',''),
  NULLIF(d->>'mime',''),
  NULLIF(d->>'size','')::bigint,
  COALESCE(NULLIF(d->>'status',''),'pending_review'),
  COALESCE(NULLIF(d->>'uploaded_at','')::timestamptz, now())
FROM public.client_profiles cp
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(cp.uploaded_documents,'[]'::jsonb)) AS d
WHERE jsonb_typeof(cp.uploaded_documents) = 'array' AND COALESCE(d->>'path','') <> ''
ON CONFLICT (id) DO NOTHING;
