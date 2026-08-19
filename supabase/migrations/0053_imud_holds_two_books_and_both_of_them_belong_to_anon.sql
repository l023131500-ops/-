-- 0053 — עימוד (04) מחזיקה שני ספרים, ושניהם רשומים על אותו משתמש: anon
--
-- ‏#86 מונה שש מערכות ציבוריות חיות בלי מסך ניהול במקור. שלוש מהן יושבות
-- בפרויקטים שאינם של החשבון הזה (17 chizukim · 12 smel · 18 orech) והן הכרעה
-- של המשתמש, לא תור עבודה. נשארו שלוש בהאב: 34 kesef (נסגרה בסבב הקודם,
-- 0052 + /admin/kesef), 26 studio, ו-04 imud. הסבב הזה לוקח את imud.
--
-- ── מה נמדד עכשיו, לפני שנכתב דוח ────────────────────────────────────────────
--
-- ‏כל מה ש-04 מחזיקה במסד הזה הוא טבלה אחת: public.otvedaf_books. זה אינו ניחוש
-- אלא חוזה כתוב — apps/04-imud-torani/server/storage.ts:19 קורא את שם הטבלה מ-
-- SUPABASE_TABLE, וההערה מעליו אומרת שבפריסה תחת more30.com היא יושבת ב-public
-- כ-otvedaf_books כי PostgREST חושף רק את public. אין למערכת הזאת סכימה משלה,
-- ולכן לולאת information_schema שנכתבה ל-kesef אינה מתאימה כאן.
--
-- ‏מה שנמצא בטבלה (נמדד 10/08 על המסד החי):
--
--   שורות                    2      מזהים 4 ו-5
--   משתמשים נבדלים           1      user_id = 'anon' בשתי השורות
--   תבניות בשימוש            1      iyun-two-col
--   בלוקי תוכן               5      3 + 2
--   ספר בלי מחבר             1      author = '' בשורה 4
--
-- ‏שני המספרים האלה הם הדוח, וזה בדיוק מה שהופך אותו לשווה כתיבה. בידוד הנתונים
-- לפי משתמש קיים בקוד — storage.ts מסנן כל קריאה ב-eq('user_id', userId || 'anon')
-- והמזהה מגיע מכותרת X-Visitor-Id — אבל בפועל שתי השורות נפלו על ברירת המחדל.
-- כלומר או שאיש לא נכנס עם מזהה מבקר, או שהכותרת אינה מגיעה. מסך שמציג
-- "1 משתמש" בלי לומר ש-user_id שלו הוא 'anon' מסתיר בדיוק את הממצא הזה, ולכן
-- anon_books הוא אריח משלו ולא הערת שוליים.
--
-- ‏קטלוג התבניות אינו במסד. apps/04-imud-torani/shared/templates.ts מחזיק 32
-- תבניות כקוד, והטבלה מחזיקה רק את המפתח ששימש בפועל. הדוח לכן סופר שימוש ולא
-- כיסוי — לכתוב כאן "1 מתוך 32" היה מקבע מספר שגדל בעריכת קובץ ולא במיגרציה.
--
-- ── מה נוסף כאן ──────────────────────────────────────────────────────────────
--
-- ‏more30_admin_imud_report() — קורא בלבד, super-admin בלבד, באותה תבנית של
-- more30_admin_kesef_report ו-more30_admin_systems_report. הוא מחזיר:
--
--   totals    — ספרים, משתמשים, כמה מהם anon, תבניות בשימוש, בלוקים, ריקים
--   templates — כל template_key שנעשה בו שימוש, עם ספרים · בלוקים · עדכון אחרון
--   layers    — היסטוגרמה של layer מתוך בלוקי התוכן עצמם (main · heading · footnote …)
--   books     — שורה לכל ספר: מזהה, בעלים, שם, מחבר, תבנית, בלוקים, גודל, זמנים
--   activity  — הספר הראשון והאחרון, ובכמה ימים הם רחוקים זה מזה
--
-- ‏אין כאן ולא אף ערך מוערך אחד. אפס מדווח כאפס: ספר בלי בלוקים נספר ב-
-- empty_books, טבלה בלי שורות תחזיר totals אפסיים ורשימות ריקות, ו-notes.zero
-- אומר במפורש ש-0 כאן הוא מדידה ולא כשל בקריאה.
--
-- ‏מה שאין כאן: כתיבה. אין עריכת ספר, אין מחיקה ואין שינוי בעלות. חוזה הכתיבה
-- של המוצר כן קריא כאן (storage.ts), אבל הוא עובר דרך שרת שמחזיק service_role
-- ומאמת בעלות לפני עדכון; לוח ניהול-על שיכתוב לטבלה ישירות יעקוף את האימות
-- הזה. הקריאה קודמת.
--
-- ‏security definer + search_path קבוע, כמו כל אחיותיה: הטבלה מוגנת ב-RLS בלי
-- policies (anon חסום לגמרי — ראה supabase.ts:10), וזו הדרך היחידה שמסך בדפדפן
-- יכול לקרוא אותה בלי לפתוח אותה לכל המחוברים.

create or replace function public.more30_admin_imud_report()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'auth'
as $function$
declare
  t_books      bigint;
  t_users      bigint;
  t_anon       bigint;
  t_templates  bigint;
  t_blocks     bigint;
  t_empty      bigint;
  t_no_author  bigint;
  t_first      bigint;
  t_last       bigint;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select count(*),
         count(distinct user_id),
         count(*) filter (where coalesce(user_id, '') in ('', 'anon')),
         count(distinct template_key),
         coalesce(sum(case when jsonb_typeof(content) = 'array'
                           then jsonb_array_length(content) else 0 end), 0),
         count(*) filter (where jsonb_typeof(content) <> 'array'
                             or jsonb_array_length(content) = 0),
         count(*) filter (where coalesce(author, '') = ''),
         min(created_at),
         max(updated_at)
    into t_books, t_users, t_anon, t_templates, t_blocks, t_empty, t_no_author,
         t_first, t_last
    from public.otvedaf_books;

  return jsonb_build_object(
    'generated_at', now(),
    'app_key', 'imud',
    'table', 'public.otvedaf_books',

    'notes', jsonb_build_object(
      'what', 'מסך הקליטה של מערכת 04 (עימוד תורני). כל מה שהמערכת מחזיקה במסד הזה הוא טבלה אחת — public.otvedaf_books — לפי חוזה האחסון ב-apps/04-imud-torani/server/storage.ts. המספרים נספרים בזמן הקריאה, ואין בהם ולא ערך מוערך אחד.',
      'zero', '0 כאן הוא מדידה ולא כשל בקריאה. ספר בלי בלוקי תוכן נספר ב-empty_books, ורשימה ריקה פירושה שאין שורות — לא שהשאילתה נכשלה.',
      'anon', 'בידוד הנתונים לפי משתמש קיים בקוד: storage.ts מסנן כל קריאה לפי user_id שמגיע מכותרת X-Visitor-Id, ונופל ל-''anon'' כשאין כותרת. anon_books סופר כמה מהספרים נפלו על ברירת המחדל הזאת. כשהוא שווה ל-books — אין הפרדת משתמשים בפועל, וזה ממצא ולא פרט טכני.',
      'templates', 'קטלוג התבניות יושב בקוד (apps/04-imud-torani/shared/templates.ts), לא במסד. לכן templates סופר שימוש בפועל ולא כיסוי מתוך הקטלוג — מספר כיסוי שהיה נכתב כאן היה מתיישן בעריכת קובץ, בלי מיגרציה.',
      'sizes', 'content_bytes ו-settings_bytes הם אורך ייצוג הטקסט של ה-jsonb, כלומר סדר גודל של הספר — לא הנפח בדיסק ולא מספר העמודים המעומדות.',
      'read_only', 'הדוח קורא בלבד. אין כאן עריכה, מחיקה או שינוי בעלות: הכתיבה של המוצר עוברת דרך שרת שמחזיק service_role ומאמת בעלות לפני כל עדכון, וכתיבה ישירה מלוח הניהול הייתה עוקפת את האימות הזה.'
    ),

    'totals', jsonb_build_object(
      'books',          t_books,
      'users',          t_users,
      'anon_books',     t_anon,
      'templates_used', t_templates,
      'blocks',         t_blocks,
      'empty_books',    t_empty,
      'books_no_author', t_no_author
    ),

    'activity', jsonb_build_object(
      'first_created_ms', t_first,
      'first_created',    case when t_first is null then null
                               else to_timestamp(t_first / 1000.0) end,
      'last_updated_ms',  t_last,
      'last_updated',     case when t_last is null then null
                               else to_timestamp(t_last / 1000.0) end,
      'span_days',        case when t_first is null or t_last is null then null
                               else round((t_last - t_first) / 86400000.0, 1) end,
      'days_since_last',  case when t_last is null then null
                               else round(extract(epoch from now() - to_timestamp(t_last / 1000.0))
                                          / 86400.0, 1) end
    ),

    -- ‏שימוש בפועל בתבניות. המפתחות מגיעים מהשורות עצמן, ולכן תבנית חדשה
    -- תופיע כאן בלי לגעת בפונקציה.
    'templates', coalesce((
      select jsonb_agg(x order by (x->>'books')::bigint desc, x->>'template_key')
        from (
          select jsonb_build_object(
                   'template_key', template_key,
                   'books', count(*),
                   'blocks', coalesce(sum(case when jsonb_typeof(content) = 'array'
                                               then jsonb_array_length(content) else 0 end), 0),
                   'last_updated', to_timestamp(max(updated_at) / 1000.0)
                 ) as x
            from public.otvedaf_books
           group by template_key
        ) t), '[]'::jsonb),

    -- ‏היסטוגרמה של שכבות התוכן, נגזרת מהבלוקים ולא מרשימה קשיחה של LayerKind.
    'layers', coalesce((
      select jsonb_agg(x order by (x->>'blocks')::bigint desc, x->>'layer')
        from (
          select jsonb_build_object('layer', b->>'layer', 'blocks', count(*)) as x
            from public.otvedaf_books,
                 lateral jsonb_array_elements(
                   case when jsonb_typeof(content) = 'array' then content
                        else '[]'::jsonb end) as b
           group by b->>'layer'
        ) l), '[]'::jsonb),

    -- ‏שורה לכל ספר. הטבלה קטנה דיה כדי להציג אותה במלואה; אין כאן חיתוך שקט.
    'books', coalesce((
      select jsonb_agg(x order by (x->>'updated_at_ms')::bigint desc)
        from (
          select jsonb_build_object(
                   'id', id,
                   'user_id', user_id,
                   'is_anon', coalesce(user_id, '') in ('', 'anon'),
                   'title', title,
                   'author', nullif(author, ''),
                   'template_key', template_key,
                   'blocks', case when jsonb_typeof(content) = 'array'
                                  then jsonb_array_length(content) else 0 end,
                   'content_bytes', length(content::text),
                   'settings_bytes', length(settings::text),
                   'settings_keys', (select count(*) from jsonb_object_keys(settings)),
                   'page_size', settings->>'pageSize',
                   'columns', settings->>'columns',
                   'created_at', to_timestamp(created_at / 1000.0),
                   'updated_at', to_timestamp(updated_at / 1000.0),
                   'updated_at_ms', updated_at,
                   'edited_since_create', updated_at > created_at
                 ) as x
            from public.otvedaf_books
        ) b), '[]'::jsonb)
  );
end;
$function$;

grant execute on function public.more30_admin_imud_report() to authenticated;

comment on function public.more30_admin_imud_report() is
  'מסך הקליטה של מערכת 04 (עימוד תורני) — קורא בלבד, super-admin בלבד. core.issues #86.';
