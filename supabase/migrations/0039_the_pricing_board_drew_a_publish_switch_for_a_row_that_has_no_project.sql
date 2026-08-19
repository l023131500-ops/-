-- 0039 — לוח המחירים צייר מתג פרסום לשורה שאין לה פרויקט
--
-- 0035 סגרה את הפרצה במתג ה-showcase: more30_admin_showcase_set בודק היום
-- סופר-אדמין, מוצא שורה לפי path, ואם המערכת מוגנת — מסרב. השער הראשון
-- בסדרה הזו הוא דווקא הקודם לו:
--
--   select show_in_showcase, is_protected into v_before, v_protected
--     from core.projects where path = p_app;
--   if not found then
--     raise exception 'no such project path: %', p_app using errcode = '22023';
--   end if;
--
-- והמסך היחיד שקורא לפונקציה — /admin/pricing — מצייר את התיבה לכל שורה
-- שחוזרת מ-more30_admin_pricing_list(), בלי לשאול אם יש מאחוריה שורת פרויקט:
--
--   <label class="showcase">
--     <input type="checkbox" data-showcase="${esc(sys.app_key)}" ... />
--
-- ורשימת השורות נבנית מ-core.plans, לא מ-core.projects:
--
--   from core.plans pl
--   left join core.projects p on p.path = pl.app_key and coalesce(p.to_delete,false)=false
--
-- כלומר left join. שורה שאין לה פרויקט מקבלת number='—', שם = app_key —
-- ותיבת סימון מלאה.
--
-- נמדד על המסד, 07/08/2026. מ-21 ה-app_key שיש להם מסלולים, בדיוק אחד אינו
-- נפגש עם שום core.projects.path:
--
--   app_key = 'more30'   number = null   name_he = null   is_protected = null
--
-- וזה לא נתון תקול: more30 היא הפלטפורמה עצמה — פרויקט 33, שה-path שלו null
-- בכוונה, כי הוא אינו יושב תחת נתיב אלא הוא האתר. יש לו מסלולים (free,
-- premium ב-10 ₪), ולכן הוא ברשימת המחירים; אין לו path, ולכן הוא לעולם לא
-- יימצא ב-more30_admin_showcase_set.
--
-- מה שהמשתמש רואה: תיבה שנראית בדיוק כמו 20 אחיותיה, נלחצת, ומיד קופצת
-- אחורה עם alert('לא נשמר: no such project path: more30'). זו הודעת שגיאת
-- מסד גולמית, על מתג שמעולם לא היה יכול לעבוד — ולא בגלל תקלה, אלא בגלל
-- שהפלטפורמה אינה אחת המערכות שהיא מציגה. /showcase שואל "אילו מערכות
-- נבחרו להצגה"; ההאב הוא זה ששואל.
--
-- 0039 נותנת למסך את התשובה במקום להשאיר אותו לנחש: כל מערכת ברשימה חוזרת
-- עכשיו עם showcase_settable ועם showcase_block שמסביר למה לא. הכלל זהה
-- לזה שכבר אכוף בכתיבה (0035), ולכן אין כאן מדיניות חדשה — רק אותה מדיניות,
-- קריאה גם מראש ולא רק אחרי הלחיצה:
--
--   showcase_settable = יש שורת פרויקט עם אותו path, והיא אינה מוגנת
--   showcase_block    = 'unregistered' | 'protected' | null
--
-- מה זה לא: אין שינוי בשום דגל, בשום מחיר ובשום מערכת. show_in_showcase של
-- כל 21 השורות נשאר false בדיוק כפי שהיה — הבחירה מי מוצג היא core.issues #16
-- והיא של המשתמש. גם more30_admin_showcase_set לא נגעה: מי שיקרא לה עם
-- 'more30' עדיין יקבל את אותה שגיאה. מה שהשתנה הוא שהמסך כבר לא מזמין ללחוץ.

begin;

create or replace function public.more30_admin_pricing_list()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'core', 'auth'
as $function$
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
          -- אותם שני התנאים שמתג הכתיבה אוכף (0035), נקראים מראש:
          -- יש שורת פרויקט לפי path, והיא אינה מוגנת.
          (p.path is not null
             and coalesce(p.is_protected,false) = false)          as showcase_settable,
          case
            when p.path is null                    then 'unregistered'
            when coalesce(p.is_protected,false)    then 'protected'
          end                                                     as showcase_block,
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
$function$;

commit;
