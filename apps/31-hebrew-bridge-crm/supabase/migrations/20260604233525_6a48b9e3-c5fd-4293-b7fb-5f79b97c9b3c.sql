
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'partner');
CREATE TYPE public.lead_source AS ENUM ('email', 'whatsapp', 'yemot_hamashiach', 'nedarim_plus');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'active_subscriber');
CREATE TYPE public.treatment_status AS ENUM ('sent', 'in_progress', 'completed');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table per security best practice)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- get_current_user_role helper
CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'partner' THEN 2 ELSE 3 END
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Client profiles
CREATE TABLE public.client_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_source public.lead_source,
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  raw_voicemail_transcription text,
  internal_admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profiles TO authenticated;
GRANT ALL ON public.client_profiles TO service_role;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own client profile" ON public.client_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage client profiles" ON public.client_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Partner profiles
CREATE TABLE public.partner_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text,
  specialization_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_profiles TO authenticated;
GRANT ALL ON public.partner_profiles TO service_role;
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners read own partner profile" ON public.partner_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Partners update own partner profile" ON public.partner_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage partner profiles" ON public.partner_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Partner assignments
CREATE TABLE public.partner_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  treatment_status public.treatment_status NOT NULL DEFAULT 'sent',
  partner_feedback_notes text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assignments_client ON public.partner_assignments(client_id);
CREATE INDEX idx_assignments_partner ON public.partner_assignments(partner_id);
CREATE INDEX idx_assignments_status ON public.partner_assignments(treatment_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_assignments TO authenticated;
GRANT ALL ON public.partner_assignments TO service_role;
ALTER TABLE public.partner_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own assignments" ON public.partner_assignments
  FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Partners read own assignments" ON public.partner_assignments
  FOR SELECT TO authenticated USING (auth.uid() = partner_id);
CREATE POLICY "Partners update own assignments" ON public.partner_assignments
  FOR UPDATE TO authenticated USING (auth.uid() = partner_id);
CREATE POLICY "Admins manage assignments" ON public.partner_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Visibility rules
CREATE TABLE public.visibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_category text NOT NULL UNIQUE,
  allowed_schema_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visibility_rules TO authenticated;
GRANT ALL ON public.visibility_rules TO service_role;
ALTER TABLE public.visibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read visibility rules" ON public.visibility_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage visibility rules" ON public.visibility_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Client consents
CREATE TABLE public.client_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  partner_category text NOT NULL,
  is_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, partner_category)
);
CREATE INDEX idx_consents_client ON public.client_consents(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_consents TO authenticated;
GRANT ALL ON public.client_consents TO service_role;
ALTER TABLE public.client_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own consents" ON public.client_consents
  FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Admins manage consents" ON public.client_consents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_client_profiles_updated BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_partner_profiles_updated BEFORE UPDATE ON public.partner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.partner_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_visibility_updated BEFORE UPDATE ON public.visibility_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_consents_updated BEFORE UPDATE ON public.client_consents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle_new_user: create profile + default client role + client_profiles row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  INSERT INTO public.client_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
