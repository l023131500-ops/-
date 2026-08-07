-- 0029 — מסך המחירים הכריז "הסליקה אינה מחוברת" בלי לקרוא את המתג.
--
-- ‏/admin/pricing הוא המסך שקובע מחיר ל-29 מערכות, והמשפט שמרגיע את מי שקובע
-- אותם — "הסליקה אינה מחוברת, אף אחד לא מחויב בפועל" — היה **טקסט קבוע ב-HTML**
-- ‏(portal/public/admin-pricing.html:130-134). הוא נכון היום במקרה:
-- core.billing_settings מחזיקה mode='off' ו-provider=null.
--
-- זו בדיוק ההבטחה שנשברת בשקט. §8א אומר "mode ב-core.billing_settings נשאר
-- off/test; אין חיוב אמיתי בלי אישור מפורש", והערה בטבלה עצמה אומרת "פתיחה
-- מחדש = UPDATE יחיד, בלי פריסה". כלומר ביום שבו המתג ייפתח — בשאילתה אחת,
-- בלי לגעת בקוד ובלי פריסה — המסך ימשיך להצהיר שאיש אינו מחויב, מעל 29 מערכות
-- שכל מחיר בהן כבר לגבייה. מסך שמבטיח בטיחות שאינו מודד גרוע ממסך שאינו מבטיח.
--
-- more30_admin_pricing_list() מקבלת לכן בלוק billing שנקרא מהטבלה עצמה:
--   · mode / provider / note / updated_at — כפי שהם, בלי פרשנות.
--   · chargeable — האם באמת אפשר לגבות עכשיו. שני תנאים ולא אחד: מצב שאינו off
--     **וגם** ספק מחובר. mode='test' בלי ספק אינו סביבת בדיקה אלא הבטחה ריקה,
--     וזו בדיוק הסיבה שה-mode הוחזר ל-off ב-06/08.
--   · chargeable_plans — כמה מסלולים פעילים נושאים מחיר גדול מאפס. זה המספר
--     שהופך את המשפט למדיד: "0 מחויבים" ו-"29 מסלולים לגבייה ברגע שהמתג ייפתח"
--     אינם אותו דבר.
--
-- טבלה ריקה אינה "סליקה סגורה" אלא היעדר תשובה, ולכן mode מקבל null ו-chargeable
-- מקבל false — המסך אומר "לא ידוע" ולא "בטוח".
--
-- אין כאן שינוי בהרשאות, בשורות או במחירים. שדה קריאה בלבד.

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
              'chargeable', coalesce(pl.price_ils, 0) > 0
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
