-- study_schedules/study_daily: RLS granted 'member' the same row-level
-- INSERT/UPDATE/DELETE as moderator/tenant_admin (tenant-scoped, not
-- owner-scoped), even though study_schedules.owner_user_id already tracks
-- the creator and the portal UI (StudySchedule.tsx) never restricts its
-- edit/delete buttons to the owner's own rows. A plain tenant member could
-- call supabase.from("study_schedules")/"study_daily" .update()/.delete()
-- directly on any other member's study schedule or daily entries.
--
-- Restrict a plain 'member' actor to their own schedules (owner_user_id =
-- auth.uid()) and to daily entries under a schedule they own; moderator/
-- tenant_admin/super_admin keep unrestricted tenant access exactly as
-- before. INSERT is scoped the same way to prevent a member from forging
-- another user's owner_user_id (the UI never sets a different owner either).

drop policy if exists study_schedules_tenant_write_ins on public.study_schedules;
create policy study_schedules_tenant_write_ins on public.study_schedules
  for insert
  with check (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or (
      has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
      and (owner_user_id is null or owner_user_id = (select auth.uid()))
    )
  );

drop policy if exists study_schedules_tenant_write_upd on public.study_schedules;
create policy study_schedules_tenant_write_upd on public.study_schedules
  for update
  using (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or (
      has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
      and owner_user_id = (select auth.uid())
    )
  )
  with check (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or (
      has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
      and owner_user_id = (select auth.uid())
    )
  );

drop policy if exists study_schedules_tenant_write_del on public.study_schedules;
create policy study_schedules_tenant_write_del on public.study_schedules
  for delete
  using (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or (
      has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
      and owner_user_id = (select auth.uid())
    )
  );

drop policy if exists study_daily_tenant_write_ins on public.study_daily;
create policy study_daily_tenant_write_ins on public.study_daily
  for insert
  with check (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or (
      has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
      and exists (
        select 1 from public.study_schedules s
        where s.id = study_daily.schedule_id
          and (s.owner_user_id is null or s.owner_user_id = (select auth.uid()))
      )
    )
  );

drop policy if exists study_daily_tenant_write_upd on public.study_daily;
create policy study_daily_tenant_write_upd on public.study_daily
  for update
  using (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or (
      has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
      and exists (
        select 1 from public.study_schedules s
        where s.id = study_daily.schedule_id
          and s.owner_user_id = (select auth.uid())
      )
    )
  )
  with check (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or (
      has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
      and exists (
        select 1 from public.study_schedules s
        where s.id = study_daily.schedule_id
          and s.owner_user_id = (select auth.uid())
      )
    )
  );

drop policy if exists study_daily_tenant_write_del on public.study_daily;
create policy study_daily_tenant_write_del on public.study_daily
  for delete
  using (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or (
      has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
      and exists (
        select 1 from public.study_schedules s
        where s.id = study_daily.schedule_id
          and s.owner_user_id = (select auth.uid())
      )
    )
  );
