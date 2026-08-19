-- 0033 — הכרטיס ירד מדף הבית, ודף המסלולים המשיך למכור אותו
--
-- §4 של more30-priority.md אומר "לא-עובדות → מוסתרות. עדכן core.projects.public_visible",
-- ו-0032 עשתה בדיוק את זה ל-#27 (mechiron): הכתובת מגישה עמוד זכויות בעוד הרישום
-- מוכר השוואת מחירים, ולכן הכרטיס ירד מדף הבית. אבל public_visible קורא רק את דף
-- הבית. שלושת המסכים שמוכרים מנוי לא שאלו אותו מעולם.
--
-- נמדד על ההאב ב-07/08/2026, דרך ה-RPC עצמם ולא על הטבלאות:
--
--   app        live   public_visible   more30_plans   more30_system_page
--   --------   ----   --------------   ------------   ------------------
--   mechiron   true   false            3 (mechiron)   3 (mechiron)
--   crm        true   false            2 (more30)     2 (more30)
--   gesher     true   false            2 (more30)     2 (more30)
--   mthbram    true   false            2 (more30)     2 (more30)
--   smachot    true   false            2 (more30)     2 (more30)
--   zol        false  false            2 (more30)     2 (more30)
--
-- שני ליקויים שונים תחת אותה שורה חסרה:
--
-- 1. ל-mechiron יש שלוש שורות משלו ב-core.plans, כולן active ו-customer_visible.
--    כלומר /subscribe?app=mechiron עדיין מציג "בסיסי 2 ₪ · מורחב 5 ₪" למוצר
--    שהוסתר יום קודם מפני שהכתובת שלו מגישה משהו אחר לגמרי. הוא היחיד מבין
--    המוסתרות שנושא מחיר משלו.
--
-- 2. עשר המערכות המוסתרות האחרות אינן נושאות מסלול משלהן, ולכן שתי הפונקציות
--    נפלו לאחור אל מסלולי הפלטפורמה — והעמוד שנטען נושא את השם של המערכת
--    המוסתרת בכותרת. הנפילה-לאחור נכונה למערכת חיה שטרם תומחרה; על מערכת שאינה
--    מוצעת היא הופכת "אין לזה מחיר" ל"הנה מה שזה עולה".
--
-- אף אחת מהן אינה תיאורטית: more30_subscribe בוחר את המסלול באותו תנאי בדיוק
-- (active + customer_visible) ואינו יודע דבר על core.projects, ולכן בקשת מנוי
-- למערכת מוסתרת נרשמת ומחזירה ok. ל-mechiron כבר יש 4 שורות ב-core.subscriptions.
-- כולן חשבונות בדיקה, וזה בדיוק העיתוי לסגור: לקוח משלם ראשון עוד לא נרשם.
--
-- הכלל שנוסף כאן: מה שאינו מוצע בדף הבית אינו נמכר. מערכת שאין לה שורה
-- ב-core.projects (ובראשן 'more30' עצמה, שהיא הפלטפורמה ולא מערכת) אינה נחסמת —
-- הבדיקה היא על מה שנרשם, ולא ניחוש על מה שלא.
--
-- מה זה לא עושה: אינו נוגע ב-more30_join_app. מי שכבר בפנים ממשיך להיכנס
-- למערכת מוסתרת ולהשתמש בה — נחסמת המכירה, לא השימוש. ארבע שורות המנוי הקיימות
-- של mechiron נשארות כפי שהן; מחיקת נתון היא לא תיקון של מסך.
--
-- ראיות: QA/platform/hidden-not-sellable-0807/_results.json

-- ─────────────────────────────────────────────────────────────────────────────
-- מקור אמת אחד לשאלה "האם המערכת הזאת מוצעת ללקוח", כדי ששלושת הקוראים לא
-- יתפצלו שוב. מחזיר null כשמותר למכור, ואת הסיבה כשאסור.
create or replace function core.app_offer_block(p_key text)
returns text
language plpgsql
stable
security definer
set search_path = public, core
as $$
declare
  v core.projects%rowtype;
begin
  select * into v from core.projects where path = p_key;

  -- אין שורה — אין טענה. 'more30' היא הפלטפורמה עצמה ואין לה path.
  if v.path is null then
    return null;
  end if;

  if coalesce(v.live, false) is not true then
    return 'not_live';
  end if;

  if coalesce(v.public_visible, false) is not true then
    return 'not_offered';
  end if;

  return null;
end;
$$;

comment on function core.app_offer_block(text) is
  'null כשהמערכת מוצעת ללקוח, אחרת הסיבה (not_live / not_offered). §4 — מה שמוסתר מדף הבית אינו נמכר.';

create or replace function core.app_offer_note(p_block text)
returns text
language sql
immutable
as $$
  select case p_block
    when 'not_live'    then 'המערכת הזאת אינה פעילה כרגע, ולכן אין לה מסלולים להצגה.'
    when 'not_offered' then 'המערכת הזאת אינה מוצעת כרגע למנוי.'
    else null
  end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ברירת המחדל של p_app נשמרת כפי שהיא: קריאה בלי ארגומנט מגיעה מכל עמוד
-- שמבקש את מסלולי הפלטפורמה, ו-create or replace מסרב להסיר אותה בשקט.
create or replace function public.more30_plans(p_app text default 'more30')
returns jsonb
language plpgsql
security definer
set search_path = public, core
as $$
declare
  v_key text;
  v_source text;
  v_rows jsonb;
  v_block text;
begin
  v_key := coalesce(core.app_key_normalize(p_app), 'more30');
  v_source := v_key;
  v_block := core.app_offer_block(v_key);

  -- §4 — מערכת שאינה מוצעת בדף הבית אינה מוצגת עם מחיר, וגם אינה נופלת לאחור
  -- אל מסלולי הפלטפורמה: הנפילה-לאחור הייתה הופכת "אין לזה מחיר" ל"זה המחיר".
  if v_block is not null then
    return jsonb_build_object(
      'app_key', v_key,
      'plans_from', null,
      'app_name', coalesce((select coalesce(p.name_he, p.name) from core.projects p where p.path = v_key),
                           'עולם הסטארטאפים'),
      'plans', '[]'::jsonb,
      'offered', false,
      'offer_block', v_block,
      'offer_note', core.app_offer_note(v_block)
    );
  end if;

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
    'plans', coalesce(v_rows, '[]'::jsonb),
    'offered', true,
    'offer_block', null,
    'offer_note', null
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.more30_system_page(p_app text)
returns jsonb
language plpgsql
security definer
set search_path = public, core
as $$
declare
  v_key   text;
  v_from  text;
  v_proj  core.projects%rowtype;
  v_plans jsonb;
  v_admin text;
  v_block text;
begin
  v_key := coalesce(core.app_key_normalize(p_app), 'more30');
  select * into v_proj from core.projects where path = v_key;

  -- A followable address only. Anything carrying a header, a note or a space is
  -- an instruction to a developer, not a link for a person.
  if v_proj.admin_auth in ('own', 'hub')
     and v_proj.admin_url ~ '^(/|https?://)\S*$' then
    v_admin := v_proj.admin_url;
  end if;

  v_block := core.app_offer_block(v_key);

  -- אותו כלל כמו ב-more30_plans, ומאותה פונקציה, כדי ששני העמודים יגידו את אותו
  -- דבר. שאר תוכן העמוד נשאר — מערכת מוסתרת עדיין ניתנת לצפייה; רק המחיר יורד.
  if v_block is null then
    select jsonb_agg(to_jsonb(p) order by p.sort), max(v_key)
      into v_plans, v_from
    from (
      select code, name_he, tagline, price_ils, period, features, is_default, sort
      from core.plans
      where app_key = v_key and active and customer_visible
    ) p;

    if v_plans is null then
      v_from := 'more30';
      select jsonb_agg(to_jsonb(p) order by p.sort) into v_plans
      from (
        select code, name_he, tagline, price_ils, period, features, is_default, sort
        from core.plans
        where app_key = 'more30' and active and customer_visible
      ) p;
    end if;
  end if;

  return jsonb_build_object(
    'app_key',  v_key,
    'app_name', coalesce(v_proj.name_he, 'עולם הסטארטאפים'),
    'name_he',  coalesce(v_proj.name_he, 'עולם הסטארטאפים'),
    'enter_url', v_proj.live_url,
    'plans_from', case when v_block is not null then null else coalesce(v_from, 'more30') end,
    'plans', coalesce(v_plans, '[]'::jsonb),
    'offered', v_block is null,
    'offer_block', v_block,
    'offer_note', core.app_offer_note(v_block),
    'found', v_proj.path is not null,
    'is_deployed', coalesce(v_proj.is_deployed, false),
    'tagline', v_proj.tagline,
    'what_it_does', v_proj.what_it_does,
    'functions', v_proj.functions,
    'admin_url', v_admin,
    'admin_auth', case when v_admin is null then null else v_proj.admin_auth end
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.more30_subscribe(p_app text, p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public, core
as $$
declare
  v_key text;
  v_plan core.plans%rowtype;
  v_id bigint;
  v_status text;
  v_existing text;
  v_block text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_key := coalesce(core.app_key_normalize(p_app), 'more30');

  -- §4 — מסך שאינו מוצע אינו נמכר. הבדיקה כאן ולא רק בתצוגה, כי הכפתור אינו
  -- הדבר היחיד שקורא ל-RPC הזה, ומפני שבלעדיה בקשה למערכת מוסתרת הייתה נופלת
  -- לאחור אל מסלולי הפלטפורמה ונרשמת בשקט תחת app_key אחר ממה שהלקוח ביקש.
  v_block := core.app_offer_block(v_key);
  if v_block is not null then
    raise exception '%', core.app_offer_note(v_block) using errcode = '22023';
  end if;

  -- customer_visible בשני החיפושים: מה שהלקוח יכול להירשם אליו הוא בדיוק מה
  -- שהוצע לו. 'pro (בדיקה)', 'charge' ו-'one_time' אינם נגישים מכאן.
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
    'charged', false,
    'price_ils', v_plan.price_ils,
    'price_missing', v_plan.price_ils is null,
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
$$;

grant execute on function core.app_offer_block(text) to anon, authenticated;
grant execute on function core.app_offer_note(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- guard — מיגרציה שלא שינתה את מה שהיא מתארת לא תצליח בשקט.
do $$
declare
  v_hidden int;
  v_visible int;
begin
  select count(*) into v_hidden
  from core.projects p
  where p.path is not null
    and (coalesce(p.live, false) is not true or coalesce(p.public_visible, false) is not true)
    and jsonb_array_length(public.more30_plans(p.path) -> 'plans') > 0;

  if v_hidden > 0 then
    raise exception '0033: % מערכות מוסתרות עדיין מחזירות מסלולים', v_hidden;
  end if;

  select count(*) into v_visible
  from core.projects p
  where p.path is not null
    and coalesce(p.live, false) and coalesce(p.public_visible, false)
    and jsonb_array_length(public.more30_plans(p.path) -> 'plans') = 0;

  if v_visible > 0 then
    raise exception '0033: % מערכות מוצעות איבדו את המסלולים שלהן', v_visible;
  end if;

  if (public.more30_plans('mechiron') ->> 'offer_block') is distinct from 'not_offered' then
    raise exception '0033: mechiron לא נחסם';
  end if;

  if jsonb_array_length(public.more30_plans('more30') -> 'plans') = 0 then
    raise exception '0033: מסלולי הפלטפורמה עצמה נחסמו בטעות';
  end if;
end $$;
