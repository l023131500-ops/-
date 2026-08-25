-- 0149_torah_platform_unindexed_foreign_keys_fix.sql
--
-- get_advisors (performance) on the torah-platform project (bieebmnmkffwbqlsfozh)
-- flags 38 unindexed_foreign_keys in the public schema, but that schema is shared
-- with other apps hosted on the same project (fin_* / pc_* / crm_* / client_* /
-- hf_* / zr_* / rc_*, none of which belong to 01 torah-platform and are out of
-- scope for this slice). Of the 38, 19 FK columns across 14 tables are verified
-- torah-platform-owned (cross-checked against the table list this app's prior
-- migrations already touch: tenants/leads/portal_messages/rabbi_questions/ads
-- etc.). A missing covering index on an FK column forces a sequential scan on
-- the child table for every parent-row lookup driven by that FK (RLS predicate
-- joins, ON DELETE CASCADE/SET NULL checks, and app joins/filters by these
-- columns all hit this). Purely additive -- CREATE INDEX IF NOT EXISTS, no
-- policy/schema/data change, safe to run live.

create index if not exists audit_log_user_id_idx
  on public.audit_log (user_id);
create index if not exists lesson_bookmarks_lesson_id_idx
  on public.lesson_bookmarks (lesson_id);
create index if not exists newsletters_tenant_id_idx
  on public.newsletters (tenant_id);
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);
create index if not exists order_items_tenant_id_idx
  on public.order_items (tenant_id);
create index if not exists participants_user_id_idx
  on public.participants (user_id);
create index if not exists portal_messages_to_user_id_idx
  on public.portal_messages (to_user_id);
create index if not exists premium_requests_app_user_id_idx
  on public.premium_requests (app_user_id);
create index if not exists product_categories_parent_id_idx
  on public.product_categories (parent_id);
create index if not exists profiles_preferred_tenant_id_idx
  on public.profiles (preferred_tenant_id);
create index if not exists rabbi_questions_rabbi_user_id_idx
  on public.rabbi_questions (rabbi_user_id);
create index if not exists study_schedules_lesson_id_idx
  on public.study_schedules (lesson_id);
create index if not exists study_schedules_owner_user_id_idx
  on public.study_schedules (owner_user_id);
create index if not exists tenant_ads_synagogue_id_idx
  on public.tenant_ads (synagogue_id);
create index if not exists tenant_ads_teacher_id_idx
  on public.tenant_ads (teacher_id);
create index if not exists tenant_invites_created_by_idx
  on public.tenant_invites (created_by);
create index if not exists tenant_invites_tenant_id_idx
  on public.tenant_invites (tenant_id);
create index if not exists tenant_invites_user_id_idx
  on public.tenant_invites (user_id);
create index if not exists user_sessions_app_user_id_idx
  on public.user_sessions (app_user_id);
