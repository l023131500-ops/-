-- 0050 — ההצטרפות שלא זיהתה מערכת החזירה סיבה, וכתבה אותה לשום מקום
--
-- ‏§1 דורש שמי שנרשם ייכנס לתוך המוצר כלקוח מלא של המערכת. מה שהופך "נרשמתי"
-- ל"אני משתמש של המערכת הזו" הוא שורה ב-core.app_memberships, ומי שכותב אותה
-- הוא public.more30_join_app — שנקרא בכל טעינת עמוד מ-auth-button.js:353
-- ובכל כניסה מ-auth/callback.html:158.
--
-- כשהזיהוי נכשל הפונקציה עושה בדיוק את זה:
--
--     v_key := core.app_key_normalize(p_app);
--     if v_key is null then
--       return jsonb_build_object('ok', false, 'reason', 'unknown_app', ...);
--     end if;
--
-- היא מחזירה סיבה ללקוח — ו-callback.html בולע אותה במכוון ("חברות היא רישום,
-- לא תנאי כניסה"), auth-button.js לא מציג דבר, ואף שורה לא נכתבת לשום טבלה.
-- כלומר: **החברות נשמטת בשקט, ואין ראיה שזה קרה.**
--
-- זו בדיוק הצורה של שני הבאגים של אתמול. #121 (0048) — שבע צורות כתובת של
-- הפורטל החזירו null חודשיים, ובהן /system.html?app=<שם>, הכתובת שכל 19 כרטיסי
-- דף הבית מקשרים אליה מאז f04e71d. #122 (0049) — הדומיין נחתך בלי להיבדק.
-- שניהם התגלו רק כשמישהו קרא לפונקציה ביד בשאילתה. שום מונה לא זז, שום מסך לא
-- השתנה, ואף אחד לא היה מגלה אותם מהלוח.
--
-- ── למה דווקא עכשיו ─────────────────────────────────────────────────────────
--
-- ‏0049 (אתמול) הוסיפה שער דומיין: מארח שאינו ב-core.trusted_origins מקבל null.
-- זו ההחלטה הנכונה, והיא גם מכפילה את מחיר השתיקה — מהיום **כל** הרכבה שתיווסף
-- ל-portal/vercel.dist.json ולא לטבלה תפיל את החברות של כל מי שנכנס דרכה, בלי
-- ולו סימן אחד. הפונקציה תמשיך להחזיר ok=false, הלקוח ימשיך להיכנס למוצר,
-- ו-/admin ימשיך לדווח שלמערכת אין לקוחות.
--
-- ── מה נמדד לפני, ומה זה אומר ───────────────────────────────────────────────
--
-- נמדד 09/08 על המסד החי, ונאמר כאן במלואו כדי שלא ייקרא כיותר ממה שהוא:
--
--   • השער עצמו תקין היום. 29 שורות ב-core.trusted_origins מכסות את כל 25
--     יעדי ההפניה של portal/vercel.dist.json, כולל שלושת השמות שאינם
--     <שם>-more30.vercel.app: chizukim2, nadlan-pro (מגיש את /tivuch),
--     ו-kioskfleet-production.up.railway.app. אפס יעדי ניתוב חסרים.
--   • 12 מתוך 20 החשבונות האמיתיים אינם מחזיקים ולו שורת חברות אחת. כולם
--     נוצרו עד 25/06/2026 והתחברותם האחרונה עד אותו יום; השורה הראשונה
--     ב-core.app_memberships היא מ-31/07/2026. כלומר הם קדמו לטבלה ולא חזרו
--     מאז — היסטוריה, לא דליפה פעילה.
--
-- לכן זו אינה מיגרציה שמתקנת נזילה שרצה עכשיו. זו מיגרציה שהופכת את המחלקה
-- הזאת של באגים לנראית, אחרי שנתפסה פעמיים בשני ימים.
--
-- ── מה נוסף ─────────────────────────────────────────────────────────────────
--
-- ‏core.join_rejects — שורה למארח, מונה, ראשון/אחרון, ודגימת נתיב מנוקה.
-- ‏core.join_reject_record(text) — הכותב. נקרא רק מהענף שכבר מחזיר unknown_app.
-- ‏public.more30_admin_join_rejects() — הקורא, לסופר-אדמין בלבד.
--
-- שלושה גבולות על משטח הכתיבה, כי הקלט מגיע מהדפדפן:
--   1. הענף רץ אחרי בדיקת auth.uid() ב-more30_join_app, ולכן רק משתמש מחובר
--      יכול להגיע אליו. אנונימי מקבל חריגה 28000 לפני כן.
--   2. מארח חדש נכתב רק כל עוד יש פחות מ-200 מארחים בטבלה. מעבר לכך הכול
--      נספר בשורה אחת, '(overflow)' — מונה שמפסיק ללמוד עדיף על טבלה שגדלה
--      בלי גבול מקלט של לקוח.
--   3. הדגימה היא **הקטע הראשון של הנתיב בלבד**, אחרי הסרת query ו-fragment
--      וסינון לתווי [A-Za-z0-9_-], חתוך ל-60. הקלט הוא location.href של לקוח
--      מחובר, ו-query string יכול לשאת נתונים אישיים. מה שנשמר מספיק כדי
--      לדעת איזו כתובת נפלה, ואינו יכול לשאת מייל, טוקן או שם.
--
-- קריאה בלבד מצד הלקוח: RLS דלוק ואין אף policy, ולכן anon ו-authenticated
-- אינם רואים את הטבלה כלל. שתי הפונקציות הן SECURITY DEFINER ועוקפות אותה.
--
-- תוסף בלבד. אף שם שדה קיים לא שונה ולא הוסר, ה-JSON שחוזר ללקוח זהה בדיוק,
-- ולכן auth-button.js ו-callback.html שכבר בייצור ממשיכים לעבוד — וזה תקף
-- מרגע החלת המיגרציה, בלי להמתין לתור הפריסה של core.issues #83.

begin;

create table if not exists core.join_rejects (
  host        text primary key,
  hits        bigint      not null default 0,
  first_at    timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  path_sample text
);

comment on table core.join_rejects is
  'ניסיונות הצטרפות שבהם core.app_key_normalize לא זיהתה מערכת. שורה למארח, '
  'מונה ולא יומן. נכתב רק ממשתמש מחובר, דרך core.join_reject_record.';

alter table core.join_rejects enable row level security;
-- בלי policy: anon ו-authenticated אינם קוראים ואינם כותבים ישירות.

revoke all on core.join_rejects from anon, authenticated;

create or replace function core.join_reject_record(p_raw text)
returns void
language plpgsql
security definer
set search_path to 'core', 'public'
as $$
declare
  v      text;
  v_auth text;
  v_host text;
  v_seg  text;
  v_n    integer;
begin
  v := btrim(coalesce(p_raw, ''));

  -- אותה חלוקה בדיוק שעושה core.app_key_normalize, כדי שמה שנרשם כאן יהיה
  -- המארח שהיא באמת שפטה ולא ניחוש שני עליו.
  if v ~* '^[a-z][a-z0-9+.-]*://' then
    v_auth := substring(v from '^[a-z][a-z0-9+.-]*://([^/?#]*)');
    v      := regexp_replace(v, '^[a-z][a-z0-9+.-]*://[^/?#]*', '', 'i');
  elsif v like '//%' then
    v_auth := substring(v from '^//([^/?#]*)');
    v      := regexp_replace(v, '^//[^/?#]*', '');
  end if;

  if v_auth is null then
    -- קלט בלי מארח כלל: מפתח חשוף או נתיב. לא "מארח לא מוכר", וספירה משותפת
    -- איתו הייתה מטשטשת בדיוק את ההבדל שבגללו הטבלה קיימת.
    v_host := '(no-host)';
  else
    v_host := lower(left(regexp_replace(v_auth, '^[^@]*@', ''), 120));
    if v_host = '' then v_host := '(no-host)'; end if;
  end if;

  v_seg := regexp_replace(v, '[?#].*$', '');
  v_seg := split_part(trim(both '/' from v_seg), '/', 1);
  v_seg := left(regexp_replace(v_seg, '[^A-Za-z0-9_.-]', '', 'g'), 60);
  if v_seg = '' then v_seg := null; end if;

  -- תקרה על מספר המארחים המובחנים. מארח שכבר בטבלה תמיד מתעדכן.
  if not exists (select 1 from core.join_rejects r where r.host = v_host) then
    select count(*) into v_n from core.join_rejects;
    if v_n >= 200 then
      v_host := '(overflow)';
      v_seg  := null;
    end if;
  end if;

  insert into core.join_rejects as r (host, hits, first_at, last_at, path_sample)
  values (v_host, 1, now(), now(), v_seg)
  on conflict (host) do update
    set hits        = r.hits + 1,
        last_at     = now(),
        path_sample = coalesce(excluded.path_sample, r.path_sample);
end;
$$;

revoke all on function core.join_reject_record(text) from public, anon, authenticated;

create or replace function public.more30_admin_join_rejects()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core'
as $$
declare
  v_rows jsonb;
begin
  if not public.more30_is_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_agg(to_jsonb(t) order by t.hits desc, t.last_at desc)
    into v_rows
  from (
    select host, hits, first_at, last_at, path_sample,
           -- שתי השורות הסינתטיות אינן מארחים, ולומר עליהן "לא מהימן" היה
           -- שולח את הקורא לחפש דומיין שלא קיים.
           case when host in ('(no-host)', '(overflow)') then null
                else core.app_host_trusted(host) end as host_trusted
    from core.join_rejects
  ) t;

  return jsonb_build_object(
    'rows',     coalesce(v_rows, '[]'::jsonb),
    'hosts',    (select count(*) from core.join_rejects),
    'attempts', (select coalesce(sum(hits), 0) from core.join_rejects),
    'since',    (select min(first_at) from core.join_rejects),
    'note',     'כל שורה כאן היא לקוח מחובר שביקש להצטרף למערכת ולא נרשם לאף אחת. '
                || 'מארח שמסומן כלא-מהימן חסר ב-core.trusted_origins.'
  );
end;
$$;

grant execute on function public.more30_admin_join_rejects() to authenticated;

-- ── הענף היחיד שהשתנה ב-more30_join_app ─────────────────────────────────────
-- ‏perform core.join_reject_record(p_app); לפני ה-return של unknown_app.
-- כל השאר מועתק כלשונו, כולל ה-JSON המוחזר.

create or replace function public.more30_join_app(p_app text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'core'
as $$
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
    -- מכאן ואילך שמיטת החברות משאירה עקבה. הקריאה אינה יכולה להפיל את
    -- ההצטרפות: היא אחרי בדיקת ההזדהות, והתשובה ללקוח לא השתנתה.
    perform core.join_reject_record(p_app);
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
  -- אחרת: הכתובת שלה, או כלום. אין נפילה חזרה אל /admin.
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
$$;

commit;
