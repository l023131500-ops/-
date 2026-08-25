-- Follow-up to 20260825190000_rls_initplan_perf.sql: that migration's
-- hardcoded table list (chosen from the migrations tracked in this repo at
-- the time) omitted two tables that are also owned by this app and also had
-- unwrapped auth.uid() calls in their RLS policies -- lesson_bookmarks
-- (src/pages/.../LessonBookmarks usage) and nedarim_submissions (Nedarim
-- Plus intake). Re-run of get_advisors after that migration still showed
-- auth_rls_initplan on 4 policies across these 2 tables.
--
-- Same fix as before: wrap auth.uid() in `(select auth.uid())` so Postgres
-- evaluates it once per query (InitPlan) instead of once per row. Pure
-- rewrite of the same boolean expression -- no access is broadened or
-- narrowed.
alter policy lesson_bookmarks_delete_own on public.lesson_bookmarks
  using (user_id = (select auth.uid()));

alter policy lesson_bookmarks_insert_own on public.lesson_bookmarks
  with check (user_id = (select auth.uid()));

alter policy lesson_bookmarks_select_own on public.lesson_bookmarks
  using (user_id = (select auth.uid()));

alter policy nedarim_submissions_admin_only on public.nedarim_submissions
  using (is_super_admin((select auth.uid())))
  with check (is_super_admin((select auth.uid())));
