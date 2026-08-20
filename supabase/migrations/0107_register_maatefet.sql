-- more30 · register system 39 (maatefet) in the registry
-- ============================================================================
-- ADDITIVE ONLY, and only DML: one row in `core.projects`. No new tables, no
-- schema changes, nothing touched in `public`, `zr_*`, `nadlan`, or any other
-- app's schema.
--
-- This is what makes the system appear on more30.com: the home page reads
-- `public.more30_public_systems`, which reads this table. There is no
-- hard-coded list in the portal bundle (see portal/src/App.tsx). Same
-- precedent as 0007_register_kesef_and_kiosk.sql (34/35) and the 33/36-38
-- rows added to packages/config/src/registry.ts on 10/08.
--
-- MAATEFET is the flagship "chatan/kallah instructors" platform specified in
-- MAATEFET_BUILD.md (source of truth: the user's "מעטפת גרסה 2" brief — 15
-- modules, one core/two faces by `segment`, 5 build stages). No application
-- code exists yet — this round only registers the system honestly as
-- not-yet-built, exactly like 37 (bkalot-clone) and 38 (events-gifts) already
-- are. `is_deployed = false` + `live = false` makes the portal render it as
-- "בקרוב" with the stage sentence, instead of either a working "enter" button
-- for a page that does not exist, or hiding a system the user has already
-- specified.
insert into core.projects (
  number, slug, repo, name, name_he, category, stage, live,
  supabase_project, supabase_schema, deploy_target, is_protected,
  department, is_deployed, live_url, path, tagline, what_it_does,
  public_visible, note
) values (
  '39', 'maatefet', 'more30', 'Maatefet — Chatan/Kallah Instructor Platform', 'מעטפת — ליווי מדריכי חתנים ומדריכות כלות',
  'events', 'idea', false,
  null, null, 'unknown', false,
  'community', false, null, 'maatefet',
  'פלטפורמה אחת למדריכי חתנים ומדריכות כלות: ניהול זוגות, סטודיו תוכן, ליווי אחרי החתונה ודירקטוריז מקצועיים.',
  'ליבה אחת עם שני פנים (segment=חתנים/כלות): CRM לזוגות, סטודיו תוכן ומיתוג אישי, אזור אישי לחתן/כלה, יומן ואישורי הגעה, ליווי אחרי החתונה, תיאום מדריך↔מדריכה, פורום מקצועי, ארגון החתונה, ודירקטוריז (פוסקים/מקוואות/מסדרי קידושין/בודקות/יועצים). תשלום מהמדריכים בלבד (SaaS); invite-only בכל שכבה. 15 מודולים לפי המפרט המלא.',
  true,
  'שלב 0 בלבד (רישום). קוד האפליקציה טרם נבנה — ‏/maatefet יחזיר "בקרוב" עד שיבנה בפועל. מפרט מחייב מלא: MAATEFET_BUILD.md (5 שלבי בנייה, החל משלד+ליבת מגזר-כלות). החלטות פתוחות (שם מותג, ספק סליקה, ניסוח משפטי) → NEEDS_USER.md, לא הומצאו.'
)
on conflict (number) do nothing;
