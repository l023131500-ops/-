
-- 1. unique index for client_entitlements upsert
CREATE UNIQUE INDEX IF NOT EXISTS uniq_client_entitlement
  ON public.client_entitlements(client_id, entitlement_id);

-- 2. enable realtime on messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;

-- 3. storage policies for client-documents bucket
CREATE POLICY "client_docs_tenant_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );

CREATE POLICY "client_docs_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );

CREATE POLICY "client_docs_tenant_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );

CREATE POLICY "client_docs_tenant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );
