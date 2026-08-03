-- 1) Restrict storage.objects SELECT on public buckets so anonymous users cannot LIST files.
--    Files are still accessible via direct public URL (that path doesn't go through RLS for public buckets),
--    and admins can still list via the dashboard / authenticated admin role.

-- Drop any existing broad public SELECT policies on these buckets (created by earlier migrations).
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%rights-media%'
        OR policyname ILIKE '%rights media%'
        OR policyname ILIKE '%public-resources%'
        OR policyname ILIKE '%public resources%'
        OR policyname ILIKE '%public read%'
        OR policyname ILIKE '%publicly accessible%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Admin-only LIST/SELECT through the API for these buckets
CREATE POLICY "Admins can list rights-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'rights-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can list public-resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'public-resources' AND public.has_role(auth.uid(), 'admin'));

-- Admin write policies (re-create, idempotent via DROP IF EXISTS)
DROP POLICY IF EXISTS "Admins can upload rights-media" ON storage.objects;
CREATE POLICY "Admins can upload rights-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rights-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update rights-media" ON storage.objects;
CREATE POLICY "Admins can update rights-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'rights-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete rights-media" ON storage.objects;
CREATE POLICY "Admins can delete rights-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rights-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can upload public-resources" ON storage.objects;
CREATE POLICY "Admins can upload public-resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-resources' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update public-resources" ON storage.objects;
CREATE POLICY "Admins can update public-resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-resources' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete public-resources" ON storage.objects;
CREATE POLICY "Admins can delete public-resources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-resources' AND public.has_role(auth.uid(), 'admin'));

-- 2) Revoke EXECUTE on SECURITY DEFINER helper functions from public/anon/authenticated.
--    They will continue to work inside triggers and inside RLS policies (which run with definer rights),
--    but cannot be invoked directly via the PostgREST API.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;