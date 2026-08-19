-- 0104 — לשכפול התפעולי של בקלות (37, bkalot-studio) לא היה אף מסלול משלו
--
-- לופ B, תחום 17-31/37/29/26. "מסלולים ומחירים" בעמוד השירות (portal/public/
-- system.html) נגזר מ-public.more30_system_page(p_app) לפי core.plans.app_key
-- = core.projects.path. נמדד: מתוך אחד-עשרה המסלולים החיים והציבוריים
-- בתחום הזה (chizukim/orech/mthbram/zchuyot/galil/studio/mechiron/kupot/crm/
-- gesher/bkalot-studio) רק bkalot-studio (37, path='bkalot-studio') לא היה
-- לו אף שורה ב-core.plans — ה-RPC נופל אז בכוונה למסלולי הפלטפורמה הכלליים
-- (app_key='more30': חינם/₪10, plans_from='more30'), התנהגות תקינה ולא
-- שבורה, אבל גנרית: לקוח שנכנס ל-more30.com/bkalot-studio רואה מחירון
-- שאינו קשור למוצר. bkalot (10, bkalot-rights) — המערכת שה-clone הזה
-- מעתיק במלואה (audit_status ב-core.projects: "עותק עצמאי מלא של בקלות
-- התפעולית") — כן נושאת מסלולים משלה (חינם/₪2/₪5). הבדל הצגה בלבד בין
-- שני עותקים של אותו מוצר, לא נכס חדש.
--
-- התיקון: שישה מסלולים תחת app_key='bkalot-studio', בדיוק כמו app_key=
-- 'bkalot' (אותו סדר/מחיר/תיוג — אותו מוצר). שלושה גלויים ללקוח (חינם/
-- בסיסי ₪2/מורחב ₪5, subscription), ושלושה פנימיים ללא שינוי (charge/
-- one_time/pro — pro הוא מסלול בדיקת-סליקה במחיר זניח, TEST MODE, לא
-- מיועד ללקוח). אין כתיבה לשום שורה קיימת (ON CONFLICT DO NOTHING), אין
-- שינוי קוד — רק הרשומה שה-RPC הקיים כבר יודע לקרוא ולהציג.

insert into core.plans
  (app_key, code, name_he, tagline, price_ils, period, features, is_default, sort, active, billing_kind, customer_visible)
values
  ('bkalot-studio', 'free', 'חינמי', 'גישה מלאה למה שהמערכת מציעה, בלי הגבלת זמן', null, null, '[]'::jsonb, true, 1, true, 'subscription', true),
  ('bkalot-studio', 'basic', 'בסיסי', 'גישה מלאה למערכת, בלי הגבלת שימוש.', 2, 'month', '[]'::jsonb, false, 20, true, 'subscription', true),
  ('bkalot-studio', 'extended', 'מורחב', 'הכול שבבסיסי, ובנוסף שמירת היסטוריה וייצוא.', 5, 'month', '[]'::jsonb, false, 30, true, 'subscription', true),
  ('bkalot-studio', 'charge', 'סליקה', 'תשלום כללי במערכת', 0, null, '[]'::jsonb, false, 50, true, 'charge', false),
  ('bkalot-studio', 'one_time', 'שימוש חד-פעמי', 'תשלום לפעולה בודדת', 0, 'once', '[]'::jsonb, false, 51, true, 'one_time', false),
  ('bkalot-studio', 'pro', 'פרו (בדיקה)', 'מסלול בדיקת סליקה בסכום זניח — לשנות בניהול לפני שיווק', 1, 'month', '[]'::jsonb, false, 60, true, 'subscription', false)
on conflict (app_key, code) do nothing;
