-- 0035 — דף הבית סירב לפרסם מערכת מוגנת, והחלון שלידו הסכים
--
-- לפרסום מערכת לציבור יש שני מתגים, ושניהם יושבים על אותה טבלה:
--
--   core.projects.public_visible    → דף הבית (more30_public_systems)
--   core.projects.show_in_showcase  → /showcase (public.more30_showcase)
--
-- הראשון מוגן. more30_set_public_visible בודק במפורש:
--
--   if exists (select 1 from core.projects where number = p_num and is_protected)
--   then raise exception 'protected project'; end if;
--
-- השני לא. more30_admin_showcase_set בדק סופר-אדמין ותו לא, ואז ביצע
-- update ... set show_in_showcase = ... where path = p_app — בלי לשאול אם השורה
-- מוגנת. וגם צד הקריאה לא שאל: more30_showcase() סינן על show_in_showcase ועל
-- to_delete בלבד. כלומר הגבול שמוגדר ב-more30-priority.md §5 כ"גבול מוחלט"
-- (08 "בקלות זכאות", 09 "בקלות ניהול", bkalut-app, bkalot-admin, zr_*,
-- NEDARIM3873) נאכף על משטח פרסום אחד ולא על אחיו.
--
-- נמדד חי על ההאב ב-07/08/2026. הבדיקה רצה בתוך DO אחד שמסתיים ב-raise, ולכן
-- התגלגלה לאחור במלואה — נבדק אחריה ש-0 שורות probe נשארו. שורת ה-probe נוצרה
-- מוגנת (is_protected=true) ועם נתיב, והקריאה בוצעה בזהות של הסופר-אדמין האמיתי
-- (l023131500@gmail.com):
--
--   write_call                 = {"ok": true, "app_key": "__probe_showcase__",
--                                 "show_in_showcase": true}
--   row_show_in_showcase_after = t
--   appears_in_more30_showcase = t
--   showcase_systems_len       = 206   (מול [] ריק לפני כן)
--
-- כלומר: הקריאה לא נדחתה, המתג נכתב, והמערכת המוגנת חזרה בתשובה הציבורית של
-- /showcase.
--
-- למה זה עדיין לא קרה בייצור: שתי השורות המוגנות היום, 08 ו-09, הן היחידות עם
-- is_protected=true ולשתיהן path=null, ו-more30_admin_showcase_set מוצא שורה לפי
-- path = p_app. כלומר הפרצה סגורה במקרה — לא מפני שיש בה שער, אלא מפני שאין
-- כרגע שורה מוגנת שאפשר לפנות אליה בשם. שיוך נתיב ל-08/09, או סימון is_protected
-- על מערכת קיימת כלשהי, פותח אותה באותו רגע ובלי שינוי קוד.
--
-- מה 0035 עושה: מסמיכה את שני המשטחים לאותו כלל.
--   1. more30_admin_showcase_set — שער is_protected אחרי בדיקת הסופר-אדמין,
--      באותה צורה ובאותו נוסח שיש ל-more30_set_public_visible.
--   2. more30_showcase — סינון is_protected גם בצד הקריאה, כדי ששורה שסומנה
--      בדרך אחרת (SQL ישיר, מיגרציה עתידית, seed) לא תגיע לעמוד ציבורי.
--
-- מה זה לא: אין כאן שינוי בשום מערכת מוגנת ולא בשום דגל שלהן. 08 ו-09 נשארות
-- בדיוק כפי שהיו — public_visible=false, show_in_showcase=false. השינוי כולו
-- בשתי הפונקציות שמפרסמות.

begin;

-- 1. צד הכתיבה.
create or replace function public.more30_admin_showcase_set(p_app text, p_flag boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'core', 'auth'
as $function$
declare
  v_before    boolean;
  v_protected boolean;
  v_email     text;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select show_in_showcase, is_protected
    into v_before, v_protected
    from core.projects where path = p_app;
  if not found then
    raise exception 'no such project path: %', p_app using errcode = '22023';
  end if;

  -- §5 — הגבול המוחלט. אותו שער שיש ל-more30_set_public_visible על דף הבית:
  -- מערכת מוגנת אינה מתפרסמת, גם לא בידי סופר-אדמין ובטעות.
  if coalesce(v_protected,false) then
    raise exception 'protected project' using errcode = '42501';
  end if;

  update core.projects set show_in_showcase = coalesce(p_flag,false) where path = p_app;

  select email into v_email from auth.users where id = auth.uid();
  insert into core.admin_audit (actor, actor_email, action, target, before, after)
  values (auth.uid(), v_email, 'showcase_set', p_app,
          jsonb_build_object('show_in_showcase', v_before),
          jsonb_build_object('show_in_showcase', coalesce(p_flag,false)));

  return jsonb_build_object('ok', true, 'app_key', p_app,
                            'show_in_showcase', coalesce(p_flag,false));
end;
$function$;

-- 2. צד הקריאה — התשובה הציבורית של /showcase.
create or replace function public.more30_showcase()
returns jsonb
language sql
stable security definer
set search_path to 'public', 'core'
as $function$
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
        -- §5 — מערכת מוגנת אינה חוזרת בתשובה ציבורית, ולא משנה מי סימן אותה.
        and coalesce(p.is_protected,false) = false
    ), '[]'::jsonb)
  );
$function$;

commit;
