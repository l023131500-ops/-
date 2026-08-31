-- public.portal_photos never existed in any migration (verified: 0 hits across
-- every file in this directory before this one), yet three live, non-legacy
-- files already read/write it as if it did:
--   src/pages/portal/PortalSettings.tsx (route /portal/portal-settings, gallery
--     tab: addPhoto()/deletePhoto() insert/delete by teacher_id = auth.uid())
--   src/pages/public/RabbiPublic.tsx (route /rabbi/:id, public page: reads the
--     gallery for any visitor, no auth)
-- Both already carry comments noting this exact gap ("does not exist in the
-- live schema ... stays empty until that table is added"). This is scoped to
-- just those two call sites -- the *other* two portal_photos callers
-- (legacy/PublicOrgPage.tsx, legacy/PublicRabbiPage.tsx) key by
-- portal_type/portal_id against a different, already-abandoned legacy
-- rabbi_portals/org_portals subsystem (core.issues #260) and are intentionally
-- left untouched here.
create table if not exists public.portal_photos (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists idx_portal_photos_teacher on public.portal_photos(teacher_id);

alter table public.portal_photos enable row level security;

-- The public rabbi page (RabbiPublic.tsx) shows the gallery to anonymous
-- visitors, and every image_url already points at the public "portal-assets"
-- storage bucket -- so a public read policy matches the existing product
-- design, not a new exposure.
drop policy if exists "portal_photos_public_read" on public.portal_photos;
create policy "portal_photos_public_read" on public.portal_photos
  for select using (true);

drop policy if exists "portal_photos_owner_write" on public.portal_photos;
create policy "portal_photos_owner_write" on public.portal_photos
  for insert with check (
    teacher_id = (select auth.uid())
    or public.is_super_admin((select auth.uid()))
  );

drop policy if exists "portal_photos_owner_delete" on public.portal_photos;
create policy "portal_photos_owner_delete" on public.portal_photos
  for delete using (
    teacher_id = (select auth.uid())
    or public.is_super_admin((select auth.uid()))
  );
