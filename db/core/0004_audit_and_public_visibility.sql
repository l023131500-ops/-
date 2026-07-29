-- 0004 — audit of the 33 systems + a reversible public-visibility switch.
--
-- The portal (more30.com) used to show every non-protected system that had a
-- path. That put half-built systems and superseded duplicates next to the ones
-- that actually work. `public_visible` is the switch: the site shows only rows
-- where it is true, the admin keeps seeing everything with its real status.
-- Flipping the flag back is the whole rollback — no data is deleted, and the
-- audit columns stay as the written record of why a system was hidden.

alter table core.projects
  add column if not exists public_visible    boolean not null default true,
  add column if not exists audit_class       text,     -- A = quality/public, B = not ready/hidden, C = superseded
  add column if not exists audit_status      text,     -- the real state, in words
  add column if not exists audit_real_data   boolean,  -- backed by real data (not seed/demo)?
  add column if not exists audit_deploy_ok   boolean,  -- latest production deployment READY?
  add column if not exists audit_live_ok     boolean,  -- the live URL serves the system itself?
  add column if not exists audit_evidence    text,     -- what was measured, so the verdict can be re-checked
  add column if not exists replaced_by       text,     -- project number of the stronger version
  add column if not exists audit_gaps        text,     -- what is missing before it can carry a paid subscription
  add column if not exists audit_revenue     text,     -- the shortest path to money
  add column if not exists audited_at        timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_audit_class_chk') then
    alter table core.projects
      add constraint projects_audit_class_chk check (audit_class in ('A','B','C')) not valid;
  end if;
end $$;

comment on column core.projects.public_visible is
  'Shown on more30.com. Reversible switch — false hides from the public site only, never from the admin.';

create or replace view public.more30_project_overview as
 select p.number, p.slug, p.name, p.name_he, p.what_it_does, p.functions,
        p.department, p.category, p.stage, p.live, p.is_deployed, p.deploy_target,
        p.live_url, p.old_url, p.admin_url, p.is_protected, p.to_delete,
        p.supabase_project, p.supabase_schema, p.note, p.fixed_notes, p.changed_notes,
        coalesce(b.open_bugs, 0::bigint)      as open_bugs,
        coalesce(t.open_tasks, 0::bigint)     as open_tasks,
        coalesce(m.missing_count, 0::bigint)  as missing_tokens,
        p.path, p.tagline,
        p.public_visible, p.audit_class, p.audit_status, p.audit_real_data,
        p.audit_deploy_ok, p.audit_live_ok, p.audit_evidence, p.replaced_by,
        p.audit_gaps, p.audit_revenue, p.audited_at
   from core.projects p
   left join (select project_num, count(*) as open_bugs
                from core.project_bugs where status <> 'closed' group by project_num) b
          on b.project_num = p.number
   left join (select project_num, count(*) as open_tasks
                from core.project_tasks where status <> 'done' group by project_num) t
          on t.project_num = p.number
   left join (select project_num, count(*) as missing_count
                from core.missing_tokens where status = 'missing' group by project_num) m
          on m.project_num = p.number
  order by p.number;
