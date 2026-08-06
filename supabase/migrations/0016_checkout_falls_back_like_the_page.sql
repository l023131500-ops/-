-- 0016 — עמוד המנוי הציע מסלול ש-more30_checkout טענה שאינו קיים.
--
-- more30_system_page נופלת בכוונה למסלולי הפלטפורמה כשלמערכת אין מסלולים
-- משלה ('plans_from':'more30'), ו-more30_subscribe נופלת באותו אופן. רק
-- more30_checkout — הפונקציה שנקראת מהעמוד מאז §8ג — חיפשה אך ורק
-- app_key = <המערכת>, ולכן זרקה
--   unknown plan: premium for kiosk   (SQLSTATE 22023, HTTP 400)
-- על בדיוק אותו קוד מסלול שהעמוד עצמו הרגע הציג.
--
-- מי נפגע בפועל: כל מערכת בלי מסלולים משלה ב-core.plans. בין הציבוריות —
-- kiosk, studio, tivuch; וכן crm, financial, gesher, igud, mthbram, shiurim,
-- smachot, zol. הלקוח ראה "פרימיום · 10 ₪", לחץ, וקיבל על המסך את הודעת
-- השגיאה של מסד הנתונים באנגלית:
--   "לא הצלחנו לבדוק את מצב הסליקה. unknown plan: premium for kiosk"
--
-- נמדד מול הפרודקשן עם חשבון בדיקה אמיתי לפני התיקון
-- (scripts/qa/checkout-flow.mjs kiosk premium): 12 עברו, 4 נכשלו — הבקשה
-- נרשמה ו-chargeable=true, והשלב הבא ענה 400. torah/basic, שיש לו מסלולים
-- משלו, עבר 17/17 באותה ריצה. כלומר הפער נפתח בדיוק במערכות שנופלות אחורה.
--
-- התיקון: אותה נפילה אחורה, באותו סדר, עם תנאי אחד נוסף — customer_visible.
-- ההצעה ללקוח מגיעה ממסלולים גלויים בלבד, ולכן גם מסלול התשלום ייפתח על
-- מסלול גלוי בלבד; 'pro (בדיקה)' ו-'charge' נשארים בלתי-נגישים מכאן.
-- v_key מוחלף ל-'more30' בדיוק כמו ב-more30_subscribe, כדי שהתשובה תצביע על
-- אותה מערכת שתחתיה נרשם המנוי.
--
-- לא שונה כאן, ונרשם: more30_subscribe מחפשת בלי customer_visible, ולכן
-- לקוח שמנחש p_plan='pro' מקבל בקשה רשומה עם chargeable=true. אין חיוב
-- (billing_settings.mode='off', ואין ספק מחובר), אבל זו נגישות למסלול שלא
-- נועד ללקוחות. שינוי שם נוגע במסלול שכבר בשימוש ולכן אינו חלק מהצעד הזה.

create or replace function public.more30_checkout(p_app text, p_plan text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'core'
as $function$
declare
  v_key  text;
  v_plan core.plans%rowtype;
  v_mode text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select mode into v_mode from core.billing_settings where id;
  v_mode := coalesce(v_mode, 'off');

  v_key := coalesce(core.app_key_normalize(p_app), 'more30');
  select * into v_plan from core.plans
   where app_key = v_key and code = p_plan and active and customer_visible;

  -- מערכת בלי מסלולים משלה נופלת למסלולי הפלטפורמה — אותה נפילה שבה
  -- more30_system_page בנתה את העמוד שהלקוח הרגע ראה.
  if v_plan.code is null and v_key <> 'more30' then
    select * into v_plan from core.plans
     where app_key = 'more30' and code = p_plan and active and customer_visible;
    if v_plan.code is not null then
      v_key := 'more30';
    end if;
  end if;

  if v_plan.code is null then
    raise exception 'unknown plan: % for %', p_plan, v_key using errcode = '22023';
  end if;

  -- מחיר ריק אינו "חינם". שתי המשמעויות נבדלות כאן במפורש, כי בלבול ביניהן
  -- הוא בדיוק מה שפותח חלון תשלום על אפס או גובה על מסלול שטרם תומחר.
  if v_plan.price_ils is null then
    return jsonb_build_object('action','none','reason','price_not_set','charged',false,
      'message','המחיר למסלול הזה טרם נקבע, ולכן אין מה לגבות.');
  end if;

  if v_plan.price_ils = 0 then
    return jsonb_build_object('action','grant','reason','free','charged',false,
      'price_ils',0,'message','המסלול הזה ללא חיוב — הגישה נפתחת מיד.');
  end if;

  if v_mode = 'off' then
    return jsonb_build_object('action','none','reason','billing_off','charged',false,
      'price_ils',v_plan.price_ils,
      'message','למסלול יש מחיר, אבל הסליקה סגורה. לא בוצע ולא ייבוצע חיוב.');
  end if;

  -- מכאן: mode='test' ומחיר > 0. גם עכשיו לא מתבצע חיוב — מוחזרת כוונת
  -- תשלום מסומנת כבדיקה, שהלקוח אמור להציג בסביבת הטסט של הספק בלבד.
  return jsonb_build_object(
    'action','test_payment',
    'charged', false,
    'mode', 'test',
    'app_key', v_key,
    'plan', v_plan.code,
    'plan_name', v_plan.name_he,
    'price_ils', v_plan.price_ils,
    'provider', (select provider from core.billing_settings where id),
    'message','זו כוונת תשלום לבדיקה בלבד. אין חיוב אמיתי, ואין להשתמש בכרטיס אמיתי.'
  );
end;
$function$;
