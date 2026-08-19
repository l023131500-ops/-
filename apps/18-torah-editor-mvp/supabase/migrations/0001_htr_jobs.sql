-- ============================================================
-- מודול HTR — המרת כתב יד עברי ל"העורך התורני"
-- Migration: 0001_htr_jobs
-- Schema: otvedaf (סכמה קיימת בפרויקט)
-- ============================================================
-- עיקרון-על: "הטקסט קדוש" — raw_text ו-corrected_text נשמרים
-- בנפרד; אישור אנושי (approved_at) חובה לפני שהטקסט נכנס לספר.
-- אפס הזיות: confidence נשמר per-line כדי לסמן מקומות לא-ודאיים.
-- ============================================================

create schema if not exists otvedaf;

-- ---------- enum לסטטוס job ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'htr_status') then
    create type otvedaf.htr_status as enum (
      'uploaded',    -- התמונה הועלתה, טרם עובדה
      'queued',      -- ממתין למנוע HTR
      'processing',  -- מנוע HTR רץ
      'raw_ready',   -- HTR הסתיים, טקסט גולמי מוכן
      'corrected',   -- עבר תיקון-אחר (LLM), ממתין לאישור אנושי
      'approved',    -- אושר ע"י אדם — מוכן לשילוב בספר
      'failed'       -- שגיאה
    );
  end if;
end $$;

-- ---------- סוג החומר (משפיע על בחירת מודל) ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'htr_material') then
    create type otvedaf.htr_material as enum (
      'modern_handwriting',   -- כתב יד עכשווי (הערות/טיוטות) — עדיפות ראשית
      'rabbinic_18_19',       -- כתב יד רבני 18-19
      'medieval_square',      -- כתב מרובע ימי-ביניימי
      'rashi_ladino',         -- רש"י / לדינו
      'print'                 -- דפוס (OCR רגיל)
    );
  end if;
end $$;

-- ---------- רמת מנוי (שתי רמות לפי המפרט) ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'htr_tier') then
    create type otvedaf.htr_tier as enum (
      'regular',   -- מנוי רגיל: Kraken self-hosted + DictaLM (חינם, NetFree)
      'internal'   -- מנוי פנימי: Transkribus + Claude/Gemini (דיוק מקסימלי)
    );
  end if;
end $$;

-- ============================================================
-- טבלה ראשית: htr_jobs
-- ============================================================
create table if not exists otvedaf.htr_jobs (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- קלט
  image_url         text not null,               -- נתיב ב-Supabase Storage
  image_bucket      text not null default 'htr-uploads',
  page_label        text,                         -- תיאור חופשי (עמ', מקור)
  material          otvedaf.htr_material not null default 'modern_handwriting',
  tier              otvedaf.htr_tier not null default 'regular',

  -- מצב
  status            otvedaf.htr_status not null default 'uploaded',
  engine            text,                         -- 'kraken' | 'transkribus' | ...
  corrector         text,                         -- 'dictalm' | 'claude' | 'none'
  error_detail      text,

  -- פלט (הטקסט קדוש — raw ו-corrected בנפרד)
  raw_text          text,                         -- פלט HTR גולמי (לא נערך אוטומטית)
  corrected_text    text,                         -- אחרי תיקון-אחר LLM
  final_text        text,                         -- אחרי עריכה אנושית (מה שנכנס לספר)

  -- ביטחון per-line: [{ "line": 0, "text": "...", "confidence": 0.87 }, ...]
  confidence        jsonb,
  mean_confidence   real,                         -- ממוצע כללי לסינון מהיר

  -- אישור אנושי — חובה לפני שילוב
  approved_at       timestamptz,
  approved_by       text,

  -- קישור לספר/פרק בעורך התורני (אופציונלי)
  book_id           uuid,
  chapter_ref       text
);

create index if not exists htr_jobs_status_idx   on otvedaf.htr_jobs (status);
create index if not exists htr_jobs_created_idx  on otvedaf.htr_jobs (created_at desc);
create index if not exists htr_jobs_book_idx      on otvedaf.htr_jobs (book_id);

-- ---------- trigger ל-updated_at ----------
create or replace function otvedaf.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists htr_jobs_touch on otvedaf.htr_jobs;
create trigger htr_jobs_touch
  before update on otvedaf.htr_jobs
  for each row execute function otvedaf.touch_updated_at();

-- ============================================================
-- Storage bucket להעלאת תמונות (פרטי — לא ציבורי)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('htr-uploads', 'htr-uploads', false)
on conflict (id) do nothing;

-- ============================================================
-- RLS — ברירת מחדל: גישה רק דרך service_role (backend).
-- הפרונט לא ניגש ישירות לטבלה; רק ה-API routes.
-- ============================================================
alter table otvedaf.htr_jobs enable row level security;

drop policy if exists htr_jobs_service_all on otvedaf.htr_jobs;
create policy htr_jobs_service_all on otvedaf.htr_jobs
  for all to service_role using (true) with check (true);
