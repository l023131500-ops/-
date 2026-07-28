-- 15 egod — Supabase project hkkkynyoigzlttpynoeo
-- ---------------------------------------------------------------------------
-- ⚠️ NOT APPLIED. This project is not in the account the current PAT reaches
-- (GET /v1/projects does not list it), so it has to be run by the project owner
-- from the Supabase SQL editor.
--
-- What was found, verified live against the anon key that the deployed
-- more30.com/egod bundle embeds:
--
--   GET    /rest/v1/teacher_invites  -> 200, returns every row including
--                                       email, invite_code and initial_password
--                                       IN PLAINTEXT
--   PATCH  /rest/v1/teacher_invites  -> 204  (anon may modify rows)
--   DELETE /rest/v1/teacher_invites  -> 204  (anon may delete rows)
--
-- Four rows are exposed. Three are demo accounts; one is a real person
-- (yb6792021@gmail.com). The anon key is public by design — it ships inside the
-- JavaScript bundle — so this is equivalent to publishing the invite passwords.
--
-- Storing an initial password in plaintext is itself the deeper problem: the
-- admin screen generates one, saves it here, and reads it back to compose the
-- WhatsApp invite. Even with RLS closed, anyone with database access reads it.
-- Closing the table is the urgent half; moving to a one-time token that is
-- hashed at rest is the proper fix, and is a code change in
-- apps/15-egod/src/pages/admin/AdminTeachers.tsx.

alter table public.teacher_invites enable row level security;

-- Remove whatever currently lets anon read and write this table.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'teacher_invites'
  loop
    execute format('drop policy %I on public.teacher_invites', p.policyname);
  end loop;
end $$;

revoke all on public.teacher_invites from anon;
revoke all on public.teacher_invites from authenticated;

-- Activation must still work for a signed-out visitor holding an invite link.
-- It goes through a SECURITY DEFINER function that takes the code and returns
-- only what activation needs — never the whole table, and never a listing.
grant execute on function public.activate_invite(text, text) to anon;

-- Admins keep full access through their own role, not through the public key.
create policy teacher_invites_admin_all on public.teacher_invites
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- After applying, re-check with the public key. Both must fail:
--   curl -s -o /dev/null -w '%{http_code}\n' \
--     -H "apikey: <anon>" '<url>/rest/v1/teacher_invites?select=*'      -> 401
--   curl -s -o /dev/null -w '%{http_code}\n' -X DELETE \
--     -H "apikey: <anon>" '<url>/rest/v1/teacher_invites?id=eq.<any>'   -> 401
