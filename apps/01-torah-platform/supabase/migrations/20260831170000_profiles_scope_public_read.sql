-- profiles_read_basic granted SELECT on every column of every profile row
-- to ANY caller (anon included), with no scoping at all:
--
--   create policy "profiles_read_basic" on public.profiles for select using (true);
--
-- The migration comment above it ("self full access, others read minimal")
-- describes an intent this SQL never implemented: `using (true)` is a
-- blanket grant on the full row -- phone, whatsapp, city, neighborhood,
-- address, birthday, bio -- not a "minimal" projection. RLS is column-
-- agnostic; there is no partial-row grant here, and the anon key used by
-- the client is public, so any caller could bypass the frontend's
-- column-limited `.select(...)` calls entirely and pull every user's PII
-- directly. Verified live as role 'anon' (rolled back): a direct
-- `select id, full_name, phone, whatsapp, city, address, birthday, bio
-- from public.profiles` returned real phone numbers for real users with
-- zero authentication.
--
-- The one legitimate public-read path is /rabbi/:id (src/pages/public/
-- RabbiPublic.tsx), which intentionally shows a *portal-operating* rabbi's
-- own self-published avatar/bio/whatsapp on their public page. Every other
-- read site in src/ (admin/MatchingGuru.tsx, admin/Matching.tsx,
-- admin/Teachers.tsx, admin/Messages.tsx, public/FindLesson.tsx) also only
-- ever looks up profiles for user_ids sourced from `memberships`/
-- `user_roles`/`lessons.rabbi_user_id` -- i.e. platform operators who hold
-- a tenant role -- never arbitrary end users (shop customers, donors,
-- plain congregants) who only ever have a bare profiles row.
--
-- Fix: scope the "others can read" branch to profiles that actually belong
-- to a tenant-role holder, on top of the existing self/super-admin access.
-- (See the immediately-following migration: the first cut of this used an
-- inline `exists (select 1 from user_roles where user_id = profiles.id)`,
-- which turned out to be silently neutered by user_roles' own RLS for any
-- non-super-admin caller -- fixed there with a SECURITY DEFINER helper.)

drop policy if exists "profiles_read_basic" on public.profiles;

create policy "profiles_read_basic" on public.profiles for select
using (
  id = (select auth.uid())
  or is_super_admin((select auth.uid()))
  or exists (
    select 1 from public.user_roles ur where ur.user_id = profiles.id
  )
);
