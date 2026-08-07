-- 0036 — /admin/pricing: הבאנר מנה 70 מסלולים שייגבו ברגע שהמתג ייפתח,
--        ו-31 מהם אינם ניתנים להצעה ללקוח בכלל.
--
-- מה נמדד (07/08, מול המסד החי):
--
--   chargeable_plans (מה שהבאנר מציג)                       70
--   מתוכם ניתנים להצעה בפועל                                39
--   ── ההפרש, 31 ─────────────────────────────────────────────
--   מסלול 'pro' = 1 ₪, customer_visible=false, ב-29 מערכות   29
--   mechiron/basic=2 ו-mechiron/extended=5,                   2
--     על מערכת ש-core.app_offer_block מחזירה לה 'not_offered'
--
-- שני מסננים חוסמים אותם, ושניהם קיימים כבר:
--   · more30_plans ו-more30_subscribe מסננים על customer_visible.
--   · 0033/0034 לימדו את שניהם לקרוא ל-core.app_offer_block() ולסרב
--     לפני שמגיעים לטבלת המסלולים בכלל.
-- more30_admin_pricing_list() אינה קוראת לאף אחד מהם: היא מחזירה כל שורה
-- ב-core.plans לצד p.live ו-p.show_in_showcase, בלי customer_visible ובלי
-- חסימת ההצעה. לכן המסך מצייר לשלוש שורות בכל מערכת ("סליקה", "שימוש
-- חד-פעמי", "פרו") שדה מחיר ומצב "לגבייה", ולתשע מערכות חסומות שלמות
-- (crm, financial, gesher, igud, mechiron, mthbram, shiurim, smachot, zol)
-- כרטיס זהה לכל השאר — ותגית "חי" על חלקן, כי live=true אינו public_visible.
--
-- מה שמשתנה כאן הוא הדיווח בלבד, והוא **מוסף ואינו גורע**: chargeable_plans
-- ו-chargeable נשארים כפי שהם, מפני ש-admin-pricing.html שבייצור קורא אותם
-- והפריסה הבאה חסומה על מכסת Vercel (core.issues #83). דף עדכני יקרא את
-- השדות החדשים; דף ישן ימשיך לעבוד בדיוק כמו אתמול.
--
--   top     · offerable_plans  — כמה מסלולים באמת יכולים להיגבות
--   system  · offer_block · offer_note · sellable
--   plan    · customer_visible · offerable
--
-- אין כאן שינוי מחיר, אין שינוי גלוּיוּת, ואין נגיעה במוגן.

create or replace function public.more30_admin_pricing_list()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'auth'
as $function$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    -- שלושת המצבים של מחיר, מוסברים בתשובה עצמה כדי שהמסך לא ימציא ניסוח.
    'price_states', jsonb_build_object(
      'null', 'טרם נקבע — אסור לפתוח סליקה',
      'zero', 'הוחלט: ללא חיוב. המערכת פעילה וחינמית',
      'positive', 'מחיר לגבייה'
    ),
    -- המתג עצמו. המסך מצייר ממנו את האזהרה במקום להצהיר עליה מראש.
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
    -- כמה מסלולים פעילים כבר נושאים מחיר לגבייה. בלי המספר הזה "הסליקה סגורה"
    -- נשמע כמו "אין מה לגבות", וזה לא אותו דבר.
    'chargeable_plans', (
      select count(*) from core.plans
      where active and coalesce(price_ils, 0) > 0
    ),
    -- וכמה מהם לקוח יכול בכלל להגיע אליהם. ההפרש בין השניים הוא בדיוק מה
    -- שהבאנר הבטיח שייגבה ולא ייגבה: מסלול נסתר, או מערכת שהקופה מסרבת
    -- למכור. שני התנאים הם אותם שני התנאים שב-more30_plans/more30_subscribe.
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
          coalesce(p.number, 'zz')               as sort_key,
          -- אותה חסימה שהקופה אוכפת, בלשון שהמסך יכול לצטט.
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
              -- מה שהמסך צריך כדי להחליט אם מותר בכלל לפתוח תשלום.
              'chargeable', coalesce(pl.price_ils, 0) > 0,
              -- והאם השורה הזאת מגיעה ללקוח. מסלול נסתר נראה על הלוח
              -- בדיוק כמו גלוי, ואינו מופיע באף עמוד מכירה.
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
        group by p.number, pl.app_key, p.name_he, p.live, p.live_url, p.show_in_showcase
      ) s
    ), '[]'::jsonb)
  );
end;
$function$;

grant execute on function public.more30_admin_pricing_list() to authenticated;
