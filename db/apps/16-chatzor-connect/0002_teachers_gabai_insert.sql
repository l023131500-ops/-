-- ============================================================================
-- Chatzor Connect — schema `chatzor` (migration 0002)
-- ----------------------------------------------------------------------------
-- Additive only. Lets a gabai (synagogue admin, not org admin) create a new
-- teacher row when entering a lesson -- needed by createLesson's
-- resolve-or-create teacher lookup (core.issues #247). Does not touch any
-- existing table, column, or policy.
-- ⚠️ Already APPLIED live via Supabase MCP apply_migration on uhnrgujbdxhhmoxcjria
--    (19/08/2026) — this file mirrors that change for the repo record.
-- ============================================================================

create or replace function chatzor.manages_org_synagogue(org uuid)
returns boolean language sql stable security definer set search_path = chatzor as $$
  select exists (
    select 1 from chatzor.synagogue_admins sa
    join chatzor.synagogues s on s.id = sa.synagogue_id
    where s.organization_id = org and sa.user_id = auth.uid()
  );
$$;

create policy "teachers gabai insert" on chatzor.teachers
  for insert
  with check (chatzor.manages_org_synagogue(organization_id));
