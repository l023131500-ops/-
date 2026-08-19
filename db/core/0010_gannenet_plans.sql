-- 40 gannenet — סולם המסלולים של המערכת עצמה, ותיקון תיאור פומבי שלא היה נכון.
--
-- §8א קבע 2/5/10/12/15 ₪, ומסלולי ה-2 וה-5 נזרעו על כל המערכות הקלות החיות.
-- גן-קליק נכנסה לפלטפורמה אחרי אותה זריעה (§0), ולכן היא נשארה המערכת הציבורית
-- החיה היחידה בלי אף שורה ב-core.plans. עמוד המסלולים שלה
-- (more30.com/system.html?app=gannenet) לא היה ריק — הוא נפל לברירת המחדל של
-- הפלטפורמה והציג "פרימיום 10 ₪", כלומר לקוחה שהגיעה אליו מכרטיס גן-קליק ראתה
-- מחיר של מערכת אחרת ולא של זו שעליה לחצה.
--
-- הנוסח זהה מילה במילה ל-19 המערכות האחרות בכוונה: הסולם הוא של הפלטפורמה, ולא
-- מקום לכתוב בו הבטחה ייחודית. features נשאר [] כמו בכולן, ו-§1בב.3 בתוקף —
-- כל הפיצ'רים פתוחים בחינם, והמסלולים בתשלום הם תצוגה בלבד עד שיוגדר מה כלול.
--
-- שורות החיוב הנסתרות (charge / one_time / pro) לא נזרעו כאן במכוון: הן צנרת
-- סליקה, המסלול הזה במצב טסט, ו-more30_checkout לא נדרש להן כדי לרשום בחירה.

insert into core.plans (app_key, code, name_he, tagline, price_ils, period, features, is_default, sort, active, billing_kind, customer_visible)
values
  ('gannenet', 'free',     'חינמי',  'גישה מלאה למה שהמערכת מציעה, בלי הגבלת זמן', null, null,    '[]'::jsonb, true,  1,  true, 'subscription', true),
  ('gannenet', 'basic',    'בסיסי',  'גישה מלאה למערכת, בלי הגבלת שימוש.',            2,    'month', '[]'::jsonb, false, 20, true, 'subscription', true),
  ('gannenet', 'extended', 'מורחב',  'הכול שבבסיסי, ובנוסף שמירת היסטוריה וייצוא.',   5,    'month', '[]'::jsonb, false, 30, true, 'subscription', true)
on conflict (app_key, code) do nothing;

-- אותו עמוד הציג גם "פרוסה בנפרד (Railway)". זה היה נכון לפני §0 ואינו נכון
-- מאז: המערכת מוגשת תחת more30.com/gannenet מתוך המונו-רפו, ונפרסת ב-Vercel.
update core.projects
set what_it_does = 'מדף חומרים לגננות: בחירת עמודים, עבודה אופליין, מחולל דפי משימה ב-AI עם מכסה יומית, ו"החומרים שלי" לכל חשבון. אפליקציית Next.js 14 שמוגשת תחת more30.com/gannenet מתוך המונו-רפו (apps/40-gannenet) ונפרסת בפרויקט Vercel gannenet-more30.',
    updated_at = now()
where number = '40';
