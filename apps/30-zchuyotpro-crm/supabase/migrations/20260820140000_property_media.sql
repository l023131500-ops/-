-- Property photos/videos repository, distinct from the general client
-- "documents" repository: a broker/agent needs to attach visual media to a
-- specific property (the client's own home or one of client_housing_profile's
-- additional_properties), not just paperwork. Mirrors the documents table +
-- client-documents bucket pattern (see 20260610192350_...sql).

CREATE TABLE public.property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_label TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  file_name TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_property_media_tenant ON public.property_media(tenant_id);
CREATE INDEX idx_property_media_client ON public.property_media(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_media TO authenticated;
GRANT ALL ON public.property_media TO service_role;
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_media_tenant_isolation" ON public.property_media
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Storage bucket + tenant-scoped policies, same shape as client-documents.
INSERT INTO storage.buckets (id, name, public) VALUES ('property-media', 'property-media', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "property_media_tenant_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );

CREATE POLICY "property_media_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );

CREATE POLICY "property_media_tenant_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );

CREATE POLICY "property_media_tenant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );
