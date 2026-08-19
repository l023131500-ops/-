-- 0040 — מתג ה-showcase יכול לפרסם מערכת שדף הבית מסתיר
--
-- §4 קובע כלל אחד על מה שהציבור רואה: "מערכות פעילות באמת קודם... לא-עובדות
-- → מוסתרות. חומרים בגיט שאינם אתר → מוסתרים לגמרי", ונוקב בעמודה —
-- core.projects.public_visible. דף הבית מציית לה.
--
-- ‏/showcase הוא עמוד ציבורי שני, והוא נושא את שם המותג עצמו. הקורא שלו,
-- public.more30_showcase, אינו יודע על public_visible דבר:
--
--   where p.show_in_showcase = true
--     and coalesce(p.to_delete,false) = false
--     and coalesce(p.is_protected,false) = false
--
-- שלושה תנאים, ואף אחד מהם אינו הכלל של §4. 0035 כבר ראתה שני מתגי פרסום על
-- אותה טבלה וחיברה ביניהם — אבל רק בשער אחד, "מוגנת". השער השני, "עובדת
-- באמת", נשאר על דף הבית בלבד.
--
-- נמדד על המסד החי. מתוך 30 השורות שמתג ה-showcase נדרך עליהן (יש path,
-- אינן מוגנות, אינן to_delete), **19 גלויות בדף הבית ו-11 מוסתרות ממנו**.
-- תשע מתוך אותן 11 נושאות מסלולים ולכן מצוירות בפועל על /admin/pricing, כל
-- אחת עם תיבת "הצג בעולם הסטארטאפים" פעילה לידה:
--
--   05 financial   אתר שיווקי פיננסי      live=false  live_url=null
--   07 zol         זול                    live=false  live_url=null
--   14 smachot     שמחות פלוס             live=true
--   19 shiurim     פורטל שיעורי איגוד     live=false  live_url=null
--   20 igud        פורטל איגוד            live=false  live_url=null
--   21 mthbram     Mthbram                live=true
--   27 mechiron    השוואת מחירים בקלות    live=true
--   30 crm         CRM זכויות             live=true
--   31 gesher      גשר עברית CRM          live=true
--
-- ‏#27 הוא המקרה שמראה למה זה לא תיאורטי: 0032 הורידה אותו מדף הבית בדיוק
-- לפי §4, כי הכתובת מגישה עמוד זכויות בעוד הרישום מוכר השוואת מחירים —
-- וזה עדיין פתוח כבאג #94. המתג שממש ליד המחיר שלו היה מחזיר אותו לציבור,
-- תחת שם המותג, בלחיצה אחת ובלי שום אזהרה.
--
-- וארבע מהתשע — financial · zol · shiurim · igud — הן live=false עם
-- live_url=null. showcase.html מצייר ‎href="${esc(s.url || '/')}"‎, ולכן כרטיס
-- כזה מפרסם מערכת שאין לה כתובת בכלל ומחזיר את הלוחץ לדף הבית.
--
-- התיקון, באותה צורה שבה 0033 פתרה את אותה משפחת בעיה לצד המכירה: מקור אמת
-- אחד לשאלה "האם מותר להציג", ושלושת הקוראים שואלים אותו.
--   1. core.app_showcase_block(app)  — null = מותר; אחרת קוד הסיבה.
--   2. הקורא הציבורי more30_showcase נועל את השער.
--   3. הכותב more30_admin_showcase_set מסרב להדליק מה שהקורא יתעלם ממנו.
--   4. more30_admin_pricing_list מציג את הסיבה במקום תיבה שתיכשל.
-- כיבוי נשאר מותר תמיד: אסור שיהיה מצב שבו אי אפשר להוריד מערכת מהאוויר.

-- ── 1. מקור האמת ────────────────────────────────────────────────────────────
-- ‏null = אין חסימה. שימו לב לברירת המחדל: **היעדר שורה הוא חסימה**, לא היתר.
-- זו התקלה ש-0039 תיקנה מהצד של הכותב — more30 עצמה, path=null, שאין לה שורה
-- למצוא — ופונקציה שמחזירה null ל"לא נמצא" הייתה מחזירה אותה בדלת האחורית.
create or replace function core.app_showcase_block(p_app text)
returns text
language sql
stable
security definer
set search_path to 'core', 'public'
as $$
  select coalesce(
    (select case
       when coalesce(p.is_protected, false)       then 'protected'
       when not coalesce(p.public_visible, false) then 'hidden'
       else 'ok'
     end
     from core.projects p
     where p.path = p_app
       and p_app is not null
       and coalesce(p.to_delete, false) = false
     limit 1),
    'unregistered'
  );
$$;

-- הקוראים שואלים "האם חסום", ו-'ok' אינו חסימה. מפרידים את שתי השאלות כדי
-- שהצירוף coalesce לעיל לא ידלוף החוצה כקוד סיבה שאין לו טקסט.
create or replace function core.app_showcase_blocked(p_app text)
returns text
language sql
stable
as $$
  select nullif(core.app_showcase_block(p_app), 'ok');
$$;

create or replace function core.app_showcase_note(p_block text)
returns text
language sql
immutable
as $$
  select case p_block
    when 'unregistered' then 'אינה מערכת בקטלוג — אין מה להציג'
    when 'protected'    then 'מוגנת — אינה מתפרסמת'
    when 'hidden'       then 'מוסתרת מדף הבית — תחילה הציגו אותה שם'
    else null
  end;
$$;

grant execute on function core.app_showcase_block(text)   to anon, authenticated;
grant execute on function core.app_showcase_blocked(text) to anon, authenticated;
grant execute on function core.app_showcase_note(text)    to anon, authenticated;

-- ── 2. הקורא הציבורי ────────────────────────────────────────────────────────
create or replace function public.more30_showcase()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'core'
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'systems', coalesce((
      select jsonb_agg(jsonb_build_object(
               'number',   p.number,
               'name',     p.name_he,
               'tagline',  p.tagline,
               'what',     p.what_it_does,
               'url',      p.live_url,
               'category', p.category,
               'live',     coalesce(p.live,false)
             ) order by p.number)
      from core.projects p
      where p.show_in_showcase = true
        and coalesce(p.to_delete,false) = false
        -- שער אחד לשני העמודים הציבוריים. מוגנת (§5) ומוסתרת (§4) נחסמות
        -- כאן ולא רק בכותב, כי ערך ישן ב-show_in_showcase שנשאר משוחרר
        -- מלפני שהמערכת הוסתרה אינו רשאי לפרסם אותה מחדש מעצמו.
        and core.app_showcase_blocked(p.path) is null
    ), '[]'::jsonb)
  );
$$;

-- ── 3. הכותב ────────────────────────────────────────────────────────────────
create or replace function public.more30_admin_showcase_set(p_app text, p_flag boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'core', 'auth'
as $$
declare
  v_before boolean;
  v_block  text;
  v_email  text;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select show_in_showcase into v_before
    from core.projects where path = p_app and coalesce(to_delete,false) = false;
  if not found then
    -- 0039: הודעה בעברית ולא שגיאת מסד גולמית — העמוד מציג את message כמות שהוא.
    raise exception '%', core.app_showcase_note('unregistered') using errcode = '22023';
  end if;

  v_block := core.app_showcase_blocked(p_app);

  -- כיבוי מותר תמיד, ובכוונה: מערכת שכבר באוויר חייבת להיות ניתנת להורדה
  -- גם אחרי שהשתנה משהו אחר שחוסם אותה. רק ההדלקה נבדקת.
  if coalesce(p_flag, false) and v_block is not null then
    raise exception '%', core.app_showcase_note(v_block) using errcode = '42501';
  end if;

  update core.projects
     set show_in_showcase = coalesce(p_flag, false)
   where path = p_app;

  select email into v_email from auth.users where id = auth.uid();
  insert into core.admin_audit (actor, actor_email, action, target, before, after)
  values (auth.uid(), v_email, 'showcase_set', p_app,
          jsonb_build_object('show_in_showcase', v_before),
          jsonb_build_object('show_in_showcase', coalesce(p_flag,false)));

  return jsonb_build_object('ok', true, 'app_key', p_app,
                            'show_in_showcase', coalesce(p_flag,false));
end;
$$;

-- ── 4. הלוח ─────────────────────────────────────────────────────────────────
create or replace function public.more30_admin_pricing_list()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'auth'
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'price_states', jsonb_build_object(
      'null', 'טרם נקבע — אסור לפתוח סליקה',
      'zero', 'הוחלט: ללא חיוב. המערכת פעילה וחינמית',
      'positive', 'מחיר לגבייה'
    ),
    'billing', (
      select jsonb_build_object(
        'mode', b.mode,
        'provider', b.provider,
        'note', b.note,
        'updated_at', b.updated_at,
        'chargeable', (b.mode is distinct from 'off') and b.provider is not null
      )
      from core.billing_settings b
      limit 1
    ),
    'chargeable_plans', (
      select count(*) from core.plans
      where active and coalesce(price_ils, 0) > 0
    ),
    'offerable_plans', (
      select count(*) from core.plans pl
      where pl.active
        and pl.customer_visible
        and coalesce(pl.price_ils, 0) > 0
        and core.app_offer_block(pl.app_key) is null
    ),
    'systems', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.sort_key)
      from (
        select
          coalesce(p.number, '—')                as number,
          pl.app_key                             as app_key,
          coalesce(p.name_he, pl.app_key)        as name,
          coalesce(p.live, false)                as live,
          p.live_url,
          coalesce(p.show_in_showcase, false)    as show_in_showcase,
          -- אותם תנאים בדיוק שהכותב אוכף — נקראים מראש מאותה פונקציה, ולא
          -- מיושמים כאן שוב. עד 0040 הועתקו לכאן שניים מתוך שלושה.
          core.app_showcase_blocked(pl.app_key) is null             as showcase_settable,
          core.app_showcase_blocked(pl.app_key)                     as showcase_block,
          core.app_showcase_note(
            core.app_showcase_blocked(pl.app_key))                  as showcase_note,
          coalesce(p.number, 'zz')               as sort_key,
          core.app_offer_block(pl.app_key)                          as offer_block,
          core.app_offer_note(core.app_offer_block(pl.app_key))     as offer_note,
          core.app_offer_block(pl.app_key) is null                  as sellable,
          jsonb_agg(
            jsonb_build_object(
              'code', pl.code,
              'name_he', pl.name_he,
              'billing_kind', pl.billing_kind,
              'price_ils', pl.price_ils,
              'period', pl.period,
              'is_default', pl.is_default,
              'active', pl.active,
              'chargeable', coalesce(pl.price_ils, 0) > 0,
              'customer_visible', pl.customer_visible,
              'offerable', pl.active
                           and pl.customer_visible
                           and coalesce(pl.price_ils, 0) > 0
                           and core.app_offer_block(pl.app_key) is null
            ) order by pl.sort, pl.code
          )                                      as plans
        from core.plans pl
        left join core.projects p
               on p.path = pl.app_key
              and coalesce(p.to_delete,false) = false
        group by p.number, pl.app_key, p.name_he, p.live, p.live_url,
                 p.show_in_showcase, p.path, p.is_protected
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

-- ── 5. נורמליזציה חד-פעמית ──────────────────────────────────────────────────
-- היום כל 22 השורות הן false ולכן זה 0 שורות, ובכוונה: זו הצהרה שהמצב
-- "מסומן להצגה אבל מוסתר מדף הבית" אינו חוקי, ולא ניקוי של נזק קיים.
update core.projects
   set show_in_showcase = false
 where show_in_showcase = true
   and core.app_showcase_blocked(path) is not null;
