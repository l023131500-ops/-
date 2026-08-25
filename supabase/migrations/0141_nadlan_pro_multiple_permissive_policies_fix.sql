-- 0141_nadlan_pro_multiple_permissive_policies_fix.sql
--
-- get_advisors (performance) flagged nadlan_pro.offices, nadlan_pro.office_members,
-- and nadlan_pro.contract_templates with multiple_permissive_policies (5 roles x 3
-- tables = 15 warnings): each table carries a read-only SELECT policy PLUS a
-- separate "write" policy declared FOR ALL -- so for every SELECT, Postgres has to
-- evaluate and OR together two permissive policies instead of one.
--
-- These three tables are the only ones in the schema with genuinely different
-- read vs. write conditions (any active office member may read; only an
-- owner/manager -- manages_office() -- may write), unlike contacts/deals/
-- properties which use a single ALL policy because their read and write
-- conditions are identical (can_touch()). The write policy's own SELECT arm is
-- redundant here: manages_office() is already a strict subset of the read
-- policy's my_office_ids()/is_super_admin() check, so no row becomes visible or
-- invisible by removing SELECT from the write policy -- it only removes
-- duplicate policy evaluation.
--
-- Fix: replace each FOR ALL write policy with three explicit non-SELECT
-- policies (INSERT/UPDATE/DELETE), same USING/WITH CHECK expressions as before.
-- Verified live in BEGIN/ROLLBACK against the real QA office with three real
-- users (owner, a temporarily-added plain agent, and an outsider from a
-- different office): owner full read/write unchanged, agent read-only
-- unchanged (write attempts blocked exactly as before), outsider sees zero
-- rows on all three tables -- identical to pre-fix behavior.

drop policy np_tpl_write on nadlan_pro.contract_templates;
create policy np_tpl_write_ins on nadlan_pro.contract_templates
  for insert to public
  with check ((office_id is not null) and nadlan_pro.manages_office(office_id));
create policy np_tpl_write_upd on nadlan_pro.contract_templates
  for update to public
  using ((office_id is not null) and nadlan_pro.manages_office(office_id))
  with check ((office_id is not null) and nadlan_pro.manages_office(office_id));
create policy np_tpl_write_del on nadlan_pro.contract_templates
  for delete to public
  using ((office_id is not null) and nadlan_pro.manages_office(office_id));

drop policy np_members_write on nadlan_pro.office_members;
create policy np_members_write_ins on nadlan_pro.office_members
  for insert to public
  with check (nadlan_pro.manages_office(office_id));
create policy np_members_write_upd on nadlan_pro.office_members
  for update to public
  using (nadlan_pro.manages_office(office_id))
  with check (nadlan_pro.manages_office(office_id));
create policy np_members_write_del on nadlan_pro.office_members
  for delete to public
  using (nadlan_pro.manages_office(office_id));

drop policy np_offices_write on nadlan_pro.offices;
create policy np_offices_write_ins on nadlan_pro.offices
  for insert to public
  with check (nadlan_pro.manages_office(id));
create policy np_offices_write_upd on nadlan_pro.offices
  for update to public
  using (nadlan_pro.manages_office(id))
  with check (nadlan_pro.manages_office(id));
create policy np_offices_write_del on nadlan_pro.offices
  for delete to public
  using (nadlan_pro.manages_office(id));
