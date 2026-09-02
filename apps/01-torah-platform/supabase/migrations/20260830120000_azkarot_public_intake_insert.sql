-- azkarot_tenant_write_ins never got the tenant_accepts_public_intake(tenant_id)
-- OR-clause that leads_insert / portal_messages_insert / rabbi_questions_insert
-- already carry (see 20260825220000/20260826080000). public/Azkarot.tsx is a
-- public, no-login page ("/azkarot") whose "רישום אזכרה חדשה" form inserts as
-- anon -- with only the tenant-role clause, every real anonymous submission
-- was rejected by RLS (42501), verified live via a rolled-back anon-role
-- transaction before this fix.
drop policy if exists "azkarot_tenant_write_ins" on public.azkarot;
create policy "azkarot_tenant_write_ins" on public.azkarot
  for insert
  with check (
    tenant_accepts_public_intake(tenant_id)
    or is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
  );
