-- 0139_nadlan_pro_forum_rls_initplan_fix.sql
--
-- get_advisors (performance) flagged all 7 RLS policies on nadlan_pro.forum_posts
-- and nadlan_pro.forum_comments (added 25/08 in 0128_nadlan_pro_forum.sql) with
-- auth_rls_initplan: each policy calls auth.uid() directly, so Postgres
-- re-evaluates it per row instead of once per statement. Every other nadlan_pro
-- table avoids this by routing through STABLE SECURITY DEFINER wrapper
-- functions (can_touch/manages_office/my_office_ids) whose internal auth.uid()
-- calls are opaque to the linter; forum_posts/forum_comments are the only two
-- tables in the schema with auth.uid() written directly inside a policy.
--
-- Fix: wrap every direct auth.uid() call in these 7 policies as
-- (select auth.uid()), per Supabase's documented remediation. Pure
-- rewrite of USING/WITH CHECK expressions via ALTER POLICY -- same boolean
-- result for every row, same roles, no permission/visibility change.

alter policy np_forum_posts_select on nadlan_pro.forum_posts
  using (
    exists (
      select 1 from nadlan_pro.office_members m
      where m.user_id = (select auth.uid()) and m.is_active
    )
  );

alter policy np_forum_posts_insert on nadlan_pro.forum_posts
  with check (
    created_by = (select auth.uid())
    and office_id in (select nadlan_pro.my_office_ids())
  );

alter policy np_forum_posts_update on nadlan_pro.forum_posts
  using (created_by = (select auth.uid()))
  with check (
    created_by = (select auth.uid())
    and office_id in (select nadlan_pro.my_office_ids())
  );

alter policy np_forum_posts_delete on nadlan_pro.forum_posts
  using (
    created_by = (select auth.uid())
    or nadlan_pro.manages_office(office_id)
  );

alter policy np_forum_comments_select on nadlan_pro.forum_comments
  using (
    exists (
      select 1 from nadlan_pro.office_members m
      where m.user_id = (select auth.uid()) and m.is_active
    )
  );

alter policy np_forum_comments_insert on nadlan_pro.forum_comments
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from nadlan_pro.office_members m
      where m.user_id = (select auth.uid()) and m.is_active
    )
  );

alter policy np_forum_comments_delete on nadlan_pro.forum_comments
  using (created_by = (select auth.uid()));
