-- 0017 — מסלול שאף עמוד לא הציע, ובכל זאת אפשר היה להירשם אליו.
--
-- core.issues #78. לכל מערכת שלושה מסלולים שקיימים לנו ולא ללקוח:
-- 'pro (בדיקה)' ב-1 ₪, 'charge' ו-'one_time' — כולם customer_visible=false,
-- ו-billing-safety.mjs כבר מוודא שהם לא מופיעים בעמוד המחירים הציבורי.
--
-- אבל "לא מופיע" אינו "לא נגיש". more30_subscribe חיפשה
--   app_key = <המערכת> and code = p_plan and active
-- ונפלה אחורה למסלולי הפלטפורמה באותם תנאים — שני החיפושים בלי
-- customer_visible. הקודים קצרים ונחשים, ו-'pro' חוזר עם chargeable=true,
-- הדגל היחיד ש-/subscribe מפרש כרשות לפתוח מסלול תשלום.
--
-- נמדד מול הפרודקשן עם חשבון בדיקה אמיתי לפני השינוי
-- (scripts/qa/hidden-tier-reach.mjs): 75 בקשות על 25 מאונטים — **כולן**
-- התקבלו, 25 מהן עם chargeable=true. כלומר הפער רחב ממה שנרשם ב-#78: שם
-- תואר רק מסלול הנפילה-אחורה, ובפועל החיפוש הראשי הוא הנתיב — 24 מתוך 25
-- נרשמו על ה-app_key של המערכת עצמה, ורק 'admin', שאין לו שורות משלו,
-- הגיע דרך הנפילה אחורה.
--
-- מה לא קרה: כסף. billing_settings.mode='off', אין ספק סליקה מחובר,
-- ו-more30_checkout מסננת customer_visible מאז 0016 ולכן חוסמת את השלב הבא.
-- זו נגישות, לא חיוב — ולכן תוקנה כצעד נפרד ולא כטלאי בתוך 0016.
--
-- התיקון: אותו תנאי בשני החיפושים. ההצעה ללקוח מגיעה ממסלולים גלויים,
-- ולכן גם ההרשמה תיקלט על מסלולים גלויים בלבד, וזה גם מה ש-more30_checkout
-- כבר עושה — שתי הפונקציות מסכימות עכשיו אילו מסלולים קיימים, וחוסר ההסכמה
-- ביניהן הוא בדיוק מה שהפיל את #77.
--
-- הודעת השגיאה נשארת 'unknown plan' (22023), זהה ל-more30_checkout: מסלול
-- מוסתר צריך להיראות כלא-קיים, לא כ"קיים ואסור" — הודעה שמבדילה ביניהם היא
-- הודעה שמאשרת למי שמנחש שהניחוש היה נכון.
--
-- מסלול ברירת המחדל החינמי אינו נפגע: 'free' הוא customer_visible=true בכל
-- מערכת שיש לה שורות, וכל היתר נופלות ל-more30/free שגם הוא גלוי.
--
-- אף מנוי קיים אינו מושפע: 13 השורות ב-core.subscriptions כולן על
-- kupot/extended, more30/premium ו-torah/basic — שלושתם גלויים.

create or replace function public.more30_subscribe(p_app text, p_plan text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'core'
as $function$
declare
  v_key text;
  v_plan core.plans%rowtype;
  v_id bigint;
  v_status text;
  v_existing text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- customer_visible בשני החיפושים: מה שהלקוח יכול להירשם אליו הוא בדיוק מה
  -- שהוצע לו. 'pro (בדיקה)', 'charge' ו-'one_time' אינם נגישים מכאן.
  v_key := coalesce(core.app_key_normalize(p_app), 'more30');
  select * into v_plan from core.plans
   where app_key = v_key and code = p_plan and active and customer_visible;
  if v_plan.code is null then
    select * into v_plan from core.plans
     where app_key = 'more30' and code = p_plan and active and customer_visible;
    if v_plan.code is null then
      raise exception 'unknown plan: % for %', p_plan, v_key using errcode = '22023';
    end if;
    v_key := 'more30';
  end if;

  if v_plan.is_default then
    delete from core.subscriptions
    where user_id = auth.uid() and app_key = v_key and status = 'requested';
    return jsonb_build_object('ok', true, 'app_key', v_key, 'plan', v_plan.code,
                              'status', 'free', 'charged', false,
                              'price_missing', false, 'chargeable', false,
                              'message', 'החשבון שלך במסלול החינמי. לא בוצע חיוב.');
  end if;

  select status into v_existing from core.subscriptions
  where user_id = auth.uid() and app_key = v_key and status <> 'cancelled';

  insert into core.subscriptions (user_id, app_key, plan_code)
  values (auth.uid(), v_key, v_plan.code)
  on conflict (user_id, app_key) where status <> 'cancelled'
  do update set plan_code = excluded.plan_code, requested_at = now()
  returning id, status into v_id, v_status;

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'app_key', v_key, 'plan', v_plan.code,
    'plan_name', v_plan.name_he, 'status', v_status,
    'already', v_existing is not null,
    -- אין סליקה מחוברת, ולכן שום מסלול אינו גובה בפועל.
    'charged', false,
    'price_ils', v_plan.price_ils,
    -- ⛔ טרם נקבע מחיר.
    'price_missing', v_plan.price_ils is null,
    -- ⛔ הדגל היחיד שמתיר לפתוח חלון תשלום.
    'chargeable', coalesce(v_plan.price_ils, 0) > 0,
    'message',
      case
        when v_plan.price_ils is null
          then 'הבקשה נרשמה. המחיר למסלול הזה טרם נקבע, ולכן אין מה לגבות.'
        when v_plan.price_ils = 0
          then 'המסלול הזה פעיל ללא חיוב. לא נגבה ממך דבר.'
        else 'הבקשה נרשמה (' || v_plan.price_ils::text ||
             ' ₪). הסליקה עדיין לא נפתחה, ולכן לא בוצע חיוב.'
      end
  );
end;
$function$;
