-- =========================================================
-- תמלול מבית איגוד השיעורים — Database Schema
-- Schema: transcribe (נפרד מ-public)
-- Storage buckets: audio, docs
-- =========================================================

create schema if not exists transcribe;

-- אפשר ל-PostgREST/Supabase לחשוף את ה-schema:
-- אחרי הריצה: Dashboard → Settings → API → Exposed schemas → הוסף "transcribe"
--
-- ✅ הוחל בייצור 19/08/2026 (core.issues #239): הפרויקט bieebmnmkffwbqlsfozh
-- חשף רק public,graphql_public — ולכן כל נתיב שרת שקורא ל-transcribe
-- (coupons/uploads/jobs/admin) החזיר 500 "Invalid schema: transcribe".
-- db_schema עודכן ל-"public,graphql_public,otvedaf,transcribe" גם ב-Management API
-- (PATCH /v1/projects/<ref>/postgrest) וגם ב-ALTER ROLE authenticator SET pgrst.db_schemas,
-- ואז NOTIFY pgrst,'reload config'. ⚠️ otvedaf שייך למערכת אחרת על אותו פרויקט —
-- חובה לשמר אותו ברשימה, לא למחוק. אימות: POST /tamlul/api/coupons עבר מ-500 ל-404
-- ("קופון לא קיים") לקוד בדיקה שאינו קיים.

-- =========================================================
-- 1. Profiles
-- =========================================================
create table if not exists transcribe.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz default now()
);
alter table transcribe.profiles enable row level security;

-- =========================================================
-- 2. Coupon Codes
-- =========================================================
create table if not exists transcribe.coupon_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  max_uploads int not null default 1,
  used_uploads int not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
alter table transcribe.coupon_codes enable row level security;
create index if not exists coupon_codes_code_idx on transcribe.coupon_codes(code);

-- =========================================================
-- 3. Uploads
-- =========================================================
create table if not exists transcribe.uploads (
  id uuid default gen_random_uuid() primary key,
  coupon_id uuid references transcribe.coupon_codes,
  uploader_email text,
  style text not null check (style in ('litvish','chassidish','yiddish')),
  status text not null default 'uploaded' check (status in ('uploaded','processing','done','error')),
  storage_path text,
  duration_sec int,
  size_bytes bigint,
  original_filename text,
  created_at timestamptz default now()
);
alter table transcribe.uploads enable row level security;
create index if not exists uploads_status_idx on transcribe.uploads(status);
create index if not exists uploads_created_idx on transcribe.uploads(created_at desc);

-- =========================================================
-- 4. Transcripts
-- =========================================================
create table if not exists transcribe.transcripts (
  id uuid default gen_random_uuid() primary key,
  upload_id uuid references transcribe.uploads on delete cascade,
  raw_text text,
  edited_text text,
  processing_notes text,
  docx_original_url text,
  docx_edited_url text,
  docx_sources_url text,
  created_at timestamptz default now()
);
alter table transcribe.transcripts enable row level security;
create index if not exists transcripts_upload_idx on transcribe.transcripts(upload_id);

-- =========================================================
-- 5. Footnotes
-- =========================================================
create table if not exists transcribe.footnotes (
  id uuid default gen_random_uuid() primary key,
  transcript_id uuid references transcribe.transcripts on delete cascade,
  number int not null,
  position int,
  note_text text not null,
  source_ref text,
  created_at timestamptz default now()
);
alter table transcribe.footnotes enable row level security;
create index if not exists footnotes_transcript_idx on transcribe.footnotes(transcript_id);

-- =========================================================
-- 6. Jobs
-- =========================================================
create table if not exists transcribe.jobs (
  id uuid default gen_random_uuid() primary key,
  upload_id uuid references transcribe.uploads on delete cascade,
  type text not null check (type in ('transcribe','post_process','generate_docx')),
  status text not null default 'pending' check (status in ('pending','running','done','error')),
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);
alter table transcribe.jobs enable row level security;
create index if not exists jobs_status_idx on transcribe.jobs(status);
create index if not exists jobs_upload_idx on transcribe.jobs(upload_id);

-- =========================================================
-- 7. Style Glossary
-- =========================================================
create table if not exists transcribe.style_glossary (
  id uuid default gen_random_uuid() primary key,
  style text not null check (style in ('litvish','chassidish','yiddish')),
  term text not null,
  replacement text,
  notes text,
  created_at timestamptz default now()
);
alter table transcribe.style_glossary enable row level security;
create index if not exists glossary_style_idx on transcribe.style_glossary(style);

-- =========================================================
-- 8. Settings
-- =========================================================
create table if not exists transcribe.settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
alter table transcribe.settings enable row level security;

-- =========================================================
-- RLS Policies — אדמין בלבד (service_role עוקף RLS אוטומטית)
-- =========================================================

-- Profiles: כל משתמש יכול לראות פרופיל של עצמו, אדמין רואה הכל
drop policy if exists "profiles_self_read" on transcribe.profiles;
create policy "profiles_self_read" on transcribe.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_admin_all" on transcribe.profiles;
create policy "profiles_admin_all" on transcribe.profiles
  for all using (auth.email() = 'l023131500@gmail.com');

-- Coupon codes: אדמין בלבד מקריאה. הוספת קופונים דרך service-role.
drop policy if exists "coupons_admin_all" on transcribe.coupon_codes;
create policy "coupons_admin_all" on transcribe.coupon_codes
  for all using (auth.email() = 'l023131500@gmail.com');

-- Uploads: אדמין בלבד דרך RLS. הוספה דרך service-role.
drop policy if exists "uploads_admin_all" on transcribe.uploads;
create policy "uploads_admin_all" on transcribe.uploads
  for all using (auth.email() = 'l023131500@gmail.com');

-- Transcripts
drop policy if exists "transcripts_admin_all" on transcribe.transcripts;
create policy "transcripts_admin_all" on transcribe.transcripts
  for all using (auth.email() = 'l023131500@gmail.com');

-- Footnotes
drop policy if exists "footnotes_admin_all" on transcribe.footnotes;
create policy "footnotes_admin_all" on transcribe.footnotes
  for all using (auth.email() = 'l023131500@gmail.com');

-- Jobs
drop policy if exists "jobs_admin_all" on transcribe.jobs;
create policy "jobs_admin_all" on transcribe.jobs
  for all using (auth.email() = 'l023131500@gmail.com');

-- Glossary
drop policy if exists "glossary_admin_all" on transcribe.style_glossary;
create policy "glossary_admin_all" on transcribe.style_glossary
  for all using (auth.email() = 'l023131500@gmail.com');

-- Settings
drop policy if exists "settings_admin_all" on transcribe.settings;
create policy "settings_admin_all" on transcribe.settings
  for all using (auth.email() = 'l023131500@gmail.com');

-- =========================================================
-- Seed Settings
-- =========================================================
insert into transcribe.settings (key, value) values
  ('admin_email', 'l023131500@gmail.com'),
  ('system_name', 'תמלול מבית איגוד השיעורים'),
  ('contact_phone', '02-3131600'),
  ('contact_email', 'a023131600@gmail.com')
on conflict (key) do nothing;

-- =========================================================
-- Storage Buckets
-- =========================================================
-- אם הריצה דרך SQL לא מאפשרת — ניתן ליצור ידנית ב-Dashboard → Storage
-- שני buckets פרטיים: audio (להעלאות הקלטה), docs (לקבצי DOCX מוכנים)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('audio', 'audio', false, 209715200, null)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('docs', 'docs', false, 52428800, null)
  on conflict (id) do nothing;

-- Storage policies: אדמין בלבד דרך service-role (אין צורך ב-RLS פתוח)
-- אם תרצה לאפשר משתמשים מחוברים לקרוא קבצי DOCX משלהם — הוסף policy מותאמת.
