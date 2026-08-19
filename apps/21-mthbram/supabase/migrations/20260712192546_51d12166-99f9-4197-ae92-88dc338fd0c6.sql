
-- 1. Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','rabbi','org_admin','synagogue_admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. Helper: drop all existing policies on a table
CREATE OR REPLACE FUNCTION public._drop_all_policies(_table TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=_table LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, _table);
  END LOOP;
END $$;

SELECT public._drop_all_policies(t) FROM (VALUES
  ('lessons'),('contact_messages'),('teacher_leads'),('seeker_leads'),
  ('nedarim_submissions'),('ivr_submissions'),('rabbi_portals'),('org_portals'),
  ('synagogue_portals'),('portal_messages'),('portal_photos'),('prayer_times'),
  ('org_rabbis'),('study_day_events'),('study_day_sessions'),
  ('bulk_upload_sessions'),('synagogue_full_access_requests')
) AS x(t);

-- 3. lessons: public reads approved only; public inserts allowed; admin all
CREATE POLICY "Public can view approved lessons" ON public.lessons
  FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "Anyone can submit lessons" ON public.lessons
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage lessons" ON public.lessons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. Submission-only tables (insert public, everything else admin)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['contact_messages','teacher_leads','seeker_leads','nedarim_submissions','ivr_submissions','synagogue_full_access_requests']
  LOOP
    EXECUTE format('CREATE POLICY "Anyone can submit" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Admins full access" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', tbl);
  END LOOP;
END $$;

-- 5. Portal tables (rabbi/org/synagogue): public SELECT stays (but access_token column revoked below); admin manages
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['rabbi_portals','org_portals','synagogue_portals']
  LOOP
    EXECUTE format('CREATE POLICY "Public can view portals" ON public.%I FOR SELECT TO anon, authenticated USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Anyone can request portal" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Admins manage portals" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', tbl);
  END LOOP;
END $$;

-- Column-level: hide access_token from anon/authenticated (service_role keeps access via edge functions)
REVOKE SELECT ON public.rabbi_portals FROM anon, authenticated;
REVOKE SELECT ON public.org_portals FROM anon, authenticated;
REVOKE SELECT ON public.synagogue_portals FROM anon, authenticated;

-- Grant back all columns EXCEPT access_token
DO $$
DECLARE
  tbl TEXT;
  cols TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['rabbi_portals','org_portals','synagogue_portals']
  LOOP
    SELECT string_agg(quote_ident(column_name), ',')
      INTO cols
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name=tbl AND column_name <> 'access_token';
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO anon, authenticated', cols, tbl);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('GRANT INSERT ON public.%I TO anon', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
  END LOOP;
END $$;

-- 6. Ancillary portal tables: public read; only admin writes/updates/deletes
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['portal_messages','portal_photos','prayer_times','org_rabbis','study_day_events','study_day_sessions','bulk_upload_sessions']
  LOOP
    EXECUTE format('CREATE POLICY "Public can read" ON public.%I FOR SELECT TO anon, authenticated USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Admins manage" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', tbl);
  END LOOP;
END $$;

-- portal_messages: keep public submit (contact form)
CREATE POLICY "Anyone can submit portal message" ON public.portal_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 7. Storage: drop public list/mutate policies
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view portal assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete portal assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update portal assets" ON storage.objects;

-- Admin-only listing/management of these buckets
CREATE POLICY "Admins list lesson-logos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id='lesson-logos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage lesson-logos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id='lesson-logos' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='lesson-logos' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins list portal-assets" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id='portal-assets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage portal-assets" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id='portal-assets' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='portal-assets' AND public.has_role(auth.uid(),'admin'));

-- Public uploads to these buckets stay (existing INSERT policies remain)

-- 8. Cleanup helper
DROP FUNCTION IF EXISTS public._drop_all_policies(TEXT);
