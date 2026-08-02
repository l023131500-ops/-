-- more30 · register systems 34 (kesef) and 35 (kioskfleet) in the registry
-- ============================================================================
-- ADDITIVE ONLY, and only DML: two rows in `core.projects`. No new tables, no
-- schema changes, nothing touched in `public`, `zr_*`, `nadlan`, or any other
-- app's schema. Table counts per schema are unchanged by design — the check
-- from the integration brief (count before, run, count after) has nothing to
-- compare because this migration creates no relations.
--
-- These two rows are what makes the systems appear on more30.com: the home page
-- reads `public.more30_public_systems`, which reads this table. There is no
-- hard-coded list in the portal bundle (see portal/src/App.tsx).
-- ============================================================================

-- 34 · kesef — budget transparency for local authorities -----------------------
--
-- Deliberately registered as NOT deployed. The `kesef` schema is live on this
-- project (36 tables, RLS on all of them, applied 02/08/2026), but the
-- application source has not been located in any reachable repository, so there
-- is nothing serving more30.com/kesef yet. Recording it as deployed would put a
-- working "enter" button on the home page in front of a page that does not
-- exist; recording it as absent would hide a system that genuinely exists and
-- has a database. `is_deployed = false` makes the portal render it as
-- "בקרוב" with the stage sentence, which is the honest state.
insert into core.projects (
  number, slug, repo, name, name_he, category, stage, live,
  supabase_project, supabase_schema, deploy_target, is_protected,
  department, is_deployed, live_url, path, tagline, what_it_does,
  public_visible, note
) values (
  '34', 'kesef', 'UNKNOWN', 'Kesef — Budget Transparency', 'כסף — שקיפות תקציבית',
  'finance', 'wip', false,
  'uhnrgujbdxhhmoxcjria', 'kesef', 'vercel', false,
  'community', false, null, 'kesef',
  'לראות בדיוק כמה כסף ציבורי הגיע לרשות שלך — וכמה נתקע בדרך.',
  'פלטפורמת שקיפות תקציבית לרשויות מקומיות: מדדים והשוואה לקבוצת שווים, התראות על קולות קוראים, ותיק מוכן לפגישה עם ראש הרשות. הנתונים מגיעים ממקורות ציבוריים בלבד — data.gov.il, מפתח התקציב, הלמ"ס וביטוח לאומי — וכל מספר מקושר למסמך מקור. פיילוט: חצור הגלילית.',
  true,
  'סכימת kesef חיה על ה-hub (36 טבלאות, RLS על כולן). קוד המקור טרם אותר — ראה NEEDS_USER. חסם נוסף: kesef אינה ב-Exposed schemas ולכן ה-Data API מחזיר 406.'
)
on conflict (number) do nothing;

-- 35 · kioskfleet — remote kiosk device management -----------------------------
--
-- Stays on Railway: it is a stateful Express server holding SQLite and open
-- WebSockets, which is the one shape serverless cannot host. It is reachable at
-- more30.com/kiosk through a portal rewrite, so `live_url` is the more30.com
-- address and never the *.up.railway.app one — NetFree blocks that host, and a
-- link the audience cannot open is not a link.
insert into core.projects (
  number, slug, repo, name, name_he, category, stage, live,
  supabase_project, supabase_schema, deploy_target, is_protected,
  department, is_deployed, live_url, admin_url, path, tagline, what_it_does,
  public_visible, note
) values (
  '35', 'kioskfleet', 'l023131500-ops/zol', 'KioskFleet', 'KioskFleet — ניהול צי קיוסקים',
  'commerce', 'beta', true,
  null, null, 'railway', false,
  'misc', true, 'https://more30.com/kiosk', 'https://more30.com/kiosk/console', 'kiosk',
  'להפוך כל טאבלט אנדרואיד לעמדת קיוסק נעולה — ולשלוט בכולן מרחוק ממסך אחד.',
  'ניהול צי מכשירי קיוסק בזמן אמת: נעילת המכשיר על אתר אחד, רישום מכשיר בקוד בן שש ספרות, ניטור סוללה וחיבור, ופקודות מרחוק — אתחול, רענון, כיבוי מסך והחלפת כתובת — לפי מספר סידורי.',
  true,
  'שרת stateful (Express + SQLite + WebSocket) על Railway, project kioskfleet. SQLite על Volume בן 1GB ב-/app/data. מוגש תחת BASE_PATH=/kiosk ומנותב מהפורטל. עדכון בזמן אמת בקונסולה נופל ל-polling כשה-WebSocket אינו עובר בפרוקסי.'
)
on conflict (number) do nothing;
