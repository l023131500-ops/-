-- 0009 — what actually guards each system's admin, as measured.
--
-- Step 4 asks for "the same credentials everywhere". Before this migration the
-- board tried to infer that by comparing `supabase_project` to the hub's, which
-- produced "this login opens 0 of 8 admin screens" — a number that was true only
-- because the underlying data was wrong in both directions: systems that do have
-- an admin screen had `admin_url = null`, and two that had one pointed at a
-- route that no longer exists.
--
-- So the mechanism is now stated, not guessed. Every value below was read off a
-- real Chrome session against more30.com on 29/07/2026 — not from an HTTP 200,
-- which for a single-page app only proves index.html was served:
--
--   hub    — Supabase Auth on the hub project. This login genuinely opens it.
--   own    — its own user store on another Supabase project. Merging it needs
--            that project's service key, and those are not in this account.
--   token  — a secret in the URL or a header, not a user account.
--   open   — no authentication at all. See 15 below.
--   none   — no admin screen is deployed; the path falls through to the app.
--   broken — an admin route exists but the entry point does not land on it.
--
-- Two findings worth naming, both discovered by opening the pages:
--
--   15 egod  — `/egod/admin` renders a full management console (מגידים, לידים,
--              פניות, תכנים) with no login whatsoever. The system is class C and
--              hidden from the site, but the route is live and world-readable.
--              Left running on purpose: taking a live route down is not a change
--              to make without being asked. It is flagged here and on the board.
--
--   02, 03   — `/tamlul/admin` and `/modaot/admin` redirected to `/login`
--              without the base path, so the browser left the system entirely
--              and landed on the marketing site. Both middlewares built the URL
--              with `new URL("/login", req.url)`, which resolves against the
--              origin and discards the base path; `req.nextUrl.clone()` keeps
--              it. Fixed and redeployed the same day, so they are recorded as
--              'own' below rather than 'broken'.

alter table core.projects
  add column if not exists admin_auth text;

comment on column core.projects.admin_auth is
  'How the admin screen is guarded: hub | own | token | open | none | broken. Measured in a browser, not inferred.';

update core.projects set admin_auth = 'none', admin_url = null where number in
  ('04','05','06','07','08','09','10','11','12','13','14','17','18','19','20','23','24','25','26','29','30');

-- 21 answered 404 inside its own app; 27's admin routes are gated on a hostname
-- that the public deployment never has. Neither has a door to link to.
update core.projects set admin_auth = 'none', admin_url = null where number in ('21','27');

update core.projects set admin_auth = 'own',    admin_url = '/auth/sign-in'  where number = '01';
update core.projects set admin_auth = 'own',    admin_url = '/admin'         where number in ('02','03');
update core.projects set admin_auth = 'open',   admin_url = '/admin'         where number = '15';
update core.projects set admin_auth = 'hub',    admin_url = '/admin'         where number = '16';
update core.projects set admin_auth = 'own',    admin_url = '/admin/login'   where number = '22';
update core.projects set admin_auth = 'token'                                where number = '28';
update core.projects set admin_auth = 'own',    admin_url = '/auth'          where number = '31';
update core.projects set admin_auth = 'token',  admin_url = '/admin'         where number = '32';

-- 33 is this board. It was still pointing at /nihul, which now only redirects.
update core.projects
   set admin_auth = 'hub',
       admin_url = 'https://more30.com/admin',
       supabase_project = 'uhnrgujbdxhhmoxcjria'
 where number = '33';

-- The admin view has to carry the new column or the board can't see it.
-- `create or replace view` cannot insert a column into the middle of the list
-- ("cannot change name of view column"), so admin_auth is appended at the end.
create or replace view public.more30_project_overview as
  select p.number, p.slug, p.name, p.name_he, p.what_it_does, p.functions,
         p.department, p.category, p.stage, p.live, p.is_deployed,
         p.deploy_target, p.live_url, p.old_url, p.admin_url,
         p.is_protected, p.to_delete, p.supabase_project, p.supabase_schema,
         p.note, p.fixed_notes, p.changed_notes,
         coalesce(b.open_bugs,    0::bigint) as open_bugs,
         coalesce(t.open_tasks,   0::bigint) as open_tasks,
         coalesce(m.missing_count,0::bigint) as missing_tokens,
         p.path, p.tagline, p.public_visible,
         p.audit_class, p.audit_status, p.audit_real_data, p.audit_deploy_ok,
         p.audit_live_ok, p.audit_evidence, p.replaced_by, p.audit_gaps,
         p.audit_revenue, p.audited_at,
         p.admin_auth
    from core.projects p
    left join (select project_num, count(*) as open_bugs
                 from core.project_bugs where status <> 'closed'
                group by project_num) b on b.project_num = p.number
    left join (select project_num, count(*) as open_tasks
                 from core.project_tasks where status <> 'done'
                group by project_num) t on t.project_num = p.number
    left join (select project_num, count(*) as missing_count
                 from core.missing_tokens where status = 'missing'
                group by project_num) m on m.project_num = p.number
   order by p.number;

-- 0008 closed this view to anon and authenticated; recreating it restores the
-- default grants, so shut it again. Reads go through more30_admin_snapshot().
revoke all on public.more30_project_overview from anon, authenticated;
