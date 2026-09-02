-- Second follow-up to 20260825190000_rls_initplan_perf.sql /
-- 20260825200000_rls_initplan_perf_remainder.sql: a fresh get_advisors
-- (performance) run on 31/08 still flagged auth_rls_initplan on 3 more
-- service-role-only policies that weren't in either earlier sweep's table
-- list (params_topics, potential_links, potential_submissions -- the
-- MatchingGuru AI-teacher-matching tables). Same fix as before: wrap
-- auth.role() in `(select auth.role())` so Postgres evaluates it once per
-- query (InitPlan) instead of once per row. Pure rewrite of the same
-- boolean expression -- no access is broadened or narrowed.
alter policy params_topics_service_full on public.params_topics
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy potential_links_service_role_full on public.potential_links
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy potential_submissions_service_role_full on public.potential_submissions
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

-- Same run also flagged unindexed_foreign_keys on
-- teacher_forum_access.category_id: its only index is the composite PK
-- (teacher_id, category_id), which doesn't cover lookups/joins keyed by
-- category_id alone (e.g. deleting a forum_categories row, or any query
-- filtering access by category). Add the missing covering index.
create index if not exists teacher_forum_access_category_id_idx
  on public.teacher_forum_access (category_id);
