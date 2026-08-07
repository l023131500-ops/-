-- 0037 — "ניהול" בתפריט החשבון הצביע על מרכז השליטה, וקרא לו בשם המערכת.
--
-- §2 מבקש שהאדמין יקבל כפתור "כניסה לניהול", ו-§3 מבקש מכל כרטיס מערכת קישור
-- "נהל מערכת זו". לארבע פונקציות יש דעה על הכתובת הזו. שלוש מהן מסכימות על
-- אותו כלל בדיוק, כתוב בנפרד בכל אחת:
--
--     admin_auth in ('own','hub')  AND  admin_url ~ '^(/|https?://)\S*$'
--
-- ומי שאינו עומד בו מקבל **null ולא קישור חלופי**. more30_admin_systems_report
-- אפילו מנסח את זה בתוך מילון השדות שלו: "מערכת בלי מסך ניהול מקבלת null ולא
-- קישור חלופי — היעדר מסך ניהול הוא ממצא (core.issues #86) ולא פרט להסתיר."
--
-- הרביעית, more30_join_app, היא היחידה מביניהן שרצה **בכל טעינת עמוד בכל
-- מערכת** — auth-button.js קורא לה עם location.href — והיא היחידה שלא קיבלה את
-- הכלל. היא לא בדקה את admin_auth, לא בדקה את צורת הכתובת, ובמקום null החזירה
-- 'https://more30.com/admin'.
--
-- נמדד ב-07/08 מול core.projects החי. מ-21 המערכות הציבוריות והחיות, **שמונה**
-- קיבלו מ-more30_join_app כתובת שאינה מסך הניהול שלהן:
--
--   briut · chizukim · imud · kesef · orech · smel · studio   (admin_url = null)
--       → 'https://more30.com/admin'
--   kupot   (admin_auth='token', admin_url='/api/switch-leads (כותרת x-admin-token)')
--       → 'https://more30.com/kupot/api/switch-leads (כותרת x-admin-token)'
--
-- מה זה עשה על המסך בפועל, לחשבון האדמין האמיתי: בשבע הראשונות התפריט צייר
-- **שני פריטים אל אותה כתובת** — "ניהול · ניהול תמלול חיזוקים" ו"מרכז השליטה ·
-- כל המערכות במקום אחד" — כששניהם https://more30.com/admin, והראשון נושא את שם
-- המערכת שהוא אינו פותח. ב-kupot הוא צייר href שמורכב מהערה בעברית עם רווחים.
-- שש מהשבע הן בדיוק שש המערכות של core.issues #86, שנמדדו כמערכות שאין להן מסך
-- ניהול בקוד המקור. כלומר הקישור לא נשבר — הוא מעולם לא היה קיים.
--
-- מה 0037 עושה:
--   1. core.app_admin_href(text) — הכלל שכבר קיים בשלושה עותקים, במקום אחד.
--   2. more30_join_app קוראת לו. אין קישור → admin_href = null.
--   3. שני שדות חדשים בתשובה: has_system_admin ו-admin_reason, כדי שהצד הלקוח
--      יוכל לשתוק מסיבה ידועה ולא מחוסר מידע.
--
-- מה זה **לא** עושה: אינו נוגע ב-is_admin. ההרשאה לא השתנתה, רק היעד. אינו
-- נוגע בשלוש הפונקציות האחרות — הן כבר נכונות, והחלפת הקוד המשוכפל שלהן
-- בקריאה ל-core.app_admin_href היא ניקוי ולא תיקון, ולכן אינה בסבב הזה.
-- אינו כותב אף שורה ל-core.projects: אף admin_url ואף admin_auth לא שונו.
-- אינו נוגע במוגנות (08, 09, bkalut-app, bkalot-admin, zr_*, NEDARIM3873).

create or replace function core.app_admin_href(p_path text)
returns text
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  -- הכתובת שאליה הכפתור "ניהול" מוביל בפועל, או null אם אין לאן.
  -- שני תנאים, ושניהם נמדדים ולא מונחים:
  --   admin_auth in ('own','hub') — מסך שאדם יכול להיכנס אליו. 'token' הוא
  --     נקודת API עם כותרת (kupot), ו-'none' הוא היעדר מסך.
  --   admin_url ~ '^(/|https?://)\S*$' — כתובת ולא הערה. השדה מכיל גם טקסט
  --     חופשי, וטקסט חופשי בתוך href הוא קישור שבור.
  select case
    when p.admin_url is null then null
    when p.admin_auth not in ('own','hub') then null
    when p.admin_url !~ '^(/|https?://)\S*$' then null
    when p.admin_url like 'http%' then p.admin_url
    else 'https://more30.com/' || p.path || p.admin_url
  end
  from core.projects p
  where p.path = p_path
  limit 1;
$$;

comment on function core.app_admin_href(text) is
  'הכתובת של מסך הניהול של המערכת עצמה, או null אם אין כזה. מקור אמת יחיד '
  'לכלל ש-more30_admin_systems, more30_admin_systems_report ו-more30_system_page '
  'מיישמים בנפרד. לעולם לא מחזיר קישור חלופי — היעדר מסך ניהול הוא ממצא '
  '(core.issues #86) ולא פרט להסתיר.';

grant execute on function core.app_admin_href(text) to anon, authenticated, service_role;

create or replace function public.more30_join_app(p_app text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'core'
as $function$
declare
  v_key text;
  v_role text;
  v_created boolean := false;
  v_super boolean;
  v_proj core.projects%rowtype;
  v_admin_href text;
  v_admin_reason text;
  v_profile public.more30_profiles%rowtype;
  v_sub core.subscriptions%rowtype;
  v_plan_scope text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform public.more30_auth_token_repair(auth.uid());
  v_super := public.more30_is_super_admin();

  v_key := core.app_key_normalize(p_app);
  if v_key is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_app', 'app_key', null,
                              'is_super_admin', v_super);
  end if;

  insert into core.app_memberships (user_id, app_key)
  values (auth.uid(), v_key)
  on conflict (user_id, app_key) do update set last_seen_at = now()
  returning role, (xmax = 0) into v_role, v_created;

  select * into v_proj from core.projects where path = v_key limit 1;
  select * into v_profile from public.more30_profiles where user_id = auth.uid();

  -- המסלול של המערכת שהמשתמש עומד בה, ואם אין לה מנוי משלו — של הפלטפורמה.
  select * into v_sub from core.subscriptions
   where user_id = auth.uid() and app_key = v_key and status <> 'cancelled';
  v_plan_scope := v_key;
  if v_sub.plan_code is null then
    select * into v_sub from core.subscriptions
     where user_id = auth.uid() and app_key = 'more30' and status <> 'cancelled';
    v_plan_scope := case when v_sub.plan_code is null then null else 'more30' end;
  end if;

  -- ‏more30 עצמה היא הפלטפורמה, ומסך הניהול שלה הוא מרכז השליטה. לכל מערכת
  -- אחרת: הכתובת שלה, או כלום. אין נפילה חזרה אל /admin — היא הפכה את
  -- "אין מסך ניהול" ל"יש, וזה מרכז השליטה", בשם המערכת ובשבעה מקומות.
  if v_key = 'more30' then
    v_admin_href := 'https://more30.com/admin';
    v_admin_reason := 'hub';
  else
    v_admin_href := core.app_admin_href(v_key);
    v_admin_reason := case
      when v_admin_href is not null then 'own'
      when v_proj.path is null then 'unregistered'
      when v_proj.admin_url is null then 'no_admin_screen'
      when v_proj.admin_auth = 'token' then 'api_only'
      when v_proj.admin_auth = 'none' then 'no_admin_screen'
      else 'not_a_url'
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'app_key', v_key,
    'app_name', case when v_key = 'more30' then 'עולם הסטארטאפים'
                     else coalesce(v_proj.name_he, v_proj.name, v_key) end,
    'role', v_role,
    'created', v_created,
    'is_super_admin', v_super,
    'is_admin', v_super or coalesce(v_role in ('admin','manager'), false),
    'admin_href', v_admin_href,
    'has_system_admin', v_admin_href is not null,
    'admin_reason', v_admin_reason,
    'full_name', v_profile.full_name,
    'plan', coalesce(v_sub.plan_code, 'free'),
    'plan_name', (select name_he from core.plans
                   where app_key = v_plan_scope and code = v_sub.plan_code),
    'plan_scope', v_plan_scope,
    'plan_status', coalesce(v_sub.status, 'free'),
    'profile_plan', coalesce(v_profile.plan, 'free')
  );
end;
$function$;

comment on function public.more30_join_app(text) is
  'רישום החברות באתר הנוכחי + החלטת ההרשאה, בקריאה אחת. admin_href הוא מסך '
  'הניהול של המערכת עצמה בלבד (core.app_admin_href), ו-null כשאין כזה; '
  'has_system_admin ו-admin_reason אומרים למה. עד 0037 הוא נפל חזרה אל '
  'https://more30.com/admin, ולכן שבע מערכות ציירו שני פריטי תפריט אל אותה '
  'כתובת ואחד מהם נשא את שם המערכת שהוא אינו פותח.';
