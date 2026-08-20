-- 0128 — מערכות מוכפלות ישבו כתף אל כתף עם המערכת שהחליפה אותן
--
-- הנחיית משתמש בעדיפות עליונה (20/08, core.projects#33): "הצג כל אתר/מערכת
-- פעילה... מערכות מוכפלות/כפולות מופיעות למטה". core.projects כבר מחזיקה
-- בדיוק את השדה הזה — replaced_by — ו-/admin/pricing כבר מציג עליו תג
-- ("הוחלפה ע"י X"). אבל more30_public_systems (הדף הציבורי, more30.com/)
-- מעולם לא בחר את העמודה הזו, ולכן דף הבית לא יכול היה לדעת איזו שורה כפולה.
--
-- נמדד חי (20/08/2026): 4 שורות ציבוריות live+deployed+public_visible עם
-- replaced_by תקין — 06 kupot-holim (הוחלפה ע"י 28), 12 smel-ndln (הוחלפה
-- ע"י 32 נדל"ן ברגע), 15 egod (הוחלפה ע"י 01), 24 galilee-connect-hub
-- (הוחלפה ע"י 16). בשני תחומים (realestate, health) המספר הנמוך יותר של
-- הכפולה מיקם אותה *לפני* המערכת החיה שהחליפה אותה בסדר המספרי הרגיל —
-- כלומר smel-ndln (12, גרסה ישנה) הופיע לפני נדל"ן ברגע (32, המערכת שעליה
-- הושקעו 20+ סבבי דיוק בלולאה הזו). זה בדיוק ההפך מהכוונה.
--
-- מה 0128 עושה: מוסיפה replaced_by ל-view הציבורי. שום דבר אחר לא זז — אין
-- שינוי לשורה עצמה, אין שינוי לשער public_visible/is_protected/to_delete
-- הקיים, ואין הסתרה: הכפולות עדיין "פעילות" ועדיין מוצגות, כפי שההנחיה
-- מבקשת ("כל מערכת פעילה מופיעה") — רק הסדר בעמוד (portal/src/App.tsx)
-- הוא שמשתמש בעמודה החדשה כדי למקם אותן למטה בתוך התחום שלהן.

begin;

create or replace view public.more30_public_systems as
select number,
       path,
       coalesce(nullif(name_he, ''), name) as title,
       tagline,
       what_it_does,
       coalesce(nullif(department, ''), 'other') as department,
       live,
       is_deployed,
       live_url,
       stage::text as stage,
       coalesce(is_protected, false) as is_protected,
       coalesce(public_visible, false) as public_visible,
       nullif(replaced_by, '') as replaced_by
from core.projects p
where coalesce(to_delete, false) is false
  and coalesce(public_visible, false) is true
  and coalesce(is_protected, false) is false
order by live desc, (number::integer);

commit;
