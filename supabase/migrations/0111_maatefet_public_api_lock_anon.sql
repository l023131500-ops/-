-- more30 · 39-maatefet — close a real over-grant: anon had EXECUTE on every
-- authenticated-only public.maatefet_* wrapper
-- ============================================================================
-- Verified live via has_function_privilege(): every public.maatefet_* function
-- created in 0110 was executable by anon, even the ones explicitly followed by
-- `revoke all on function ... from public`. Root cause: this project (like
-- every Supabase project) has `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT
-- EXECUTE ON FUNCTIONS TO anon, authenticated, service_role` set at the project
-- level, which grants EXECUTE to the `anon` role *directly* the moment a new
-- function is created in `public` — `revoke ... from public` only revokes the
-- separate, automatic grant to the PUBLIC pseudo-role, not that explicit
-- per-role default grant. (This is exactly why 0108/0109's `maatefet`-schema
-- functions were NOT affected — default privileges were only ever configured
-- for the `public` schema, not the new `maatefet` schema.)
--
-- Practical exposure was low (every path either checks auth.uid() itself or
-- hits RLS/table-grant denial for anon), but it produced confusing raw
-- "permission denied for table" errors instead of clean 401s and is not the
-- intended surface. Fixed at the root: explicit `revoke execute ... from
-- anon` on every function that is not meant to be public, leaving
-- maatefet_invite_peek as the one deliberate anon-callable entry point.

revoke execute on function public.maatefet_me() from anon;
revoke execute on function public.maatefet_instructor_signup(text, text, text, text) from anon;
revoke execute on function public.maatefet_invites_list() from anon;
revoke execute on function public.maatefet_invite_create(text, text, text) from anon;
revoke execute on function public.maatefet_invite_revoke(uuid) from anon;
revoke execute on function public.maatefet_redeem_invite(text, text, text, text, text) from anon;
revoke execute on function public.maatefet_clients_list() from anon;
revoke execute on function public.maatefet_client_update(uuid, text, text, text, date, text) from anon;
revoke execute on function public.maatefet_content_list() from anon;
revoke execute on function public.maatefet_content_save(uuid, text, text, text, boolean) from anon;
revoke execute on function public.maatefet_admin_instructors_list() from anon;
revoke execute on function public.maatefet_verify_instructor(uuid, boolean) from anon;
-- maatefet_invite_peek(text) is intentionally left anon-executable — it is the
-- one public entry point (exact code, four display fields, no listing).
