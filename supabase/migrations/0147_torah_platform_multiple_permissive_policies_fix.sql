-- 0147_torah_platform_multiple_permissive_policies_fix.sql
--
-- get_advisors (performance) flagged 34 public-schema tables on the torah-platform
-- project (bieebmnmkffwbqlsfozh) with multiple_permissive_policies: each carries a
-- read-only SELECT policy PLUS a separate write policy declared FOR ALL, so every
-- SELECT has to evaluate and OR together two permissive policies instead of one.
-- Same root cause and same fix shape as 0141 (nadlan_pro).
--
-- For every table below, the write policy's condition is a strict subset of (or
-- identical to) the read policy's condition:
--   - has_tenant_role(uid, tenant_id, role) already ORs in is_super_admin(uid)
--     internally, and any has_tenant_role(...,'member'|'moderator'|'tenant_admin')
--     match puts that tenant_id in user_tenants(uid) (via the user_roles branch),
--     so it always implies user_in_tenant(tenant_id) -- which most read policies
--     check directly or as part of a broader OR (tenant_id IS NULL / active tenant
--     exists).
--   - Several tables (forum_categories, forum_comments, lesson_topics, profiles,
--     tenant_branding, tenant_features, tips, user_roles, forum_access) have a
--     read policy that is unconditionally true or already contains the write
--     condition as one of its own OR arms.
-- So removing the write policy's implicit SELECT arm changes zero visible rows;
-- it only removes duplicate policy evaluation. `tenants` is deliberately excluded:
-- its super-admin ALL policy's SELECT arm is NOT a subset of tenants_read_public
-- (status='active'), since a super admin also needs to see inactive/pending
-- tenants -- collapsing it would be a real regression, not just a perf fix.
--
-- Fix: replace each FOR ALL write policy with three explicit non-SELECT policies
-- (INSERT/UPDATE/DELETE), same USING/WITH CHECK expressions as before (defaulting
-- WITH CHECK to the USING expression where the original had none, matching
-- Postgres' own default for FOR ALL policies without an explicit WITH CHECK).
-- Verified live via get_advisors re-run (all 170 SELECT-arm warnings for these
-- 34 tables gone) and a BEGIN/ROLLBACK smoke test against real tenant/lessons
-- rows confirming identical read/write/reject behavior before and after.

-- announcements
drop policy announcements_tenant_write on public.announcements;
create policy announcements_tenant_write_ins on public.announcements
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy announcements_tenant_write_upd on public.announcements
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy announcements_tenant_write_del on public.announcements
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- attendance
drop policy attendance_write on public.attendance;
create policy attendance_write_ins on public.attendance
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM participants p
  WHERE ((p.id = attendance.participant_id) AND (has_tenant_role(( SELECT auth.uid() AS uid), p.tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), p.tenant_id, 'member'::app_role)))))));
create policy attendance_write_upd on public.attendance
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM participants p
  WHERE ((p.id = attendance.participant_id) AND (has_tenant_role(( SELECT auth.uid() AS uid), p.tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), p.tenant_id, 'member'::app_role)))))))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM participants p
  WHERE ((p.id = attendance.participant_id) AND (has_tenant_role(( SELECT auth.uid() AS uid), p.tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), p.tenant_id, 'member'::app_role)))))));
create policy attendance_write_del on public.attendance
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM participants p
  WHERE ((p.id = attendance.participant_id) AND (has_tenant_role(( SELECT auth.uid() AS uid), p.tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), p.tenant_id, 'member'::app_role)))))));

-- azkarot
drop policy azkarot_tenant_write on public.azkarot;
create policy azkarot_tenant_write_ins on public.azkarot
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy azkarot_tenant_write_upd on public.azkarot
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy azkarot_tenant_write_del on public.azkarot
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- chat_messages
drop policy chat_messages_tenant_write on public.chat_messages;
create policy chat_messages_tenant_write_ins on public.chat_messages
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy chat_messages_tenant_write_upd on public.chat_messages
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy chat_messages_tenant_write_del on public.chat_messages
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- chat_rooms
drop policy chat_rooms_tenant_write on public.chat_rooms;
create policy chat_rooms_tenant_write_ins on public.chat_rooms
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy chat_rooms_tenant_write_upd on public.chat_rooms
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy chat_rooms_tenant_write_del on public.chat_rooms
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- community_services
drop policy community_services_tenant_write on public.community_services;
create policy community_services_tenant_write_ins on public.community_services
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy community_services_tenant_write_upd on public.community_services
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy community_services_tenant_write_del on public.community_services
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- donation_campaigns
drop policy campaigns_write on public.donation_campaigns;
create policy campaigns_write_ins on public.donation_campaigns
  for insert to public
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy campaigns_write_upd on public.donation_campaigns
  for update to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy campaigns_write_del on public.donation_campaigns
  for delete to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));

-- forum_access
drop policy fa_admin_write on public.forum_access;
create policy fa_admin_write_ins on public.forum_access
  for insert to public
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy fa_admin_write_upd on public.forum_access
  for update to public
  using (is_super_admin(( SELECT auth.uid() AS uid)))
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy fa_admin_write_del on public.forum_access
  for delete to public
  using (is_super_admin(( SELECT auth.uid() AS uid)));

-- forum_categories
drop policy fc_write on public.forum_categories;
create policy fc_write_ins on public.forum_categories
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((tenant_id IS NOT NULL) AND has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))));
create policy fc_write_upd on public.forum_categories
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((tenant_id IS NOT NULL) AND has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((tenant_id IS NOT NULL) AND has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))));
create policy fc_write_del on public.forum_categories
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR ((tenant_id IS NOT NULL) AND has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))));

-- forum_comments
drop policy fcom_write on public.forum_comments;
create policy fcom_write_ins on public.forum_comments
  for insert to public
  with check (((user_id = ( SELECT auth.uid() AS uid)) OR is_super_admin(( SELECT auth.uid() AS uid))));
create policy fcom_write_upd on public.forum_comments
  for update to public
  using (((user_id = ( SELECT auth.uid() AS uid)) OR is_super_admin(( SELECT auth.uid() AS uid))))
  with check (((user_id = ( SELECT auth.uid() AS uid)) OR is_super_admin(( SELECT auth.uid() AS uid))));
create policy fcom_write_del on public.forum_comments
  for delete to public
  using (((user_id = ( SELECT auth.uid() AS uid)) OR is_super_admin(( SELECT auth.uid() AS uid))));

-- gallery_images
drop policy gallery_images_tenant_write on public.gallery_images;
create policy gallery_images_tenant_write_ins on public.gallery_images
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy gallery_images_tenant_write_upd on public.gallery_images
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy gallery_images_tenant_write_del on public.gallery_images
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- halacha_daily
drop policy halacha_daily_tenant_write on public.halacha_daily;
create policy halacha_daily_tenant_write_ins on public.halacha_daily
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy halacha_daily_tenant_write_upd on public.halacha_daily
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy halacha_daily_tenant_write_del on public.halacha_daily
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- kashrut_certifications
drop policy kashrut_certifications_tenant_write on public.kashrut_certifications;
create policy kashrut_certifications_tenant_write_ins on public.kashrut_certifications
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy kashrut_certifications_tenant_write_upd on public.kashrut_certifications
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy kashrut_certifications_tenant_write_del on public.kashrut_certifications
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- leads
drop policy leads_tenant_write on public.leads;
create policy leads_tenant_write_ins on public.leads
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy leads_tenant_write_upd on public.leads
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy leads_tenant_write_del on public.leads
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- lesson_topics
drop policy topics_write on public.lesson_topics;
create policy topics_write_ins on public.lesson_topics
  for insert to public
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy topics_write_upd on public.lesson_topics
  for update to public
  using (is_super_admin(( SELECT auth.uid() AS uid)))
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy topics_write_del on public.lesson_topics
  for delete to public
  using (is_super_admin(( SELECT auth.uid() AS uid)));

-- lessons
drop policy lessons_tenant_write on public.lessons;
create policy lessons_tenant_write_ins on public.lessons
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy lessons_tenant_write_upd on public.lessons
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy lessons_tenant_write_del on public.lessons
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- materials
drop policy materials_tenant_write on public.materials;
create policy materials_tenant_write_ins on public.materials
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy materials_tenant_write_upd on public.materials
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy materials_tenant_write_del on public.materials
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- memberships
drop policy memberships_admin_write on public.memberships;
create policy memberships_admin_write_ins on public.memberships
  for insert to public
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy memberships_admin_write_upd on public.memberships
  for update to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy memberships_admin_write_del on public.memberships
  for delete to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));

-- newsletters
drop policy newsletters_tenant_write on public.newsletters;
create policy newsletters_tenant_write_ins on public.newsletters
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy newsletters_tenant_write_upd on public.newsletters
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy newsletters_tenant_write_del on public.newsletters
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- participants
drop policy participants_tenant_write on public.participants;
create policy participants_tenant_write_ins on public.participants
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy participants_tenant_write_upd on public.participants
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy participants_tenant_write_del on public.participants
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- portal_messages
drop policy portal_messages_tenant_write on public.portal_messages;
create policy portal_messages_tenant_write_ins on public.portal_messages
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy portal_messages_tenant_write_upd on public.portal_messages
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy portal_messages_tenant_write_del on public.portal_messages
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- prayer_times
drop policy prayer_times_tenant_write on public.prayer_times;
create policy prayer_times_tenant_write_ins on public.prayer_times
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy prayer_times_tenant_write_upd on public.prayer_times
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy prayer_times_tenant_write_del on public.prayer_times
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- product_categories
drop policy pc_write on public.product_categories;
create policy pc_write_ins on public.product_categories
  for insert to public
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy pc_write_upd on public.product_categories
  for update to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy pc_write_del on public.product_categories
  for delete to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));

-- products
drop policy products_write on public.products;
create policy products_write_ins on public.products
  for insert to public
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy products_write_upd on public.products
  for update to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy products_write_del on public.products
  for delete to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));

-- profiles
drop policy profiles_self on public.profiles;
create policy profiles_self_ins on public.profiles
  for insert to public
  with check ((id = ( SELECT auth.uid() AS uid)));
create policy profiles_self_upd on public.profiles
  for update to public
  using ((id = ( SELECT auth.uid() AS uid)))
  with check ((id = ( SELECT auth.uid() AS uid)));
create policy profiles_self_del on public.profiles
  for delete to public
  using ((id = ( SELECT auth.uid() AS uid)));

-- rabbi_questions
drop policy rabbi_questions_tenant_write on public.rabbi_questions;
create policy rabbi_questions_tenant_write_ins on public.rabbi_questions
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy rabbi_questions_tenant_write_upd on public.rabbi_questions
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy rabbi_questions_tenant_write_del on public.rabbi_questions
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- study_daily
drop policy study_daily_tenant_write on public.study_daily;
create policy study_daily_tenant_write_ins on public.study_daily
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy study_daily_tenant_write_upd on public.study_daily
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy study_daily_tenant_write_del on public.study_daily
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- study_schedules
drop policy study_schedules_tenant_write on public.study_schedules;
create policy study_schedules_tenant_write_ins on public.study_schedules
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy study_schedules_tenant_write_upd on public.study_schedules
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy study_schedules_tenant_write_del on public.study_schedules
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- synagogues
drop policy synagogues_tenant_write on public.synagogues;
create policy synagogues_tenant_write_ins on public.synagogues
  for insert to public
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy synagogues_tenant_write_upd on public.synagogues
  for update to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)))
  with check ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));
create policy synagogues_tenant_write_del on public.synagogues
  for delete to public
  using ((is_super_admin(( SELECT auth.uid() AS uid)) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'moderator'::app_role) OR has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'member'::app_role)));

-- tenant_branding
drop policy branding_write on public.tenant_branding;
create policy branding_write_ins on public.tenant_branding
  for insert to public
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy branding_write_upd on public.tenant_branding
  for update to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role))
  with check (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));
create policy branding_write_del on public.tenant_branding
  for delete to public
  using (has_tenant_role(( SELECT auth.uid() AS uid), tenant_id, 'tenant_admin'::app_role));

-- tenant_features
drop policy features_write on public.tenant_features;
create policy features_write_ins on public.tenant_features
  for insert to public
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy features_write_upd on public.tenant_features
  for update to public
  using (is_super_admin(( SELECT auth.uid() AS uid)))
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy features_write_del on public.tenant_features
  for delete to public
  using (is_super_admin(( SELECT auth.uid() AS uid)));

-- tenant_subscriptions
drop policy subs_super_admin_write on public.tenant_subscriptions;
create policy subs_super_admin_write_ins on public.tenant_subscriptions
  for insert to public
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy subs_super_admin_write_upd on public.tenant_subscriptions
  for update to public
  using (is_super_admin(( SELECT auth.uid() AS uid)))
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy subs_super_admin_write_del on public.tenant_subscriptions
  for delete to public
  using (is_super_admin(( SELECT auth.uid() AS uid)));

-- tips
drop policy tips_write on public.tips;
create policy tips_write_ins on public.tips
  for insert to public
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy tips_write_upd on public.tips
  for update to public
  using (is_super_admin(( SELECT auth.uid() AS uid)))
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy tips_write_del on public.tips
  for delete to public
  using (is_super_admin(( SELECT auth.uid() AS uid)));

-- user_roles
drop policy user_roles_super_admin_write on public.user_roles;
create policy user_roles_super_admin_write_ins on public.user_roles
  for insert to public
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy user_roles_super_admin_write_upd on public.user_roles
  for update to public
  using (is_super_admin(( SELECT auth.uid() AS uid)))
  with check (is_super_admin(( SELECT auth.uid() AS uid)));
create policy user_roles_super_admin_write_del on public.user_roles
  for delete to public
  using (is_super_admin(( SELECT auth.uid() AS uid)));
