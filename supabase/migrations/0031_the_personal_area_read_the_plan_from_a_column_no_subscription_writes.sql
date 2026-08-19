-- 0031 — האזור האישי קרא את המסלול מעמודה ששום הרשמה אינה כותבת אליה.
--
-- ‏§1 מבקש שמי שנרשם ייכנס "כלקוח מלא … כל פעולות השימוש + אזור אישי", ו-§8
-- מבקש מסלולי 2/5/10/12/15 ₪ שאפשר להירשם אליהם. שני החלקים נבנו — ולא
-- חוברו זה לזה:
--
--   · ‏more30_subscribe() כותב שורה ל-core.subscriptions בלבד.
--   · ‏more30_profile_get() ו-more30_join_app() מחזירים 'plan' מהעמודה
--     public.more30_profiles.plan.
--
-- אף מסלול לא כותב לעמודה ההיא. במסד: 54 פרופילים, ובכולם plan='free' — מול
-- 87 שורות מנוי שאינן מבוטלות, 19 משתמשים ב-18 מערכות. כל אחד מ-19 האלה רואה
-- ב-/me את התווית "חינמי" ומתחתיה את הבלוק שמציע לו לשדרג, ואותה שורה
-- ‏b-auth-button.js:286 מציגה לו "שדרוג לפרימיום" בתפריט של כל אתר — מפני
-- ש-more30_join_app מחזיר לה את אותה עמודה. מי שנרשם ל-VIP של נדל"ן ב-15 ₪
-- ייקרא בעמוד שלו "חינמי".
--
-- ‏19 המשתמשים האלה הם כולם חשבונות בדיקה (core.is_test_account): לקוח אמיתי
-- אחד עדיין לא נרשם לשום מסלול. כלומר זו אינה תקלה שנראית היום ללקוח משלם,
-- אלא המסלול שהלקוח המשלם הראשון יעבור בו — ומבחני §1 כבר עברו בו והראו אותה.
--
-- התיקון הוא בכיוון הקריאה ולא בכתיבה: המסלול נקרא מהמקום שבו הרשמה באמת
-- נרשמת. הכללים:
--   · ‏plan של הפרופיל = המנוי בהיקף הפלטפורמה ('more30'), כי זה מה ש-/me
--     ותפריט הכניסה מתארים. אין שורה → 'free', כמו קודם.
--   · ‏plan של join_app = המנוי של המערכת שבה המשתמש עומד, ואם אין לה מנוי
--     משלה — מנוי הפלטפורמה. אותה נפילה-לאחור בדיוק כמו ב-more30_my_subscription.
--   · ‏status מוחזר כפי שהוא ואינו מתורגם ל"פעיל". כל 19 השורות הן 'requested':
--     הסליקה סגורה (core.billing_settings.mode='off'), ולכן בקשה רשומה אינה
--     תשלום. עמוד שיקרא לה "מנוי פעיל" יחליף הבטחה בעובדה.
--   · ‏profile_plan נשאר בתשובה עם ערך העמודה הישנה, כדי שהמעבר יהיה מדיד ולא
--     שקוף — ואפשר יהיה לראות שהיא באמת ריקה בכל השורות.
--
-- אין כאן שינוי בהרשאות, ואין UPDATE לאף שורה. קריאה בלבד.

create or replace function public.more30_profile_get()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'core'
as $function$
declare
  p public.more30_profiles;
  v_sub core.subscriptions%rowtype;
  v_plan core.plans%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into p from public.more30_profiles where user_id = auth.uid();

  -- המנוי בהיקף הפלטפורמה — זה מה שהתווית ב-/me מתארת.
  select * into v_sub from core.subscriptions
   where user_id = auth.uid() and app_key = 'more30' and status <> 'cancelled';
  if v_sub.plan_code is not null then
    select * into v_plan from core.plans
     where app_key = 'more30' and code = v_sub.plan_code;
  end if;

  return jsonb_build_object(
    'user_id',   auth.uid(),
    'email',     coalesce(p.email, auth.jwt()->>'email'),
    'full_name', p.full_name,
    'phone',     p.phone,
    'plan',      coalesce(v_sub.plan_code, 'free'),
    'plan_name', coalesce(v_plan.name_he, 'חינמי'),
    'plan_status', coalesce(v_sub.status, 'free'),
    'plan_price_ils', v_plan.price_ils,
    'plan_period', v_plan.period,
    -- ‏'requested' הוא בקשה רשומה ולא גבייה. המסך אינו אמור לגזור את זה
    -- מהמילה, ולכן הוא מקבל את התשובה במפורש.
    'charged',   false,
    'profile_plan', coalesce(p.plan, 'free'),
    -- כל המנויים של המשתמש, לכל מערכת, עם השם והמחיר מהקטלוג. מערכת שנמחקה
    -- מהמרשם עדיין מוצגת לפי app_key שלה ולא נעלמת מהרשימה של הלקוח.
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'app_key',   s.app_key,
               'app_name',  coalesce(pr.name_he, pr.name, s.app_key),
               'plan_code', s.plan_code,
               'plan_name', pl.name_he,
               'price_ils', pl.price_ils,
               'period',    pl.period,
               'status',    s.status,
               'requested_at', s.requested_at
             ) order by s.requested_at desc nulls last, s.app_key)
        from core.subscriptions s
        left join core.projects pr on pr.path = s.app_key
        left join core.plans pl on pl.app_key = s.app_key and pl.code = s.plan_code
       where s.user_id = auth.uid() and s.status <> 'cancelled'
    ), '[]'::jsonb),
    'is_admin',  public.more30_is_admin(),
    'exists',    p.user_id is not null
  );
end
$function$;

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
  -- זה מה שקובע אם התפריט מציע לו לשדרג, ולכן הוא חייב להיקרא מהמקום שבו
  -- ההרשמה נרשמת ולא מעמודת פרופיל שאיש אינו כותב אליה.
  select * into v_sub from core.subscriptions
   where user_id = auth.uid() and app_key = v_key and status <> 'cancelled';
  v_plan_scope := v_key;
  if v_sub.plan_code is null then
    select * into v_sub from core.subscriptions
     where user_id = auth.uid() and app_key = 'more30' and status <> 'cancelled';
    v_plan_scope := case when v_sub.plan_code is null then null else 'more30' end;
  end if;

  -- הכתובת של מסך הניהול של המערכת הזו. admin_url יחסי מצטרף לנתיב שלה;
  -- מוחלט נשאר כמו שהוא; ומי שאין לו מסך ניהול משלו נשלח למרכז השליטה.
  v_admin_href := case
    when v_key = 'more30' then 'https://more30.com/admin'
    when v_proj.admin_url is null then 'https://more30.com/admin'
    when v_proj.admin_url like 'http%' then v_proj.admin_url
    when v_proj.admin_url like '/%' then 'https://more30.com/' || v_key || v_proj.admin_url
    else 'https://more30.com/admin'
  end;

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
