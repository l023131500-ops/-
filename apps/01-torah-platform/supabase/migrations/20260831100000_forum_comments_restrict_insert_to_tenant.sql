-- forum_comments RLS had drifted since two undocumented 2026-08-25 rounds
-- ("multiple_permissive_policies_fix"/"_gap", applied live via MCP, never
-- committed as migration files in this repo -- confirmed via list_migrations
-- vs. this directory) away from the original tenant-scoped design in
-- 20260519000002_torah_content.sql into two live gaps:
--
-- 1) `fcom_read` (SELECT) had qual = `true` -- fully public, and `anon`
--    (unauthenticated, table-privilege confirmed) could read every tenant's
--    private forum comments, regardless of tenant membership or whether the
--    parent post itself was even readable.
-- 2) A duplicate permissive INSERT policy `fcom_write_ins` (`user_id =
--    auth.uid()` only, no tenant check) coexisted alongside `fcom_insert`.
--    Postgres OR's multiple permissive policies for the same command, so
--    `fcom_write_ins` alone let ANY authenticated user -- regardless of
--    tenant membership -- insert a comment onto ANY forum post from ANY
--    tenant. Verified live in a rolled-back transaction: a user with zero
--    tenant_id memberships anywhere successfully inserted a comment on a
--    different tenant's private forum post.
--
-- Fix: consolidate SELECT and INSERT into single policies, scoped by the
-- parent post's tenant using the same authorization forum_posts itself now
-- requires (tenant_admin/moderator/member/super_admin, or the post's
-- category is global i.e. tenant_id is null). UPDATE/DELETE
-- (fcom_write_upd/fcom_write_del, self-row-or-super_admin) are already
-- correctly scoped and untouched. Uses the `(select auth.uid())` wrapping
-- already established repo-wide by 20260825184210_rls_initplan_perf for the
-- auth_rls_initplan advisor lint.
drop policy if exists "fcom_read" on public.forum_comments;
drop policy if exists "fcom_insert" on public.forum_comments;
drop policy if exists "fcom_write_ins" on public.forum_comments;

create policy "fcom_read" on public.forum_comments
  for select using (
    exists (
      select 1 from public.forum_posts fp
      where fp.id = forum_comments.post_id
        and (
          fp.tenant_id is null
          or public.is_super_admin((select auth.uid()))
          or public.has_tenant_role((select auth.uid()), fp.tenant_id, 'tenant_admin')
          or public.has_tenant_role((select auth.uid()), fp.tenant_id, 'moderator')
          or public.has_tenant_role((select auth.uid()), fp.tenant_id, 'member')
        )
    )
  );

create policy "fcom_insert" on public.forum_comments
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.forum_posts fp
      where fp.id = forum_comments.post_id
        and (
          fp.tenant_id is null
          or public.is_super_admin((select auth.uid()))
          or public.has_tenant_role((select auth.uid()), fp.tenant_id, 'tenant_admin')
          or public.has_tenant_role((select auth.uid()), fp.tenant_id, 'moderator')
          or public.has_tenant_role((select auth.uid()), fp.tenant_id, 'member')
        )
    )
  );
