-- ============================================================================
-- Torah Platform · Migration 002 · Torah Content Tables
-- ============================================================================
-- Lessons, Study Schedule, Prayer Times, Forums, Materials, Leads, Messages,
-- Participants, Synagogues, Rabbis, Maggidim, Halacha, Kashrut, Newsletter.
-- כל הטבלאות עם tenant_id + RLS.
-- ============================================================================

-- ============================================================================
-- LESSON TOPICS (taxonomy גלובלית)
-- ============================================================================
create table if not exists public.lesson_topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  parent_id uuid references public.lesson_topics(id) on delete set null,
  description text,
  icon text,
  sort_order int default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.lesson_topics (slug, name) values
  ('daf-yomi','דף יומי'),
  ('gemara','גמרא'),
  ('halacha','הלכה'),
  ('mishna','משנה'),
  ('mishna-yomi','משנה יומית'),
  ('tanach','תנ"ך'),
  ('parasha','פרשת שבוע'),
  ('mussar','מוסר'),
  ('chassidut','חסידות'),
  ('emunah','אמונה ומחשבה'),
  ('kabala','קבלה'),
  ('siddur-tefilla','סידור ותפילה'),
  ('chumash','חומש'),
  ('ein-yaakov','עין יעקב'),
  ('chok-le-israel','חוק לישראל'),
  ('shulchan-aruch','שולחן ערוך'),
  ('mishna-brura','משנה ברורה'),
  ('chofetz-chaim','שמירת הלשון / חפץ חיים'),
  ('rambam','רמב"ם יומי'),
  ('zohar','זוהר'),
  ('rashi','רש"י על התורה'),
  ('other','אחר')
on conflict (slug) do nothing;

-- ============================================================================
-- SYNAGOGUES (sub-tenants in practice)
-- ============================================================================
create table if not exists public.synagogues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  nusach text,                                    -- "אשכנז" / "ספרד" / "תימני" / ...
  rabbi_name text,
  gabbai_name text,
  gabbai_phone text,
  gabbai_email text,
  address text,
  city text,
  neighborhood text,
  region text,
  latitude numeric,
  longitude numeric,
  photo_url text,
  description text,
  capacity int,
  has_mikve boolean default false,
  has_kollel boolean default false,
  social_links jsonb default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_synagogues_tenant on public.synagogues(tenant_id);
create index if not exists idx_synagogues_city on public.synagogues(city);

-- ============================================================================
-- PRAYER TIMES
-- ============================================================================
create table if not exists public.prayer_times (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  synagogue_id uuid references public.synagogues(id) on delete cascade,
  prayer_type text not null,                       -- "shacharit","mincha","arvit","mussaf","selichot"
  day_of_week int,                                 -- 0..6 (0=Sunday) — null = כל יום
  is_shabbat boolean default false,
  is_holiday boolean default false,
  time_hhmm text not null,                         -- "06:30"
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_prayer_tenant on public.prayer_times(tenant_id);
create index if not exists idx_prayer_shul on public.prayer_times(synagogue_id);

-- ============================================================================
-- LESSONS
-- ============================================================================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  synagogue_id uuid references public.synagogues(id) on delete set null,
  rabbi_user_id uuid references auth.users(id) on delete set null,
  rabbi_name text,                                  -- אם הרב אינו משתמש במערכת
  topic_id uuid references public.lesson_topics(id) on delete set null,
  topic_free_text text,                             -- "אחר"
  title text not null,
  description text,
  city text,
  neighborhood text,
  address text,
  day_of_week int,                                  -- 0..6
  date_specific date,                               -- שיעור חד-פעמי
  time_hhmm text,
  duration_minutes int default 60,
  language text default 'he',
  audience text,                                    -- "גברים","נשים","ילדים","משפחות"
  style text,                                       -- "עיון","שיעור הלכה","שיעור אגדה"
  recording_url text,
  stream_url text,
  contact_name text,
  contact_phone text,
  contact_email text,
  is_active boolean not null default true,
  is_approved boolean not null default false,
  igud_tagged boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lessons_tenant on public.lessons(tenant_id);
create index if not exists idx_lessons_topic on public.lessons(topic_id);
create index if not exists idx_lessons_city on public.lessons(city);
create index if not exists idx_lessons_day on public.lessons(day_of_week);

-- ============================================================================
-- STUDY SCHEDULE (לוח הספק לימודי)
-- ============================================================================
create table if not exists public.study_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,                              -- "מסכת ברכות","משנה ברורה ח״ג"
  source_book text,
  source_external text,                             -- "דרשו","דף יומי"
  source_url text,
  start_date date,
  end_date date,
  daily_amount text,                                -- "עמוד","דף","2 הלכות"
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_study_tenant on public.study_schedules(tenant_id);

create table if not exists public.study_daily (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.study_schedules(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  date date not null,
  hebrew_date text,
  content text not null,                            -- "ברכות דף ב'"
  notes text,
  is_special boolean default false,                 -- שישי/שבת/חג/סיום
  special_type text,                                -- "friday","shabbat","holiday","siyum"
  color text,
  created_at timestamptz not null default now(),
  unique (schedule_id, date)
);
create index if not exists idx_study_daily_date on public.study_daily(date);
create index if not exists idx_study_daily_tenant on public.study_daily(tenant_id);

-- ============================================================================
-- PARTICIPANTS + ATTENDANCE
-- ============================================================================
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  whatsapp text,
  email text,
  notes text,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_participants_tenant on public.participants(tenant_id);
create index if not exists idx_participants_lesson on public.participants(lesson_id);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  date date not null,
  is_present boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (participant_id, lesson_id, date)
);
create index if not exists idx_attendance_part on public.attendance(participant_id);

-- ============================================================================
-- LEADS (פניות: בקשת שיעור / הצעת מגיד / וכו')
-- ============================================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  kind text not null,                                -- 'lesson_request','teacher_offer','kashrut','service','contact'
  full_name text,
  phone text,
  email text,
  city text,
  area text,
  preferred_subject text,
  message text,
  status text not null default 'new',                -- new/in_progress/done/cancelled
  assigned_teacher_user_id uuid references auth.users(id) on delete set null,
  raw_data jsonb,
  source text,                                       -- 'public_site','rabbi_page','whatsapp','yemot'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leads_tenant on public.leads(tenant_id);
create index if not exists idx_leads_kind on public.leads(kind);
create index if not exists idx_leads_status on public.leads(status);

-- ============================================================================
-- PORTAL MESSAGES (פניות שמגיעות מדף ציבורי של רב/ארגון/ביכ"נ)
-- ============================================================================
create table if not exists public.portal_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  to_user_id uuid references auth.users(id) on delete set null,
  from_name text,
  from_phone text,
  from_email text,
  subject text,
  body text,
  status text not null default 'new',
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_portal_msg_tenant on public.portal_messages(tenant_id);

-- ============================================================================
-- FORUMS
-- ============================================================================
create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,   -- null = global category
  scope text not null default 'global',                              -- 'global','tenant'
  slug text not null,
  name text not null,
  description text,
  icon text,
  sort_order int default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

insert into public.forum_categories (scope, slug, name, description, sort_order) values
  ('global','general','כללי','דיונים כלליים',1),
  ('global','daf-yomi','דף יומי','פורום דף יומי',2),
  ('global','halacha','הלכה','שאלות ותשובות בהלכה',3),
  ('global','lesson-management','ניהול שיעור','טיפים וכלים למגידי שיעור',4),
  ('global','marketing','שיווק והפצה','איך להגדיל קהל',5),
  ('global','kashrut','כשרות','פורום כשרות מועצות דתיות',6),
  ('global','dvar-torah','דבר תורה','שיתוף דברי תורה',7),
  ('global','technology','טכנולוגיה ויהדות','אפליקציות וכלים',8)
on conflict do nothing;

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  category_id uuid not null references public.forum_categories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text,
  attachments jsonb default '[]'::jsonb,
  is_pinned boolean default false,
  is_locked boolean default false,
  views int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_posts_cat on public.forum_posts(category_id);
create index if not exists idx_posts_tenant on public.forum_posts(tenant_id);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_post on public.forum_comments(post_id);

-- Per-user forum access (מי מורשה לראות איזה פורום)
create table if not exists public.forum_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.forum_categories(id) on delete cascade,
  can_view boolean not null default true,
  can_post boolean not null default true,
  can_moderate boolean not null default false,
  unique (user_id, category_id)
);

-- ============================================================================
-- MATERIALS (חומרי עזר)
-- ============================================================================
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  category text,
  subcategory text,
  media_kind text not null,                       -- 'image','pdf','audio','video','flyer','template'
  file_url text,
  file_size bigint,
  duration_seconds int,
  thumbnail_url text,
  display_in_public_profile boolean default false,
  display_forum_category_id uuid references public.forum_categories(id) on delete set null,
  featured_on_homepage boolean default false,
  status text not null default 'pending',         -- 'pending','approved','rejected'
  rejection_reason text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_materials_tenant on public.materials(tenant_id);
create index if not exists idx_materials_status on public.materials(status);

-- ============================================================================
-- GALLERY (תמונות לטננט)
-- ============================================================================
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text,
  caption text,
  image_url text not null,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- TIPS (טיפים יומיים למגיד שיעור)
-- ============================================================================
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  category text,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ASK RABBI – "שאל את הרב"
-- ============================================================================
create table if not exists public.rabbi_questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rabbi_user_id uuid references auth.users(id) on delete set null,
  from_name text,
  from_phone text,
  from_email text,
  is_anonymous boolean default false,
  question text not null,
  answer text,
  is_public boolean default false,
  status text not null default 'new',
  category text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists idx_rabbi_q_tenant on public.rabbi_questions(tenant_id);

-- ============================================================================
-- HALACHA DAILY
-- ============================================================================
create table if not exists public.halacha_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,    -- null = global
  date date not null,
  title text not null,
  body text not null,
  source text,
  category text,
  audio_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_halacha_date on public.halacha_daily(date);

-- ============================================================================
-- KASHRUT
-- ============================================================================
create table if not exists public.kashrut_certifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  business_name text not null,
  business_type text,                                -- "מסעדה","מאפייה","קייטרינג"
  address text,
  city text,
  hechsher_level text,                               -- "רגיל","מהדרין","חלק"
  certifier text,
  valid_from date,
  valid_until date,
  certificate_url text,
  status text not null default 'active',             -- active/expired/suspended/revoked
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_kashrut_tenant on public.kashrut_certifications(tenant_id);

-- ============================================================================
-- COMMUNITY SERVICES (חתונות, מקוואות, חברה קדישא, אזכרות, מדריך אבלות)
-- ============================================================================
create table if not exists public.community_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_type text not null,                        -- 'wedding','mikve','chevra-kadisha','azkara','mourning','brit-mila'
  title text not null,
  description text,
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  hours text,
  links jsonb default '[]'::jsonb,
  notes text,
  is_active boolean default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_services_tenant on public.community_services(tenant_id);

create table if not exists public.azkarot (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  deceased_name text not null,
  deceased_father_name text,
  date_of_death_hebrew text,
  date_of_death date,
  next_azkara_date date,
  family_contact_name text,
  family_contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- NEWSLETTERS
-- ============================================================================
create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  issue_number int,
  publish_date date,
  pdf_url text,
  cover_image_url text,
  is_published boolean default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ADS / BANNERS / ACTIVITY SLIDES
-- ============================================================================
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  image_url text,
  link_url text,
  size text not null default 'medium',               -- 'small','medium','large','hero'
  placement text not null default 'homepage',        -- 'homepage','sidebar','footer','strip'
  is_active boolean default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order int default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ads_tenant on public.ads(tenant_id);

-- ============================================================================
-- ANNOUNCEMENTS (מודעות לציבור)
-- ============================================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  body text,
  category text,                                     -- 'general','urgent','event','condolence'
  publish_date date default current_date,
  expires_at date,
  is_pinned boolean default false,
  is_published boolean default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CHAT (פנימי פר טננט)
-- ============================================================================
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  is_private boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_room on public.chat_messages(room_id);

-- ============================================================================
-- RLS – generic pattern for tenant-scoped tables
-- ============================================================================
-- ניצור פונקציה מסייעת שמקצרת:
create or replace function public.user_in_tenant(_tenant_id uuid)
returns boolean
language sql security definer stable
as $$
  select public.is_super_admin(auth.uid())
    or _tenant_id in (select public.user_tenants(auth.uid()));
$$;

-- enable RLS + policies for all torah-content tables
do $$
declare
  tbl text;
  -- NOTE: attendance + forum_comments excluded from generic loop because they
  -- have no direct tenant_id column. Their RLS is defined separately below.
  tbls text[] := array[
    'synagogues','prayer_times','lessons','study_schedules','study_daily',
    'participants','leads','portal_messages','forum_posts',
    'materials','gallery_images','rabbi_questions',
    'kashrut_certifications','community_services','azkarot','newsletters',
    'ads','announcements','chat_rooms','chat_messages','halacha_daily'
  ];
begin
  foreach tbl in array tbls loop
    execute format('alter table public.%I enable row level security;', tbl);

    -- Allow public read on truly public tables, otherwise tenant-scoped
    execute format($pol$
      drop policy if exists "%1$s_tenant_read" on public.%1$I;
      create policy "%1$s_tenant_read" on public.%1$I
        for select using (
          tenant_id is null
          or public.user_in_tenant(tenant_id)
          or exists (
            select 1 from public.tenants t
            where t.id = %1$I.tenant_id and t.status = 'active'
          )
        );
    $pol$, tbl);

    execute format($pol$
      drop policy if exists "%1$s_tenant_write" on public.%1$I;
      create policy "%1$s_tenant_write" on public.%1$I
        for all using (
          public.is_super_admin(auth.uid())
          or public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin')
          or public.has_tenant_role(auth.uid(), tenant_id, 'moderator')
          or public.has_tenant_role(auth.uid(), tenant_id, 'member')
        )
        with check (
          public.is_super_admin(auth.uid())
          or public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin')
          or public.has_tenant_role(auth.uid(), tenant_id, 'moderator')
          or public.has_tenant_role(auth.uid(), tenant_id, 'member')
        );
    $pol$, tbl);
  end loop;
end $$;

-- attendance: tenant scope via participant join
alter table public.attendance enable row level security;
drop policy if exists "attendance_tenant_read" on public.attendance;
create policy "attendance_tenant_read" on public.attendance
  for select using (
    public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.participants p
      where p.id = attendance.participant_id
        and public.user_in_tenant(p.tenant_id)
    )
  );

drop policy if exists "attendance_tenant_write" on public.attendance;
create policy "attendance_tenant_write" on public.attendance
  for all using (
    public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.participants p
      where p.id = attendance.participant_id
        and (public.has_tenant_role(auth.uid(), p.tenant_id, 'tenant_admin')
          or public.has_tenant_role(auth.uid(), p.tenant_id, 'moderator'))
    )
  )
  with check (
    public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.participants p
      where p.id = attendance.participant_id
        and (public.has_tenant_role(auth.uid(), p.tenant_id, 'tenant_admin')
          or public.has_tenant_role(auth.uid(), p.tenant_id, 'moderator'))
    )
  );

-- forum_comments: scoped via parent forum_post
alter table public.forum_comments enable row level security;
drop policy if exists "fcom_read" on public.forum_comments;
create policy "fcom_read" on public.forum_comments
  for select using (
    exists (
      select 1 from public.forum_posts fp
      where fp.id = forum_comments.post_id
    )
  );

drop policy if exists "fcom_insert" on public.forum_comments;
create policy "fcom_insert" on public.forum_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "fcom_update_own" on public.forum_comments;
create policy "fcom_update_own" on public.forum_comments
  for update using (auth.uid() = user_id or public.is_super_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_super_admin(auth.uid()));

drop policy if exists "fcom_delete" on public.forum_comments;
create policy "fcom_delete" on public.forum_comments
  for delete using (auth.uid() = user_id or public.is_super_admin(auth.uid()));

-- Forum categories: read public, write super_admin/tenant_admin
alter table public.forum_categories enable row level security;
drop policy if exists "fc_read" on public.forum_categories;
create policy "fc_read" on public.forum_categories for select using (true);

drop policy if exists "fc_write" on public.forum_categories;
create policy "fc_write" on public.forum_categories
  for all using (
    public.is_super_admin(auth.uid())
    or (tenant_id is not null and public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  );

alter table public.forum_access enable row level security;
drop policy if exists "fa_self_read" on public.forum_access;
create policy "fa_self_read" on public.forum_access for select using (user_id = auth.uid() or public.is_super_admin(auth.uid()));

drop policy if exists "fa_admin_write" on public.forum_access;
create policy "fa_admin_write" on public.forum_access
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- Topics + Tips: read all, write super_admin
alter table public.lesson_topics enable row level security;
drop policy if exists "topics_read" on public.lesson_topics;
create policy "topics_read" on public.lesson_topics for select using (true);

drop policy if exists "topics_write" on public.lesson_topics;
create policy "topics_write" on public.lesson_topics
  for all using (public.is_super_admin(auth.uid()));

alter table public.tips enable row level security;
drop policy if exists "tips_read" on public.tips;
create policy "tips_read" on public.tips for select using (is_active = true or public.is_super_admin(auth.uid()));

drop policy if exists "tips_write" on public.tips;
create policy "tips_write" on public.tips
  for all using (public.is_super_admin(auth.uid()));
