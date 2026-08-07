-- 0021 — שלוש מערכות חיות שהמחיר הזול ביותר בהן היה של מישהו אחר.
--
-- §8א קבע סולם 2/5/10/12/15 ₪, ובתוכו: 2 ₪ = בסיס למערכת בודדת, 5 ₪ = פלוס
-- למערכת בודדת. הסולם הוחל על המערכות החיות — אבל לא על כולן.
--
-- מפתח הצירוף בין core.projects ל-core.plans הוא `path`, לא `slug`. עליו נמדד:
-- מתוך 20 המערכות שהן public_visible ויש להן path, ל-17 יש free/basic/extended
-- משלהן. לשלוש אין אף שורה גלויה — studio (26), kiosk (35), tivuch (36).
--
-- 0019 תיעדה את שמונה המערכות בלי שורות גלויות והשאירה את הנפילה-אחורה
-- למסלולי הפלטפורמה כפי שהיא, וזה נכון: הנפילה עובדת. חמש מהשמונה
-- (crm · gesher · smachot · mthbram · admin) אינן public_visible, כלומר אף לקוח
-- אינו מגיע אליהן, והן נשארות כאן בלי שינוי. שלוש הן חיות ופומביות.
--
-- מה שהלקוח מקבל שם היום, נמדד ב-more30_system_page לפני השינוי: אותן שתי
-- שורות בדיוק בשלושתן — 'חינמי', ואחריה 'פרימיום' ב-10 ₪ שהתיאור שלה הוא
-- "גישה לכל המערכות הציבוריות". זו חבילת הפלטפורמה, והיא הצעה לגיטימית —
-- אבל היא גם המחיר הנמוך ביותר שנפתח בעמוד של מערכת בודדת, פי חמישה
-- מ-2 ₪ שנקבעו בדיוק למקרה הזה.
--
-- שלוש השורות כאן זהות בתוכנן לאלה של 17 האחרות (הקופי הוא הקופי הגנרי
-- שכבר קיים שם, לא נוסח חדש לכל מערכת), ומה שמשתנה הוא app_key בלבד.
-- core.billing_settings.mode = 'off' — אין ספק סליקה מחובר, price_ils הוא
-- קטלוג ותצוגה בלבד, ואף אחד מהשלושה אינו במוגנות.
--
-- הערה למשתמש: tivuch (נדל״ן פרו) הוא מערכת ניהול למתווכים — כבדה יותר
-- ממערכת "קלה", ובמשפחת nadlan שיש לה סולם משלה (12/15 ₪). היא מקבלת כאן
-- 2/5 כמו האחרות מפני שזו ההחלה העקבית של מה שנקבע, ולא מפני שנמדד שזה
-- המחיר הנכון לה. שינוי = UPDATE יחיד ב-core.plans, בלי פריסה.

insert into core.plans
  (app_key, code, name_he, tagline, price_ils, period, features, is_default, sort, active, billing_kind, customer_visible)
select
  k.app_key, t.code, t.name_he, t.tagline, t.price_ils, t.period,
  '[]'::jsonb, t.is_default, t.sort, true, 'subscription', true
from (values ('studio'), ('kiosk'), ('tivuch')) as k(app_key)
cross join (values
  ('free',     'חינמי',  'גישה מלאה למה שהמערכת מציעה, בלי הגבלת זמן', null::numeric, null::text, true,  1),
  ('basic',    'בסיסי',  'גישה מלאה למערכת, בלי הגבלת שימוש.',          2::numeric,    'month',    false, 20),
  ('extended', 'מורחב',  'הכול שבבסיסי, ובנוסף שמירת היסטוריה וייצוא.', 5::numeric,    'month',    false, 30)
) as t(code, name_he, tagline, price_ils, period, is_default, sort)
on conflict (app_key, code) do nothing;
