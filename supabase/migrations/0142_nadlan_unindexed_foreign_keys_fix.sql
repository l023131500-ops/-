-- 0142_nadlan_unindexed_foreign_keys_fix.sql
--
-- get_advisors (performance) flagged 26 foreign key columns across nadlan (2)
-- and nadlan_pro (24) with unindexed_foreign_keys: a covering btree index is
-- missing on the FK column itself, which forces a sequential scan on the
-- child table for every parent-row lookup driven by that FK (RLS predicates
-- like nadlan_pro.can_touch()/manages_office(), FK-triggered ON DELETE
-- CASCADE/SET NULL checks, and app joins/filters by these columns all hit
-- this). Purely additive -- CREATE INDEX IF NOT EXISTS, no policy/schema/data
-- change, safe to run live.

-- nadlan (2)
create index if not exists rental_data_property_id_idx
  on nadlan.rental_data (property_id);
create index if not exists report_exports_property_id_idx
  on nadlan.report_exports (property_id);

-- nadlan_pro (24)
create index if not exists activities_created_by_idx
  on nadlan_pro.activities (created_by);
create index if not exists activities_property_id_idx
  on nadlan_pro.activities (property_id);
create index if not exists commissions_member_id_idx
  on nadlan_pro.commissions (member_id);
create index if not exists contract_templates_office_id_idx
  on nadlan_pro.contract_templates (office_id);
create index if not exists contracts_created_by_idx
  on nadlan_pro.contracts (created_by);
create index if not exists contracts_template_id_idx
  on nadlan_pro.contracts (template_id);
create index if not exists deal_checklist_done_by_idx
  on nadlan_pro.deal_checklist (done_by);
create index if not exists deal_stage_events_changed_by_idx
  on nadlan_pro.deal_stage_events (changed_by);
create index if not exists deals_buyer_contact_id_idx
  on nadlan_pro.deals (buyer_contact_id);
create index if not exists deals_property_id_idx
  on nadlan_pro.deals (property_id);
create index if not exists deals_seller_contact_id_idx
  on nadlan_pro.deals (seller_contact_id);
create index if not exists forum_comments_created_by_idx
  on nadlan_pro.forum_comments (created_by);
create index if not exists forum_posts_created_by_idx
  on nadlan_pro.forum_posts (created_by);
create index if not exists invoices_contact_id_idx
  on nadlan_pro.invoices (contact_id);
create index if not exists invoices_created_by_idx
  on nadlan_pro.invoices (created_by);
create index if not exists leases_landlord_contact_id_idx
  on nadlan_pro.leases (landlord_contact_id);
create index if not exists leases_tenant_contact_id_idx
  on nadlan_pro.leases (tenant_contact_id);
create index if not exists office_invites_created_by_idx
  on nadlan_pro.office_invites (created_by);
create index if not exists office_invites_used_by_idx
  on nadlan_pro.office_invites (used_by);
create index if not exists office_members_user_id_idx
  on nadlan_pro.office_members (user_id);
create index if not exists offices_created_by_idx
  on nadlan_pro.offices (created_by);
create index if not exists properties_seller_contact_id_idx
  on nadlan_pro.properties (seller_contact_id);
create index if not exists property_documents_uploaded_by_idx
  on nadlan_pro.property_documents (uploaded_by);
create index if not exists signatures_contact_id_idx
  on nadlan_pro.signatures (contact_id);
