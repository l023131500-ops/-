-- 0148_torah_platform_multiple_permissive_policies_gap.sql
--
-- Follow-up to 0147: get_advisors (performance) on the torah-platform project
-- (bieebmnmkffwbqlsfozh) still showed 24 multiple_permissive_policies warnings on
-- public-schema tables after 0147 landed. Three distinct gaps, all in-scope for
-- 01 torah-platform (verified each table's columns/policies belong to the hub, not
-- to the other apps sharing this project's public schema):
--
-- 1) public.ads was missing from 0147's table list even though it has the exact
--    same shape as the other 34 tables that migration fixed: a FOR ALL write
--    policy (ads_tenant_write) alongside a separate read-only SELECT policy
--    (ads_tenant_read). Same subset proof applies: has_tenant_role(uid, tenant_id,
--    role) already ORs in is_super_admin(uid) internally, and a true
--    'tenant_admin'/'moderator'/'member' match puts tenant_id in
--    user_tenants(uid) -- which is exactly what user_in_tenant(tenant_id) checks,
--    and ads_tenant_read accepts user_in_tenant(tenant_id) as one of its OR arms.
--    So ads_tenant_write's condition is always a subset of ads_tenant_read's --
--    splitting into INSERT/UPDATE/DELETE-only removes the duplicate SELECT
--    evaluation with zero behavior change, same as 0147.
--
-- 2) leads / portal_messages / rabbi_questions each carry TWO permissive INSERT
--    policies: an {anon}-only public-intake policy and a {public}-role
--    tenant-member policy. Postgres flags this as "multiple permissive policies
--    for role anon" because the {public} policy also covers anon. Fix: merge both
--    conditions into a single INSERT policy with OR, which is behavior-identical
--    for every role (not just anon) regardless of any subset assumption.
--
-- 3) public.tenants was deliberately excluded from 0147 because
--    tenants_super_admin_all's condition (is_super_admin) is NOT a subset of
--    tenants_read_public's (status = 'active') -- a super admin also needs to see
--    pending/suspended/archived tenants, so naively dropping the ALL policy's
--    SELECT arm would have hidden those rows from admins (a real regression, not
--    just a perf fix). Fixed properly here via OR-merge instead of subset-based
--    splitting:
--      - SELECT: one policy = status='active' OR is_super_admin(...), the exact
--        union of the two original SELECT-capable policies.
--      - UPDATE: tenants_admin_update_own's own condition
--        (has_tenant_role(uid, id, 'tenant_admin')) already internally ORs
--        is_super_admin(uid) -- see has_tenant_role's definition -- so it already
--        equals the old union of {is_super_admin, has_tenant_role(...,'tenant_admin')}.
--        Left untouched; only the ALL policy's redundant UPDATE arm is dropped.
--      - INSERT/DELETE: only the ALL policy ever granted these (super-admin-only,
--        not previously flagged as duplicated), so they get their own explicit
--        policies to preserve exactly that behavior.
--
-- `zr_*` tables carry the same multiple_permissive_policies warning but are
-- explicitly out of scope (protected schema/feature per project rules) -- left
-- untouched.
--
-- Verified live via a BEGIN/ROLLBACK smoke test against real tenant rows plus a
-- temporary pending tenant and a temporary tenant_admin role grant on a QA user
-- (both rolled back, zero residue): super_admin sees pending+active tenants (1
-- pending, 5 active); a non-super tenant_admin and anon each still see 0 pending /
-- 5 active; tenant_admin can update their own tenant but not another tenant (0
-- rows affected); tenant_admin can insert an ad into their own tenant but is
-- rejected inserting into a tenant they don't manage; anon can insert a
-- lead/portal_message into an active public-intake tenant but is rejected for a
-- pending tenant; anon can insert a valid-shape rabbi_question but is rejected
-- when pre-setting `answer`; anon is still rejected inserting into `ads` (no anon
-- write policy exists there, unchanged). get_advisors re-run after applying live:
-- public.multiple_permissive_policies dropped from 24 to 6 (the remaining 6 are
-- all `zr_*`, out of scope). No new security/performance findings introduced.

-- ads
DROP POLICY IF EXISTS ads_tenant_write ON public.ads;

CREATE POLICY ads_tenant_write_ins ON public.ads FOR INSERT WITH CHECK (
  public.is_super_admin((select auth.uid()))
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
);

CREATE POLICY ads_tenant_write_upd ON public.ads FOR UPDATE USING (
  public.is_super_admin((select auth.uid()))
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
) WITH CHECK (
  public.is_super_admin((select auth.uid()))
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
);

CREATE POLICY ads_tenant_write_del ON public.ads FOR DELETE USING (
  public.is_super_admin((select auth.uid()))
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
);

-- leads
DROP POLICY IF EXISTS leads_public_insert ON public.leads;
DROP POLICY IF EXISTS leads_tenant_write_ins ON public.leads;
CREATE POLICY leads_insert ON public.leads FOR INSERT WITH CHECK (
  public.tenant_accepts_public_intake(tenant_id)
  OR public.is_super_admin((select auth.uid()))
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
);

-- portal_messages
DROP POLICY IF EXISTS portal_messages_public_insert ON public.portal_messages;
DROP POLICY IF EXISTS portal_messages_tenant_write_ins ON public.portal_messages;
CREATE POLICY portal_messages_insert ON public.portal_messages FOR INSERT WITH CHECK (
  public.tenant_accepts_public_intake(tenant_id)
  OR public.is_super_admin((select auth.uid()))
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
);

-- rabbi_questions
DROP POLICY IF EXISTS rabbi_questions_public_insert ON public.rabbi_questions;
DROP POLICY IF EXISTS rabbi_questions_tenant_write_ins ON public.rabbi_questions;
CREATE POLICY rabbi_questions_insert ON public.rabbi_questions FOR INSERT WITH CHECK (
  (public.tenant_accepts_public_intake(tenant_id) AND (answer IS NULL) AND (COALESCE(is_public, false) = false))
  OR public.is_super_admin((select auth.uid()))
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
  OR public.has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
);

-- tenants
DROP POLICY IF EXISTS tenants_super_admin_all ON public.tenants;
DROP POLICY IF EXISTS tenants_read_public ON public.tenants;

CREATE POLICY tenants_read ON public.tenants FOR SELECT USING (
  status = 'active'::tenant_status OR public.is_super_admin((select auth.uid()))
);

CREATE POLICY tenants_super_admin_insert ON public.tenants FOR INSERT WITH CHECK (
  public.is_super_admin((select auth.uid()))
);

CREATE POLICY tenants_super_admin_delete ON public.tenants FOR DELETE USING (
  public.is_super_admin((select auth.uid()))
);
-- tenants_admin_update_own is left untouched (see rationale above).
