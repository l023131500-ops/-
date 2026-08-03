-- ============================================================================
-- Torah Platform · Migration 006 · Performance Indexes
-- Covering indexes for foreign-key columns used in RLS joins and filters.
-- ============================================================================

create index if not exists idx_announcements_tenant_id on public.announcements(tenant_id);
create index if not exists idx_attendance_tenant_id on public.attendance(tenant_id);
create index if not exists idx_attendance_lesson_id on public.attendance(lesson_id);
create index if not exists idx_azkarot_tenant_id on public.azkarot(tenant_id);
create index if not exists idx_carts_tenant_id on public.carts(tenant_id);
create index if not exists idx_chat_messages_tenant_id on public.chat_messages(tenant_id);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_chat_rooms_tenant_id on public.chat_rooms(tenant_id);
create index if not exists idx_donations_parent_donation_id on public.donations(parent_donation_id);
create index if not exists idx_forum_comments_user_id on public.forum_comments(user_id);
create index if not exists idx_forum_posts_user_id on public.forum_posts(user_id);
create index if not exists idx_forum_access_category_id on public.forum_access(category_id);
create index if not exists idx_gallery_images_tenant_id on public.gallery_images(tenant_id);
create index if not exists idx_halacha_daily_tenant_id on public.halacha_daily(tenant_id);
create index if not exists idx_leads_assigned_teacher on public.leads(assigned_teacher_user_id);
create index if not exists idx_lesson_topics_parent_id on public.lesson_topics(parent_id);
create index if not exists idx_lessons_rabbi_user_id on public.lessons(rabbi_user_id);
create index if not exists idx_lessons_synagogue_id on public.lessons(synagogue_id);
create index if not exists idx_materials_owner_user_id on public.materials(owner_user_id);
create index if not exists idx_materials_display_forum_cat on public.materials(display_forum_category_id);
create index if not exists idx_nedarim_configs_default_campaign on public.nedarim_configs(default_campaign_id);
create index if not exists idx_nedarim_tx_donation_id on public.nedarim_transactions(donation_id);
create index if not exists idx_nedarim_tx_order_id on public.nedarim_transactions(order_id);
