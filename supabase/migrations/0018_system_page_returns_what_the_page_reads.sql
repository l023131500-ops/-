-- system.html קורא ‎found‎, ‎is_deployed‎, ‎tagline‎, ‎what_it_does‎ ו-‎functions‎,
-- ו-more30_system_page מעולם לא החזירה אף אחד מהם. ‎!data.found‎ היה נכון תמיד,
-- ולכן ‎/system.html?app=nadlan‎ — כתובת חיה שמחזירה 200 — הציגה "השירות הזה
-- עדיין בהכנה" לכל מערכת במרשם. core.issues #64.
--
-- הפונקציה מחזירה jsonb, ולכן הוספת מפתחות אינה משנה דבר לקורא הקיים
-- (subscribe.html קורא name_he, enter_url, plans, plans_from — כולם נשארים
-- במקומם ובאותו מבנה).
--
-- ‎found‎ נגזר מהמרשם ולא מהקלט: ‎app_key_normalize‎ מחזירה null למפתח לא מוכר
-- וה-‎coalesce‎ ההיסטורי הופך אותו ל-'more30', ולכן מפתח שאינו במרשם היה
-- מתחזה לפלטפורמה. השורה במרשם היא הראיה היחידה שהשירות קיים.

create or replace function public.more30_system_page(p_app text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core'
as $function$
declare
  v_key   text;
  v_from  text;
  v_proj  core.projects%rowtype;
  v_plans jsonb;
begin
  v_key := coalesce(core.app_key_normalize(p_app), 'more30');
  select * into v_proj from core.projects where path = v_key;

  select jsonb_agg(to_jsonb(p) order by p.sort), max(v_key)
    into v_plans, v_from
  from (
    select code, name_he, tagline, price_ils, period, features, is_default, sort
    from core.plans
    where app_key = v_key and active and customer_visible
  ) p;

  -- מערכת בלי מסלולים משלה נופלת למסלולי הפלטפורמה, כמו קודם.
  if v_plans is null then
    v_from := 'more30';
    select jsonb_agg(to_jsonb(p) order by p.sort) into v_plans
    from (
      select code, name_he, tagline, price_ils, period, features, is_default, sort
      from core.plans
      where app_key = 'more30' and active and customer_visible
    ) p;
  end if;

  return jsonb_build_object(
    'app_key',  v_key,
    'app_name', coalesce(v_proj.name_he, 'עולם הסטארטאפים'),
    'name_he',  coalesce(v_proj.name_he, 'עולם הסטארטאפים'),
    'enter_url', v_proj.live_url,
    'plans_from', coalesce(v_from, 'more30'),
    'plans', coalesce(v_plans, '[]'::jsonb),
    -- החדשים: בדיוק מה שהעמוד קורא, ישירות מהמרשם. אין ברירת מחדל מומצאת —
    -- שדה ריק במרשם מגיע כ-null, והעמוד מסתיר את המקטע.
    'found', v_proj.path is not null,
    'is_deployed', coalesce(v_proj.is_deployed, false),
    'tagline', v_proj.tagline,
    'what_it_does', v_proj.what_it_does,
    'functions', v_proj.functions
  );
end;
$function$;
