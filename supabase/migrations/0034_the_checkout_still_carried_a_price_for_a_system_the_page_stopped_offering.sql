-- 0034 — הקורא החמישי: הסליקה המשיכה להחזיק מחיר למערכת שהעמוד הפסיק להציע
--
-- 0033 קבעה את הכלל של §4 — "מה שאינו מוצע בדף הבית אינו נמכר" — ונתנה לו מקור
-- אמת אחד, core.app_offer_block(). היא לימדה אותו לשלושה קוראים: more30_plans,
-- more30_system_page ו-more30_subscribe. הקורא הרביעי שנוגע בכסף,
-- more30_checkout — הפונקציה שההערה שלה ב-subscribe.html קוראת לה "מי שמכריע" —
-- לא קיבל אותו. כותרת הקומיט של 0033 ("the checkout kept selling it") תיארה
-- בדיוק את הפער הזה, והתיקון עצמו עצר שורה אחת לפניו.
--
-- נמדד חי על ההאב ב-07/08/2026, כמשתמש מחובר אמיתי
-- (qa.offer+1786081920916896@more30.com), מול אותן 11 המערכות שחסומות היום:
--
--   app             offer_block   more30_plans.offered   more30_checkout
--   -------------   -----------   --------------------   -----------------------------
--   mechiron        not_offered   false                  none/billing_off · price 2 ₪
--   mechiron        not_offered   false                  none/billing_off · price 5 ₪
--   crm             not_offered   false                  none/billing_off · price 10 ₪
--   gesher          not_offered   false                  none/billing_off · price 10 ₪
--   mthbram         not_offered   false                  none/billing_off · price 10 ₪
--   smachot         not_offered   false                  none/billing_off · price 10 ₪
--   bkalot-studio   not_live      false                  none/billing_off · price 10 ₪
--   events          not_live      false                  none/billing_off · price 10 ₪
--   financial       not_live      false                  none/billing_off · price 10 ₪
--   igud            not_live      false                  none/billing_off · price 10 ₪
--   shiurim         not_live      false                  none/billing_off · price 10 ₪
--   zol             not_live      false                  none/billing_off · price 10 ₪
--
-- שתי הצורות של אותו ליקוי, ושתיהן כבר טופלו בשלושת הקוראים האחרים:
--
-- 1. mechiron נושא מסלולים משלו, ולכן הסליקה מצאה שורה אמיתית והחזירה את המחיר
--    שלה — 2 ₪ ו-5 ₪ — למערכת שהוסתרה מדף הבית ב-0032 מפני שהכתובת שלה מגישה
--    עמוד זכויות בעוד הרישום מוכר השוואת מחירים.
-- 2. עשר האחרות אינן נושאות מסלול משלהן, והסליקה נפלה לאחור אל מסלולי הפלטפורמה
--    והחזירה 10 ₪ תחת השם של המערכת שנשלחה אליה. זו בדיוק הנפילה-לאחור ש-0033
--    הסירה מ-more30_plans ומ-more30_system_page, מאותו נימוק: היא הופכת "אין לזה
--    מחיר" ל"הנה מה שזה עולה".
--
-- מה זה לא: זו אינה תקלת כסף. core.billing_settings.mode='off', ולכן כל
-- שתים-עשרה התשובות חזרו charged=false ו-action='none'. הפער הוא שהתשובה נושאת
-- price_ils ומנוסחת כ"למסלול יש מחיר, אבל הסליקה סגורה" — כלומר מבטיחה מחיר
-- שממתין לפתיחת סליקה — על מוצר שאינו מוצע כלל. ברגע ש-mode יעבור ל-'test'
-- אותן שתים-עשרה הבקשות היו מקבלות action='test_payment' עם ספק ומחיר. לכן זה
-- נסגר עכשיו, בזמן שהסליקה סגורה, ולא בשעה שהיא נפתחת.
--
-- הצורה של התשובה: action='none' עם reason=חסימה, ולא exception. more30_subscribe
-- זורק, ובצדק — הוא כותב שורה. more30_checkout מחזיר הכרעה, ואוצר המילים שלו
-- כבר כולל 'price_not_set' ו-'billing_off' לשתי סיבות שונות לאי-גבייה; חסימת
-- §4 היא סיבה שלישית מאותו סוג. subscribe.html מדפיס את data.message כפי
-- שהוא בענף action='none', ולכן העמוד אומר את הדבר הנכון בלי שינוי בצד הלקוח.
-- price_ils אינו מוחזר בענף הזה — מסך שאין לו מחיר להציג לא יציג אחד.
--
-- ראיות: QA/platform/checkout-offer-block-0807/_results.json

create or replace function public.more30_checkout(p_app text, p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public, core
as $$
declare
  v_key  text;
  v_plan core.plans%rowtype;
  v_mode text;
  v_block text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select mode into v_mode from core.billing_settings where id;
  v_mode := coalesce(v_mode, 'off');

  v_key := coalesce(core.app_key_normalize(p_app), 'more30');

  -- §4 — לפני חיפוש המסלול, ולא אחריו: מערכת חסומה שאין לה מסלול משלה הייתה
  -- נופלת לאחור אל מסלולי הפלטפורמה ומקבלת מחיר תחת השם שלה. אותה פונקציה
  -- שמכריעה ב-more30_plans, more30_system_page ו-more30_subscribe מאז 0033.
  v_block := core.app_offer_block(v_key);
  if v_block is not null then
    return jsonb_build_object(
      'action','none',
      'reason', v_block,
      'charged', false,
      'app_key', v_key,
      'message', core.app_offer_note(v_block)
    );
  end if;

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
$$;

comment on function public.more30_checkout(text, text) is
  'ההכרעה אם יש מה לגבות. §4 — מערכת שאינה מוצעת מוחזרת כ-action=none עם סיבת החסימה, לפני חיפוש המסלול ולפני הנפילה-לאחור למסלולי הפלטפורמה.';

-- ─────────────────────────────────────────────────────────────────────────────
-- guard — מיגרציה שלא שינתה את מה שהיא מתארת לא תצליח בשקט.
--
-- more30_checkout דורש auth.uid(), ולכן נקבעת כאן תביעת JWT מקומית לעסקה.
-- המזהה סינתטי בכוונה: הענף שנבדק מכריע ומחזיר לפני שהוא נוגע במשתמש או
-- בטבלה כלשהי, והפונקציה אינה כותבת דבר בשום ענף.
do $$
declare
  v_leak int;
  v_priced int;
  v_r jsonb;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);

  -- אף מערכת חסומה לא מחזירה מחיר, ולא תשובה שאינה action='none'.
  select count(*) filter (where (r ->> 'action') is distinct from 'none'
                             or (r ->> 'reason') is distinct from blk),
         count(*) filter (where r ? 'price_ils')
    into v_leak, v_priced
  from (
    select core.app_offer_block(p.path) as blk,
           public.more30_checkout(p.path,
             coalesce((select c.code from core.plans c
                        where c.app_key = p.path and c.active and c.customer_visible
                          and coalesce(c.price_ils,0) > 0 order by c.sort limit 1),
                      'premium')) as r
    from core.projects p
    where p.path is not null and core.app_offer_block(p.path) is not null
  ) t;

  if v_leak > 0 then
    raise exception '0034: % מערכות חסומות עדיין מקבלות תשובת סליקה אחרת מ-none/סיבה', v_leak;
  end if;
  if v_priced > 0 then
    raise exception '0034: % מערכות חסומות עדיין מחזירות price_ils', v_priced;
  end if;

  -- ומה שכן מוצע ממשיך לקבל את ההכרעה שהיה מקבל קודם: מחיר, וסיבה 'billing_off'
  -- כל עוד הסליקה סגורה.
  v_r := public.more30_checkout('more30', 'premium');
  if (v_r ->> 'action') <> 'none' or (v_r ->> 'reason') <> 'billing_off'
     or (v_r ->> 'price_ils') is null then
    raise exception '0034: מסלול הפלטפורמה איבד את ההכרעה שלו: %', v_r::text;
  end if;

  perform set_config('request.jwt.claims', '', true);
end $$;
