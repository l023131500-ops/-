-- 0007 — a lean public view for the site, separate from the admin view.
--
-- Two problems with the site reading `more30_project_overview` directly:
--
-- 1. That view is the *admin* view. It carries `fixed_notes`, `changed_notes`,
--    `missing_tokens`, `admin_url` and the whole audit trail — and anon holds
--    SELECT on it. Every visitor could read which secrets are missing from which
--    system and where each admin panel lives. Nothing there belongs on a
--    marketing site, and the site never used any of it.
--
-- 2. The visibility rules (public_visible, has a path, not protected, not marked
--    for deletion) were being re-applied in the browser. Rules that decide what
--    the world sees belong next to the data, not in a bundle that can be stale.
--
-- This view answers exactly one question — "which systems does more30.com show,
-- and what does it say about them" — and carries nothing else. Ordering is here
-- too, so the site doesn't have to know that the number is the sort key.

create or replace view public.more30_public_systems as
  select p.number,
         p.path,
         coalesce(nullif(p.name_he, ''), p.name) as title,
         p.tagline,
         p.what_it_does,
         p.department,
         p.live,
         p.is_deployed,
         p.live_url
    from core.projects p
   where p.public_visible is true
     and p.path is not null
     and p.path <> ''
     and coalesce(p.is_protected, false) is false
     and coalesce(p.to_delete, false) is false
   order by p.number;

comment on view public.more30_public_systems is
  'What more30.com lists. Read-only for anon; the visibility rules live here, not in the client bundle.';

-- Read-only, for everyone. Writing goes through core.projects and the admin RPCs.
revoke all on public.more30_public_systems from anon, authenticated;
grant select on public.more30_public_systems to anon, authenticated;
