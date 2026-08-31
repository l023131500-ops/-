-- rabbi_questions_tenant_read used `user_in_tenant(tenant_id) OR (is_public = true
-- AND answer IS NOT NULL)`. `user_in_tenant` is true for ANY member of the tenant
-- (see its source: is_super_admin OR tenant_id in user_tenants(uid)) -- it does not
-- distinguish moderator/tenant_admin from a plain `member`. So any signed-in
-- member of the tenant could `.from("rabbi_questions").select("*")` and read every
-- OTHER member's private and/or anonymous question, including `from_name` and
-- `from_email`, before any rabbi ever answered it -- a live PII leak, distinct from
-- (and upstream of) the write-side fake-answer gap already closed in
-- 20260831080000. public/RabbiQuestions.tsx only ever queries
-- `is_public=true and answer is not null` client-side, but that is UI filtering,
-- not a security boundary -- RLS is. Verified live in a rolled-back transaction:
-- a plain `member` could read a `is_public=false` row's from_name/from_email/
-- question in full before this fix.
--
-- The same over-broad grant applies to `rabbi_questions_tenant_write_del`: a plain
-- `member` can delete ANY question in the tenant, not just moderate their own --
-- and since this table has no submitted-by/owner column, "their own" isn't even
-- expressible, so there is no legitimate member use case for either broad read or
-- delete. admin/RabbiQuestions.tsx (the only screen that lists+answers all
-- questions) is a moderator/tenant_admin-only screen per its nav placement, so
-- restricting full read+delete to moderator/tenant_admin/super_admin (matching the
-- UPDATE/INSERT policies already fixed) does not remove any legitimate capability.
-- Public/anon access to public+answered questions is unchanged.

drop policy if exists rabbi_questions_tenant_read on public.rabbi_questions;
create policy rabbi_questions_tenant_read on public.rabbi_questions
for select
using (
  public.is_super_admin(( select auth.uid() ))
  or public.has_tenant_role(( select auth.uid() ), tenant_id, 'tenant_admin'::app_role)
  or public.has_tenant_role(( select auth.uid() ), tenant_id, 'moderator'::app_role)
  or (is_public = true and answer is not null)
);

drop policy if exists rabbi_questions_tenant_write_del on public.rabbi_questions;
create policy rabbi_questions_tenant_write_del on public.rabbi_questions
for delete
using (
  public.is_super_admin(( select auth.uid() ))
  or public.has_tenant_role(( select auth.uid() ), tenant_id, 'tenant_admin'::app_role)
  or public.has_tenant_role(( select auth.uid() ), tenant_id, 'moderator'::app_role)
);
