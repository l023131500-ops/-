-- get_advisors(performance) flags teacher_features/teacher_forum_access with
-- "multiple_permissive_policies" for SELECT (WARN): each table's `_read`
-- policy (for select using (true)) and `_write` policy (for all ...) both
-- apply to SELECT, so Postgres evaluates is_super_admin() on every read for
-- nothing -- the read policy already lets everyone through. Same bug class
-- already fixed on tenant_features (see live policies features_write_ins/
-- _upd/_del) one day before teacher_features/teacher_forum_access existed,
-- so it never got that fix. Mirrors that exact split: replace the single
-- `for all` policy with per-command INSERT/UPDATE/DELETE policies, dropping
-- SELECT from their scope entirely. Effective permissions are unchanged --
-- reads were already world-open via `_read`, and only insert/update/delete
-- were ever gated on is_super_admin().

drop policy if exists "teacher_features_write" on public.teacher_features;
create policy "teacher_features_write_ins" on public.teacher_features for insert
  with check (is_super_admin((select auth.uid())));
create policy "teacher_features_write_upd" on public.teacher_features for update
  using (is_super_admin((select auth.uid())))
  with check (is_super_admin((select auth.uid())));
create policy "teacher_features_write_del" on public.teacher_features for delete
  using (is_super_admin((select auth.uid())));

drop policy if exists "teacher_forum_access_write" on public.teacher_forum_access;
create policy "teacher_forum_access_write_ins" on public.teacher_forum_access for insert
  with check (is_super_admin((select auth.uid())));
create policy "teacher_forum_access_write_upd" on public.teacher_forum_access for update
  using (is_super_admin((select auth.uid())))
  with check (is_super_admin((select auth.uid())));
create policy "teacher_forum_access_write_del" on public.teacher_forum_access for delete
  using (is_super_admin((select auth.uid())));
