-- 0019 — הקורא הרביעי של core.plans, זה שאיש לא שאל אותו.
--
-- המשך ישיר ל-#78. שלושת המסלולים שקיימים לנו ולא ללקוח —
-- 'pro (בדיקה)' ב-1 ₪, 'charge' ו-'one_time' — מסומנים customer_visible=false,
-- ו-0016/0017/0018 לימדו את more30_checkout, more30_subscribe ו-more30_system_page
-- לכבד את הסימון. more30_plans, הפונקציה הרביעית שקוראת מאותה טבלה ונושאת את
-- השם המתבקש ביותר, נשארה בלי התנאי הזה בשני החיפושים שלה.
--
-- נמדד מול הפרודקשן לפני השינוי (scripts/qa/hidden-tier-reach.mjs, ללא טוקן,
-- כלומר בדיוק מה שזר מקבל): 25 מאונטים, **75 מסלולים מוסתרים הוחזרו** — שלושה
-- לכל מערכת, בהם מסלול מנוי חודשי בסכום חיובי. באותה ריצה more30_system_page
-- החזירה אפס מהם. שתי הפונקציות ענו תשובות שונות על אותה שאלה.
--
-- מה לא קרה: שום עמוד חי אינו קורא ל-more30_plans היום — חיפוש על
-- admin/apps/db/packages/portal/scripts/sites/supabase/tooling/_deploy לא מצא
-- אף קורא. לכן זה אינו דלף שלקוח ראה, אלא משטח פתוח: ל-anon יש EXECUTE,
-- והעמוד הבא שיושיט יד אל השם המתבקש יקבל את 1 ₪ בחזרה בלי ששום בדיקה תיפול.
-- זו גם הסיבה שהתיקון קטן ונפרד: הפער היה בשמירה, לא בכסף.
--
-- התיקון: אותו תנאי שכבר קיים ב-more30_system_page, בשני החיפושים.
-- למערכת שאין לה שורות גלויות משלה (studio · kiosk · tivuch · crm · gesher ·
-- smachot · mthbram · admin) הנפילה אחורה למסלולי הפלטפורמה נשמרת כפי שהיא,
-- וזה בדיוק מה ש-more30_system_page כבר עושה — ארבע הפונקציות מסכימות עכשיו
-- אילו מסלולים קיימים.
--
-- הניהול אינו נפגע: more30_admin_pricing_list מחזירה את הקטלוג המלא, כולל
-- המסלולים המוסתרים ודגל active, והיא חסומה מאחורי more30_is_super_admin.

create or replace function public.more30_plans(p_app text default 'more30'::text)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public', 'core'
as $function$
declare
  v_key text;
  v_source text;
  v_rows jsonb;
begin
  v_key := coalesce(core.app_key_normalize(p_app), 'more30');
  v_source := v_key;

  -- customer_visible בשני החיפושים: קטלוג ללקוח מציג את מה שהוצע ללקוח.
  select jsonb_agg(to_jsonb(x) order by x.sort) into v_rows
  from (select code, name_he, tagline, price_ils, period, features, is_default, sort
        from core.plans where app_key = v_key and active and customer_visible) x;

  if v_rows is null then
    v_source := 'more30';
    select jsonb_agg(to_jsonb(x) order by x.sort) into v_rows
    from (select code, name_he, tagline, price_ils, period, features, is_default, sort
          from core.plans where app_key = 'more30' and active and customer_visible) x;
  end if;

  return jsonb_build_object(
    'app_key', v_key,
    'plans_from', v_source,
    'app_name', case when v_key = 'more30' then 'עולם הסטארטאפים'
                     else coalesce((select coalesce(p.name_he, p.name) from core.projects p where p.path = v_key),
                                   'עולם הסטארטאפים') end,
    'plans', coalesce(v_rows, '[]'::jsonb)
  );
end;
$function$;
