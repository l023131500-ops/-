-- 0008 — the control board reads through one gated door, and anon loses the key.
--
-- What was wrong
-- ==============
-- `more30_project_overview`, `more30_tasks`, `more30_tokens` and `more30_bugs`
-- all carried `GRANT SELECT ... TO anon`. The admin bundle is public (it is a
-- static page on more30.com), so its anon key is public too — which means the
-- four views were readable by anyone who opened the browser console:
--
--   · `admin_url`      — where every system's admin panel lives
--   · `fixed_notes` / `changed_notes` / `audit_*` — the internal audit trail
--   · `more30_tokens`  — the *names* of the secrets each system is missing,
--                        which is a map of exactly where the soft spots are
--
-- 0007 already moved the public site onto a lean `more30_public_systems` view,
-- so nothing anon-facing needs these any more. The grants were simply left over.
--
-- Why an RPC and not "grant to authenticated"
-- ===========================================
-- Five systems (04, 16, 26, 28, 32) sign their own users into *this* Supabase
-- project. `authenticated` therefore means "any user of any of those systems",
-- not "an admin". The board must answer to `more30_is_admin()` — the same gate
-- `more30_intake_list` and `more30_spec_list` already use — so there is one
-- definition of "admin" in the system rather than a second, weaker one.
--
-- One call, not four: the board needs all four sets to render a single card,
-- and four round trips gave four chances to render half a screen.

create or replace function public.more30_admin_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  result jsonb;
begin
  if not public.more30_is_admin() then
    raise exception 'admin only'
      using hint = 'הכניסה לניהול מוגבלת לחשבון אדמין.';
  end if;

  select jsonb_build_object(
    'projects', coalesce((select jsonb_agg(to_jsonb(o)) from public.more30_project_overview o), '[]'::jsonb),
    'tasks',    coalesce((select jsonb_agg(to_jsonb(t)) from public.more30_tasks t),            '[]'::jsonb),
    'tokens',   coalesce((select jsonb_agg(to_jsonb(k)) from public.more30_tokens k),           '[]'::jsonb),
    'bugs',     coalesce((select jsonb_agg(to_jsonb(b)) from public.more30_bugs b),             '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

comment on function public.more30_admin_snapshot() is
  'Everything the unified control board renders, in one gated call. Admin only.';

revoke all on function public.more30_admin_snapshot() from public, anon;
grant execute on function public.more30_admin_snapshot() to authenticated;

-- The views stay (the RPC reads them, and so does anything running as postgres
-- or service_role) — they just stop being readable straight off the wire.
revoke all on public.more30_project_overview from anon, authenticated;
revoke all on public.more30_tasks            from anon, authenticated;
revoke all on public.more30_tokens           from anon, authenticated;
revoke all on public.more30_bugs             from anon, authenticated;
