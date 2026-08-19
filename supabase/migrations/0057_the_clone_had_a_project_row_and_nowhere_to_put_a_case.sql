-- 0057 — bkalot_clone: הסכמה הייעודית של השכפול התפעולי (BKALOT_CLONE_BUILD §"מבנה העותק")
--
-- מה היה: core.projects כבר החזיקה את #37 bkalot-clone (stage=idea, path=bkalot-studio)
-- מאז שהמפרט אושר, אבל supabase_schema שלה היה NULL ולא היה בנמצא שום מקום לכתוב
-- אליו פנייה. כלומר הפרויקט היה רשום ולא קיים.
--
-- מה נמדד לפני הכתיבה (ולא הונח):
--   rights.catalog = 888 שורות · rights.situation_map = 24 · rights.reference = 104
--   bkalot_auto.topics = 1 · contacts = 4 · intake_log = 10 · outbound_queue = 8
--   delivery_log = 3 · test_targets = 1   (מנוע השליחה קיים וחי, בדיוק כפי שהמפרט הניח)
--
-- שתי הכרעות שהמפרט השאיר פתוחות, ושתיהן הוכרעו במדידה:
--
-- (1) "צור עותק קריא של rights.catalog לתוך bkalot_clone **או** קרא ממנו חי — לפי מה
--     שנקי יותר". חי. ל-rights.* אין ולו הרשאה אחת ל-anon/authenticated/service_role
--     (information_schema.role_table_grants החזיר אפס שורות), וכל מה שמוגש היום מוגש
--     דרך ארבעה views ב-public. העתקה של 888 שורות הייתה יוצרת מקור אמת שני שנשאר
--     מאחור בכל ייבוא — ו-rights.source_raw + rights.catalog.imported_at מעידים
--     שהקטלוג אכן מיובא מחדש כמכלול.
--
-- (2) מנוע השליחה יושב על bkalot_auto הקיים ולא נבנה מחדש — המפרט מורה "הרחב אותו,
--     אל תמחק", והמדידה מראה שהוא לא שלד אלא תור עובד עם שורות אמת. לכן הסכמה כאן
--     מחזיקה את שתי השכבות הראשונות בלבד (קליטה + ניהול), ומצביעה אל bkalot_auto
--     לשכבה השלישית.
--
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות csj/csj_src/igud.
--    הקובץ הזה יוצר סכמה חדשה בלבד ואינו כותב לשום טבלה קיימת מחוץ ל-core.projects.

create schema if not exists bkalot_clone;

comment on schema bkalot_clone is
  'שכפול תפעולי של בקלות (core.projects #37). שכבה 1 קליטה + שכבה 2 ניהול. '
  'מנוע השליחה (שכבה 3) הוא bkalot_auto. מאגר הזכויות נקרא חי מ-rights ולא מועתק.';

-- ── שכבה 1: קליטת פנייה ──────────────────────────────────────────────────────
-- מקבילה ל-08 (זכאות): כאן נוחת מי שהזין פרטים, בכל אחד מארבעת ערוצי הכניסה
-- שמנה BKALOT_AUTOMATION_BUILD §2 (טופס · נדרים · ימות · סוכן AI).
create table if not exists bkalot_clone.cases (
  id          bigserial primary key,
  app_key     text        not null default 'bkalot-clone',
  -- מצביע אל האיש. bkalot_auto.contacts כבר מחזיקה שם/מייל/טלפון/שלוחה/הסכמה,
  -- ושכפול השדות האלה כאן היה יוצר שתי גרסאות של אותו אדם.
  contact_id  bigint      references bkalot_auto.contacts(id) on delete set null,
  -- מודל "מספר נושא" (BKALOT_AUTOMATION_BUILD §6). אותו מספר ש-bkalot_auto.topics
  -- ו-bkalot_auto.intake_log.topic_no כבר מדברים בו.
  topic_no    integer,
  -- המפתח של rights.situation_map (24 מצבים), שממנו נגזרים קודי הזכויות.
  situation   text,
  source      text        not null default 'form',
  status      text        not null default 'new',
  note        text,
  raw         jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cases_source_known check (source in ('form','yemot','nedarim','ai','admin')),
  constraint cases_status_known check (status in ('new','in_progress','sent','closed','rejected'))
);

comment on table bkalot_clone.cases is 'פנייה שנקלטה — שכבה 1 (מקור השיטה: 08 זכאות, קריאה-בלבד).';
comment on column bkalot_clone.cases.situation is 'מפתח מ-rights.situation_map (24 מצבים). אין FK — ראה case_rights.';

create index if not exists cases_created_idx on bkalot_clone.cases (created_at desc);
create index if not exists cases_status_idx  on bkalot_clone.cases (status, created_at desc);

-- ── שכבה 2: מה נבחר לפנייה ───────────────────────────────────────────────────
create table if not exists bkalot_clone.case_rights (
  id          bigserial primary key,
  case_id     bigint      not null references bkalot_clone.cases(id) on delete cascade,
  -- טקסט ולא FK ל-rights.catalog(code) במכוון: הקטלוג מיובא מחדש כמכלול
  -- (rights.source_raw, catalog.imported_at), ו-FK מכאן היה הופך את השכפול לגורם
  -- שחוסם ייבוא של מאגר הזכויות. תקינות נבדקת ב-join, לא בנעילה.
  right_code  text        not null,
  rank        integer,
  chosen      boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (case_id, right_code)
);

comment on table bkalot_clone.case_rights is 'הזכויות שהותאמו לפנייה. right_code מצביע ל-rights.catalog.code בלי FK — בכוונה.';

-- ── שכבה 2/3: המסמך שהופק, והחוליה אל תור השליחה ─────────────────────────────
create table if not exists bkalot_clone.documents (
  id          bigserial primary key,
  case_id     bigint      not null references bkalot_clone.cases(id) on delete cascade,
  kind        text        not null,
  title       text,
  body_html   text,
  body_text   text,
  storage_path text,
  -- החוליה אל מנוע השליחה הקיים. NULL = הופק ולא נשלח.
  queue_id    bigint      references bkalot_auto.outbound_queue(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint documents_kind_known check (kind in ('email','pdf','audio'))
);

comment on table bkalot_clone.documents is 'המסמך/המייל/ההקלטה שהופקו לפנייה. queue_id מצביע אל bkalot_auto.outbound_queue (mode ברירת מחדל שם: test).';

-- ── מאגר הזכויות: נקרא חי, לא מועתק ──────────────────────────────────────────
-- ה-view חייב להישאר SECURITY DEFINER (ברירת המחדל) ולא security_invoker: ל-service_role
-- אין הרשאת SELECT על rights.catalog עצמה (נמדד), ולכן invoker היה מחזיר "permission
-- denied" לכל קורא. ההרשאה ניתנת ל-service_role בלבד — anon אינו מקבל דבר כאן, וגם
-- אין לו צורך: הצד הציבורי כבר מוגש דרך public.rights_catalog.
create or replace view bkalot_clone.rights_catalog as
  select code, no, name, cat, sub, prov, amt, prio, likelihood,
         why, benefit, conditions, how, documents, tip, simple,
         audience, emp, domain, links, depth
    from rights.catalog;

comment on view bkalot_clone.rights_catalog is 'קריאה חיה מ-rights.catalog (888 נושאים). לא עותק — ראה ראש הקובץ.';

-- ── הרשאות: service_role בלבד, ו-RLS דלוק על שלוש הטבלאות ────────────────────
-- אין policy אחת, ולכן anon/authenticated נחסמים גם אם תינתן להם הרשאה בעתיד
-- בטעות. service_role עוקף RLS ולכן הוא הנתיב היחיד — כלומר כל גישה עוברת דרך
-- edge function שלנו, לא דרך PostgREST אנונימי.
alter table bkalot_clone.cases       enable row level security;
alter table bkalot_clone.case_rights enable row level security;
alter table bkalot_clone.documents   enable row level security;

grant usage on schema bkalot_clone to service_role;
grant select, insert, update, delete on all tables in schema bkalot_clone to service_role;
grant usage, select on all sequences in schema bkalot_clone to service_role;

-- ‎on all tables‎ תופס גם את ה-view, ו-view של טבלה אחת בלי חישוב הוא auto-updatable
-- בפוסטגרס — כלומר ההרשאה הגורפת פתחה נתיב כתיבה אל rights.catalog דרך view שרץ
-- כבעליו. נמדד אחרי המתן (INSERT,UPDATE,DELETE הופיעו על rights_catalog) ונסגר כאן.
-- הכתיבה למאגר הזכויות שייכת לייבוא, לא לשכפול.
revoke insert, update, delete on bkalot_clone.rights_catalog from service_role;

revoke all on schema bkalot_clone from anon, authenticated;

-- ── הרישום: הפרויקט מפסיק להצביע ל-NULL ──────────────────────────────────────
update core.projects
   set supabase_schema = 'bkalot_clone',
       stage           = 'wip',
       updated_at      = now()
 where slug = 'bkalot-clone';
