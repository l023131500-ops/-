-- 0047 — /showcase נושא את שם המותג, ואין עליו אף מערכת
--
-- §7 קובע שם מותג אחד, "עולם הסטארטאפים", ומבקש שבפוטר של כל אתר יהיה קישור
-- "פותח ע"י עולם הסטארטאפים" אל אתר התדמית שלנו. /showcase הוא העמוד הזה: שם
-- המותג בכותרת, ב-H1 ובזכויות היוצרים, ותחתיו רשת המערכות.
--
-- §4 קובע עמודה אחת למה שהציבור רואה — core.projects.public_visible — ו-0040
-- חיברה אליה את שער ה-showcase, כדי שהמתג לעולם לא יפרסם מערכת שדף הבית מסתיר.
-- מאז יש שער אחד, עם שלוש תשובות ותשובה רביעית שהיא "עוברת":
--
--   'unregistered'  אין path — אינה מערכת שמורכבת תחת more30.com
--   'protected'     is_protected — אינה מתפרסמת
--   'hidden'        public_visible=false — מוסתרת מדף הבית
--   'ok'            עוברת
--
-- לשער שני שמות, וההבדל ביניהם הוא בדיוק מלכודת אחת:
--   core.app_showcase_block(path)    מחזירה 'ok' כשהשורה עוברת
--   core.app_showcase_blocked(path)  = nullif(block(path), 'ok') — מחזירה null
-- זו הצורה שגם more30_showcase וגם more30_admin_showcase_set קוראות
-- ("blocked is null"), וזו הצורה שכאן. "block(path) is null" לעולם אינו אמת
-- ולכן עדכון שנשען עליו נוגע באפס שורות ומדווח הצלחה.
--
-- מה שאף מיגרציה ואף ריצה לא שאלה עד היום: כמה שורות באמת מסומנות להצגה.
-- scripts/qa/admin-pricing-showcase-settable.mjs (07/08) כתב את המספר לתוך
-- measured_on_live_db.rows_with_show_in_showcase_true — 0 — כרקע לבדיקה אחרת,
-- ולא כממצא. נמדד עכשיו על 38 השורות:
--
--   show_in_showcase = true    0
--   public_visible   = true   20
--   שער עובר (null)           19
--
-- כלומר תשע-עשרה מערכות חיות עוברות את השער שנבנה בדיוק כדי לשמור עליהן,
-- והעמוד שנושא את שם המותג מצייר לכולן את משפט הריק:
-- "עדיין לא נבחרו מערכות להצגה". scripts/qa/showcase-populated.mjs מדד את
-- שניהם כאנונימי מול הייצור — 20 בדף הבית, 0 ב-/showcase — וצילם.
--
-- זה לא באג בקוד. showcase.html קורא נכון, more30_showcase מסנן נכון, והמתג
-- ב-/admin/pricing שומר נכון מאז 0039. הנתון עצמו אף פעם לא נכתב: העמודה נולדה
-- false והמתג מעולם לא נלחץ.
--
-- מה שהמיגרציה עושה: מדליקה את show_in_showcase לכל שורה שהשער כבר מאשר.
-- הרשימה נגזרת מהשער ואינה מוקלדת ביד — אותו core.app_showcase_blocked שהמתג
-- ב-/admin/pricing קורא לו בכתיבה, ואותו תנאי ש-more30_showcase מסנן בו
-- בקריאה. שלושת המקומות שואלים את אותה שאלה, ולכן אי אפשר לפרסם כאן מערכת
-- שאחד מהם היה חוסם.
--
-- מה שלא מודלק, ובכוונה:
--   · אחת-עשרה שורות מוסתרות מדף הבית ('hidden') — financial, zol, smachot,
--     shiurim, igud, mthbram, mechiron, crm, gesher, bkalot-studio, events.
--     §4 הוא שהסתיר אותן ו-#107 הוא שקבע שהקטלוג לא יעקוף אותו.
--   · שמונה שורות בלי path ('unregistered'), ובהן שתי המוגנות 08 ו-09.
--   · #33 (slug=more30-spec-loop) — public_visible=true אבל path ריק, כי היא
--     אינה מורכבת תחת נתיב, היא האתר עצמו. זו הסיבה שדף הבית סופר 20 והשער
--     מאשר 19, ושני המספרים נכונים. אותה שורה בדיוק היא זו שהפילה את מתג
--     ה-showcase ב-0039 ואת ספירת ה-admin_url ב-0046.
--
-- הפעולה הפיכה בשורה אחת, ובממשק: המתג "הצג בעולם הסטארטאפים" בכל כרטיס
-- ב-/admin/pricing כותב את אותה עמודה דרך more30_admin_showcase_set.
--
-- אין פריסה: showcase.html כבר בייצור והוא קורא את more30_showcase בכל טעינה,
-- ולכן העמוד מתמלא ברגע שהמיגרציה מוחלת. אין כאן תלות ב-core.issues #83.

begin;

-- ── 1. כל שורה שהשער מאשר — מוצגת ──────────────────────────────────────────
update core.projects p
set    show_in_showcase = true,
       updated_at       = now()
where  coalesce(p.to_delete, false) = false
  and  coalesce(p.show_in_showcase, false) = false
  and  core.app_showcase_blocked(p.path) is null;   -- blocked, לא block

-- ── 2. הממצא — נפתח ונסגר כאן ───────────────────────────────────────────────
insert into core.issues (app, title, detail, severity, status, owner, evidence, resolved_at)
select
  'more30',
  'העמוד שנושא את שם המותג הציג אפס מערכות, בזמן שדף הבית הציג עשרים',
  'נמדד כאנונימי מול הייצור 07/08/2026 (scripts/qa/showcase-populated.mjs): ' ||
  'more30_public_systems החזיר 20 מערכות ו-more30_showcase() החזיר 0. ' ||
  '/showcase — הכותרת, ה-H1 והפוטר שלו הם "עולם הסטארטאפים", כלומר זהו אתר ' ||
  'התדמית ש-§7 מבקש לקשר אליו מהפוטר של כל אתר — צייר את משפט הריק ' ||
  '"עדיין לא נבחרו מערכות להצגה" ותו לא.' || E'\n\n' ||
  'אין כאן באג בקוד: showcase.html קורא את ה-RPC כשורה, more30_showcase ' ||
  'מסנן כשורה, והמתג ב-/admin/pricing שומר כשורה מאז 0039. ' ||
  'core.projects.show_in_showcase נולדה false ב-38 השורות ומעולם לא נכתבה — ' ||
  'admin-pricing-showcase-settable.mjs אף רשם את המספר ' ||
  '(rows_with_show_in_showcase_true: 0) כרקע לבדיקה אחרת, בלי לקרוא לו ממצא.' ||
  E'\n\n' ||
  '0047 מדליקה את העמודה לכל שורה ש-core.app_showcase_blocked מאשר — 19 מערכות. ' ||
  'הרשימה נגזרת מהשער ולא מוקלדת: אותה פונקציה שהמתג קורא בכתיבה ושהקורא ' ||
  'מסנן בה. לכן 11 המוסתרות מדף הבית נשארות בחוץ (§4 · #107), ושמונה השורות ' ||
  'בלי path — ובהן המוגנות 08 ו-09 — אינן ניתנות לפרסום כלל. ' ||
  'דף הבית סופר 20 והשער מאשר 19 כי #33 (more30-spec-loop) היא האתר עצמו ' ||
  'ואין לה נתיב הרכבה; שני המספרים נכונים. ' ||
  'העמוד מתמלא בלי פריסה — הוא קורא את ה-RPC בכל טעינה.',
  'normal', 'fixed', 'agent',
  'scripts/qa/showcase-populated.mjs · ' ||
  'QA/platform/showcase-populated-0807/{_before.json,_results.json,before-light.png,showcase-light.png,showcase-dark.png}',
  now()
where not exists (
  select 1 from core.issues
  where app = 'more30'
    and title = 'העמוד שנושא את שם המותג הציג אפס מערכות, בזמן שדף הבית הציג עשרים'
);

commit;
