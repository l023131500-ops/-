-- ============================================================================
-- Torah Platform · storage.objects UPDATE — close cross-tenant rename/move hole
-- ============================================================================
-- Round 749-750 (20260831180000) scoped the INSERT policy on storage.objects
-- so a write into materials-media/<tenant_id>/... or
-- portal-assets/gallery/<tenant_id>/... requires the uploader to hold a role
-- in that tenant. `owner_update_torah_buckets` (20260519000004) was left
-- untouched because its own scope note said only INSERT was audited — but it
-- opens the exact same class of hole via a different verb:
--   using ((owner = auth.uid()) and (bucket_id = any(<torah buckets>)))
--   -- no WITH CHECK given, so Postgres reuses USING for the check on the
--   -- NEW row too (per RLS UPDATE semantics) — it only re-checks `owner`,
--   -- never the new `name`/`bucket_id`.
-- Any authenticated user who owns ANY object in these buckets (e.g. a file
-- they legitimately uploaded under their own tenant's prefix) can therefore
-- UPDATE that row's `name` to move it under a *different* tenant's prefix,
-- keeping `owner = auth.uid()` unchanged — bypassing the INSERT-time tenant
-- check entirely via rename. Live-verified today via a rolled-back
-- transaction: a user with a `member` role only in tenant A inserted a
-- legitimate object at "materials-media/<tenant A>/legit.pdf" (allowed), then
-- UPDATEd its `name` to "materials-media/<tenant B>/pwned.pdf" with zero role
-- in tenant B — succeeded with no error, leaving them `owner` of a path
-- inside a foreign tenant's folder (same squat/overwrite risk documented in
-- 20260831180000, reached via UPDATE instead of INSERT).
--
-- Fix: add an explicit WITH CHECK to owner_update_torah_buckets requiring the
-- same public.torah_bucket_write_allowed(bucket_id, name) check already used
-- by the INSERT policy, so a rename into a foreign tenant's prefix is blocked
-- the same way a direct insert there already is. `owner = auth.uid()` stays
-- in both USING and WITH CHECK — ownership requirement is unchanged. No
-- other bucket/path shape is affected (the helper returns true unchanged for
-- non-tenant-prefixed paths), so plain metadata-only updates on
-- newsletters/site-images/shop-images/non-gallery portal-assets keep working.
do $$ begin
  drop policy if exists "owner_update_torah_buckets" on storage.objects;
  create policy "owner_update_torah_buckets" on storage.objects for update
    using (
      owner = auth.uid()
      and bucket_id = any (array['portal-assets','materials-media','newsletters','site-images','shop-images'])
    )
    with check (
      owner = auth.uid()
      and bucket_id = any (array['portal-assets','materials-media','newsletters','site-images','shop-images'])
      and public.torah_bucket_write_allowed(bucket_id, name)
    );
exception when others then null; end $$;
