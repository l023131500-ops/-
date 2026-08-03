-- ============================================================================
-- Torah Platform · Migration 004 · Storage Buckets + Initial Seed
-- ============================================================================

-- Storage buckets (run via Supabase API or this — both work)
insert into storage.buckets (id, name, public) values
  ('portal-assets','portal-assets', true),
  ('materials-media','materials-media', true),
  ('newsletters','newsletters', true),
  ('site-images','site-images', true),
  ('shop-images','shop-images', true)
on conflict (id) do nothing;

-- Permissive read on public buckets — policies suffixed with _torah_buckets
-- to avoid collision with other apps sharing the same Supabase project
do $$ begin
  drop policy if exists "public_read_all_torah_buckets" on storage.objects;
  create policy "public_read_all_torah_buckets" on storage.objects for select using (
    bucket_id in ('portal-assets','materials-media','newsletters','site-images','shop-images')
  );

  drop policy if exists "authenticated_write_torah_buckets" on storage.objects;
  create policy "authenticated_write_torah_buckets" on storage.objects for insert with check (
    auth.uid() is not null
    and bucket_id in ('portal-assets','materials-media','newsletters','site-images','shop-images')
  );

  drop policy if exists "owner_update_torah_buckets" on storage.objects;
  create policy "owner_update_torah_buckets" on storage.objects for update using (
    owner = auth.uid()
    and bucket_id in ('portal-assets','materials-media','newsletters','site-images','shop-images')
  );

  drop policy if exists "owner_delete_torah_buckets" on storage.objects;
  create policy "owner_delete_torah_buckets" on storage.objects for delete using (
    owner = auth.uid()
    and bucket_id in ('portal-assets','materials-media','newsletters','site-images','shop-images')
  );
exception when others then null; end $$;

-- ============================================================================
-- SEED — איגוד השיעורים (Super Admin tenant)
-- ============================================================================
insert into public.tenants (slug, type, name, display_name, status, contact_email, contact_phone, contact_whatsapp)
values (
  'igud',
  'super_admin',
  'איגוד השיעורים',
  'איגוד מגידי השיעורים',
  'active',
  'a023131600@gmail.com',
  '02-3131600',
  '02-3131600'
)
on conflict (slug) do nothing;

-- עדכון Branding
update public.tenant_branding b
set primary_color = '#1A2E5A',
    secondary_color = '#C9A84C',
    accent_color = '#F2D678',
    site_name = 'איגוד מגידי השיעורים',
    site_tagline = 'כל מה שמגיד השיעור צריך — תחת קורת גג אחת',
    show_union_footer = false
from public.tenants t
where t.slug = 'igud' and b.tenant_id = t.id;

-- עדכון Features – הכל פתוח לאיגוד
update public.tenant_features f
set
  public_site = true, member_portal = true, forums = true, leads_inbox = true,
  questionnaires = true, lessons = true, study_schedule = true, ai_matching = true,
  donations = true, recurring_donations = true, dedications = true, shop = true,
  matching_available = false, materials_upload = true, png_export = true,
  whatsapp_integration = true, email_integration = true, yemot_integration = true
from public.tenants t
where t.slug = 'igud' and f.tenant_id = t.id;

-- מועצה דתית פיילוט (גליל)
insert into public.tenants (slug, type, name, display_name, status, region, city, contact_email)
values ('mc-galil','religious_council','מועצה דתית גליל','המועצה הדתית האזורית גליל','active','צפון','קצרין','info@mc-galil.org.il')
on conflict (slug) do nothing;

update public.tenant_features f
set
  public_site = true, member_portal = true, prayer_times = true, kashrut = true,
  halacha_daily = true, ask_rabbi = true, mourning_guide = true, mikvaot = true,
  community_services = true, newsletter = true, ad_banners = true, announcements = true,
  donations = true, dedications = true
from public.tenants t
where t.slug = 'mc-galil' and f.tenant_id = t.id;

-- ארגון פיילוט (מחוברים)
insert into public.tenants (slug, type, name, display_name, status, contact_email, contact_phone)
values ('mehubarim','organization','מחוברים','ארגון מחוברים – חיבור לתורה','active','info@mehubarim.org','03-1234567')
on conflict (slug) do nothing;

update public.tenant_features f
set
  public_site = true, member_portal = true, forums = true, lessons = true,
  bulk_lesson_upload = true, ivr_builder = true, lesson_directory = true,
  donations = true, recurring_donations = true, dedications = true, shop = true,
  whatsapp_integration = true, yemot_integration = true
from public.tenants t
where t.slug = 'mehubarim' and f.tenant_id = t.id;

-- Tips לדוגמה
insert into public.tips (body, category) values
  ('פתח את השיעור בדבר תורה קצר על פרשת השבוע — זה מחבר את התלמידים לזמן שבו אנחנו נמצאים', 'opening'),
  ('שלח תזכורת 30 דקות לפני השיעור בוואטסאפ — מעלה נוכחות ב-40%', 'attendance'),
  ('צלם את הלוח בסיום השיעור ושלח לקבוצה — מי שלא הצליח להגיע לא יישאר חסר', 'engagement'),
  ('פתח קבוצת וואטסאפ ייעודית רק לתלמידי השיעור — לא רק לתזכורות, אלא לעידוד ושיתוף', 'community'),
  ('הזכר שמות של הורים/חברים שצריכים רפואה שלמה לפני השיעור — מחבר את התלמידים', 'spiritual')
on conflict do nothing;
