-- public.nedarim_submissions had RLS disabled entirely: anon (the public
-- browser key, embedded in this app's bundled JS) held full
-- SELECT/INSERT/UPDATE/DELETE grants on it, so any visitor could read or
-- tamper with every donation-form submission (raw_json, mosad_id, tofes_id,
-- emda, id_forms_send) with zero auth.
--
-- The writing edge functions (nedarim-webhook, nedarim-create-payment,
-- nedarim-admin) all use SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS, so
-- they are unaffected by this change. The only browser-side callers are the
-- admin-only pages (src/pages/legacy/AdminDashboard.tsx,
-- src/pages/legacy/NedarimManagement.tsx, src/components/admin/MatchingTab.tsx),
-- which are gated behind <RequireSuperAdmin/> at the route level (App.tsx) and
-- already use the anon-key browser client expecting an authenticated super
-- admin — so this only closes the gap where the same data was reachable
-- directly via REST with no session at all, bypassing the frontend route
-- guard. Matches the existing convention already used on lesson_topics_write /
-- forum_access fa_admin_write in this schema for admin-only,
-- non-tenant-scoped tables.

alter table public.nedarim_submissions enable row level security;

create policy "nedarim_submissions_admin_only"
  on public.nedarim_submissions
  for all
  using (is_super_admin(auth.uid()))
  with check (is_super_admin(auth.uid()));
