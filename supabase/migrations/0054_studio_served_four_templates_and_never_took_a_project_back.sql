-- 0054 — סטודיו מודעות (26) הגישה ארבע תבניות, ולא קיבלה בחזרה אף פרויקט
--
-- ‏#86 מונה שש מערכות ציבוריות חיות בלי מסך ניהול במקור. שלוש מהן (17 chizukim ·
-- ‏12 smel · 18 orech) יושבות בפרויקטים שאינם של החשבון הזה והן הכרעה של המשתמש,
-- לא תור עבודה. בהאב נסגרו 34 kesef (0052 + ‎/admin/kesef) ו-04 imud (0053 +
-- ‎/admin/imud). נשארה אחת: 26 studio. הסבב הזה לוקח אותה — ובאותו פיצול:
-- קודם קורא, ואחריו המסך.
--
-- ── מה נמדד עכשיו, לפני שנכתב דוח ────────────────────────────────────────────
--
-- ‏המקור ב-apps/26-modaot-studio שומר את המצב בקובץ SQLite מקומי דרך drizzle +
-- better-sqlite3 (server/storage.ts:12 — new Database("data.db")). לפונקציה
-- serverless אין מערכת קבצים עמידה, ולכן גרסת הפריסה כתבה מימוש מקביל:
-- ‎_deploy/studio-more30/api/_lib/server/storage.ts קורא וכותב את אותן ארבע
-- הטבלאות ב-public על הפרויקט הזה, עם service_role. כלומר הטבלאות public.studio_*
-- אינן שריד — הן מה שהייצור באמת מחזיק.
--
-- ‏אומת מול הייצור ב-10/08, לא מהמקור: ‎https://more30.com/studio/api/templates
-- מחזירה 200 · application/json · 18,667 בייטים, וארבע השורות שבה הן בדיוק
-- ארבע השורות שבטבלה, לפי מזהה ולפי שם.
--
-- ‏מה שנמצא בטבלאות (נמדד 10/08 על המסד החי):
--
--   studio_templates    4      כולן builtin=1, כולן ig_feed_45 1080×1350, בלי תמונה ממוזערת
--   studio_projects     0
--   studio_brands       0
--   studio_users        0
--
-- ‏layers_json אינו מערך אלא אובייקט עם שני מפתחות — background ו-layers — בכל
-- ארבע השורות. ‏jsonb_array_length עליו זורק, ולכן ספירת השכבות נעשית על
-- ‎doc->'layers' ולא על המסמך. מה שיוצא: 13 · 12 · 11 · 26 שכבות, 62 בסך הכל,
-- ומהן ‎38 text · 13 shape · 8 decoration · 3 image. הרקע הוא gradient בשלוש
-- מהתבניות ו-solid באחת.
--
-- ‏שלושת האפסים האלה הם הממצא, והם אינם אומרים "אף אחד לא נכנס". השרת הפרוס
-- ‏חושף לפרויקטים ולמותגים CRUD מלא — routes.ts רושם ‎GET/POST/PATCH/DELETE על
-- ‎/api/projects ועל /api/brands, עשרה מסלולים בסך הכל. החבילה שהלקוח באמת מקבל
-- אינה קוראת לאף אחד מהם: ב-612,504 הבייטים של
-- ‎/studio/assets/index-CsiCgOfk.js יש מופע אחד בלבד של "api/" והוא
-- ‎"/api/templates"; המחרוזות "projects" ו-"brands" מופיעות אפס פעמים. כלומר
-- הכפתור שקורא לעצמו שמירה אינו מגיע לשרת, והאפס אינו מדד שימוש אלא מדד ניתוק.
-- זה באג בפני עצמו, נפרד ממסך הניהול, והדוח נבנה כך שהוא יראה אותו: ברגע
-- שהחיבור ייסגר, projects יפסיק להיות 0 בלי שתשתנה כאן שורה.
--
-- ‏חותמות הזמן הן שניות אפוך (unix seconds) ולא מילישניות — ‎storage.ts:33
-- מגדיר ‎now = Math.floor(Date.now()/1000), וזה שונה מ-imud שבו הן מילישניות.
-- ‏to_timestamp כאן מקבל את הערך כמות שהוא, בלי חלוקה.
--
-- ── מה נוסף כאן ──────────────────────────────────────────────────────────────
--
-- ‏more30_admin_studio_report() — קורא בלבד, super-admin בלבד, באותה תבנית של
-- more30_admin_kesef_report ו-more30_admin_imud_report. הוא מחזיר:
--
--   totals     — תבניות · מתוכן builtin · פרויקטים · מותגים · משתמשים · שכבות
--   templates  — שורה לכל תבנית: שם, קטגוריה, סגנון, פורמט, מידות, שכבות, רקע, גודל
--   by_category / by_style / by_format / by_layer_type — היסטוגרמות שנגזרות מהשורות עצמן
--   projects   — שורה לכל פרויקט שנשמר (כרגע: אין)
--   brands     — שורה לכל מותג שנשמר, בלי לוגו ובלי brief (כרגע: אין)
--   activity   — ראשון ואחרון בכל אחת מהשלוש, וכמה ימים עברו מאז
--
-- ‏אין כאן ולא ערך מוערך אחד. אפס מדווח כאפס, ו-notes.zero אומר במפורש ש-0 כאן
-- הוא מדידה ולא כשל בקריאה.
--
-- ‏מה שאין כאן: תוכן. layers_json, brief_json, kit_json, logo_png ו-logo_svg
-- אינם מוחזרים — רק אורכם. לוח ניהול-על צריך לדעת שמותג נשמר ומה גודלו, לא
-- לשאת קידוד base64 של לוגו בכל טעינת מסך. ו-studio_users.password אינו מוחזר
-- ואף אינו נבדק: הטבלה ריקה, וכל אמירה על צורת האחסון שלה הייתה ניחוש.
--
-- ‏מה שאין כאן: כתיבה. אין יצירה, עריכה או מחיקה. הכתיבה של המוצר עוברת דרך
-- שרת שמחזיק service_role, וכתיבה ישירה מלוח הניהול הייתה עוקפת אותו. הקריאה
-- קודמת.
--
-- ‏security definer + search_path קבוע, כמו כל אחיותיה: ארבע הטבלאות מוגנות
-- ב-RLS בלי policies — ל-anon אין grants כלל (storage.ts:8) — וזו הדרך היחידה
-- שמסך בדפדפן יכול לקרוא אותן בלי לפתוח אותן לכל המחוברים.

create or replace function public.more30_admin_studio_report()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'auth'
as $function$
declare
  t_templates  bigint;
  t_builtin    bigint;
  t_projects   bigint;
  t_brands     bigint;
  t_users      bigint;
  tpl_first    bigint;
  tpl_last     bigint;
  prj_first    bigint;
  prj_last     bigint;
  brd_first    bigint;
  brd_last     bigint;
  tpl_rows     jsonb := '[]'::jsonb;
  prj_rows     jsonb := '[]'::jsonb;
  lay_counts   jsonb := '{}'::jsonb;
  t_layers     bigint := 0;
  r            record;
  doc          jsonb;
  n_layers     int;
  lt           text;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select count(*),
         count(*) filter (where coalesce(builtin, 0) = 1),
         min(created_at),
         max(created_at)
    into t_templates, t_builtin, tpl_first, tpl_last
    from public.studio_templates;

  select count(*), min(created_at), max(updated_at)
    into t_projects, prj_first, prj_last
    from public.studio_projects;

  select count(*), min(created_at), max(updated_at)
    into t_brands, brd_first, brd_last
    from public.studio_brands;

  select count(*) into t_users from public.studio_users;

  -- ‏layers_json הוא text ולא jsonb, ואין ערובה שכל שורה בו היא JSON תקין —
  -- ‏הוא נכתב מהלקוח. ההמרה נעשית שורה-שורה בתוך בלוק שתופס חריגה, ושכבות של
  -- שורה שאינה נפרשת מדווחות null ולא 0: "לא ידוע" אינו "אפס". המסמך עצמו הוא
  -- ‏אובייקט ‎{background, layers}, ולכן הספירה היא על doc->'layers'.
  for r in select * from public.studio_templates order by id loop
    begin
      doc := r.layers_json::jsonb;
    exception when others then
      doc := null;
    end;
    n_layers := case when jsonb_typeof(doc->'layers') = 'array'
                     then jsonb_array_length(doc->'layers') end;
    t_layers := t_layers + coalesce(n_layers, 0);
    for lt in select coalesce(e->>'type', '(ללא סוג)')
                from jsonb_array_elements(case when jsonb_typeof(doc->'layers') = 'array'
                                               then doc->'layers' else '[]'::jsonb end) e loop
      lay_counts := jsonb_set(lay_counts, array[lt],
                              to_jsonb(coalesce((lay_counts->>lt)::int, 0) + 1), true);
    end loop;

    tpl_rows := tpl_rows || jsonb_build_object(
      'id',            r.id,
      'name',          r.name,
      'category',      r.category,
      'style',         r.style,
      'format',        r.format,
      'width',         r.width,
      'height',        r.height,
      'builtin',       coalesce(r.builtin, 0) = 1,
      'layers',        n_layers,
      'background',    doc->'background'->>'type',
      'layers_bytes',  length(coalesce(r.layers_json, '')),
      'has_thumbnail', coalesce(r.thumbnail, '') <> '',
      'created_at',    case when r.created_at is null then null
                            else to_timestamp(r.created_at) end
    );
  end loop;

  for r in select * from public.studio_projects order by updated_at desc nulls last loop
    begin
      doc := r.layers_json::jsonb;
    exception when others then
      doc := null;
    end;
    n_layers := case when jsonb_typeof(doc->'layers') = 'array'
                     then jsonb_array_length(doc->'layers') end;
    t_layers := t_layers + coalesce(n_layers, 0);
    for lt in select coalesce(e->>'type', '(ללא סוג)')
                from jsonb_array_elements(case when jsonb_typeof(doc->'layers') = 'array'
                                               then doc->'layers' else '[]'::jsonb end) e loop
      lay_counts := jsonb_set(lay_counts, array[lt],
                              to_jsonb(coalesce((lay_counts->>lt)::int, 0) + 1), true);
    end loop;

    prj_rows := prj_rows || jsonb_build_object(
      'id',            r.id,
      'name',          r.name,
      'category',      r.category,
      'style',         r.style,
      'format',        r.format,
      'width',         r.width,
      'height',        r.height,
      'layers',        n_layers,
      'background',    doc->'background'->>'type',
      'layers_bytes',  length(coalesce(r.layers_json, '')),
      'has_thumbnail', coalesce(r.thumbnail, '') <> '',
      'created_at',    case when r.created_at is null then null
                            else to_timestamp(r.created_at) end,
      'updated_at',    case when r.updated_at is null then null
                            else to_timestamp(r.updated_at) end,
      'edited_since_create', coalesce(r.updated_at > r.created_at, false)
    );
  end loop;

  return jsonb_build_object(
    'generated_at', now(),
    'app_key', 'studio',
    'tables', jsonb_build_array('public.studio_templates', 'public.studio_projects',
                                'public.studio_brands', 'public.studio_users'),

    'notes', jsonb_build_object(
      'what', 'מסך הקליטה של מערכת 26 (סטודיו מודעות). ארבע הטבלאות public.studio_* הן מה שהייצור מחזיק: _deploy/studio-more30/api/_lib/server/storage.ts קורא וכותב אותן עם service_role, במקום קובץ ה-SQLite המקומי של המקור. המספרים נספרים בזמן הקריאה.',
      'zero', '0 כאן הוא מדידה ולא כשל בקריאה. רשימה ריקה פירושה שאין שורות — לא שהשאילתה נכשלה.',
      'disconnect', 'projects ו-brands אפס אינם מדד שימוש. השרת הפרוס חושף להם CRUD מלא (עשרה מסלולים ב-routes.ts), והחבילה שהלקוח מקבל בייצור אינה קוראת לאף אחד מהם: מופע יחיד של api/ בכל החבילה, והוא /api/templates. כשהחיבור ייסגר, המספר הזה יזוז בלי לגעת בפונקציה.',
      'time', 'חותמות הזמן הן שניות אפוך ולא מילישניות (storage.ts:33), ולכן to_timestamp מקבל אותן כמות שהן. זה שונה מ-imud.',
      'content', 'התוכן עצמו אינו מוחזר — layers_json, brief_json, kit_json, logo_png ו-logo_svg מדווחים באורך בלבד, כדי שמסך לא ייגרר לשאת base64 של לוגו בכל טעינה. layers של שורה שאינה JSON תקין מדווח null, כלומר "לא ידוע", ולא 0.',
      'layers', 'layers_json אינו מערך שכבות אלא אובייקט עם background ו-layers, ולכן הספירה היא על doc->''layers''. layers=null פירושו ששורה לא נפרשה כ-JSON או שאין בה מערך שכבות — לא שאין בה שכבות.',
      'users', 'studio_users.password אינו מוחזר ואינו נבדק. הטבלה ריקה, וכל אמירה על צורת האחסון שלה הייתה ניחוש.',
      'read_only', 'הדוח קורא בלבד. אין יצירה, עריכה או מחיקה: הכתיבה של המוצר עוברת דרך שרת שמחזיק service_role, וכתיבה ישירה מכאן הייתה עוקפת אותו.'
    ),

    'totals', jsonb_build_object(
      'templates',         t_templates,
      'templates_builtin', t_builtin,
      'templates_custom',  t_templates - t_builtin,
      'projects',          t_projects,
      'brands',            t_brands,
      'users',             t_users,
      'layers',            t_layers
    ),

    'activity', jsonb_build_object(
      'templates_first', case when tpl_first is null then null else to_timestamp(tpl_first) end,
      'templates_last',  case when tpl_last  is null then null else to_timestamp(tpl_last)  end,
      'projects_first',  case when prj_first is null then null else to_timestamp(prj_first) end,
      'projects_last',   case when prj_last  is null then null else to_timestamp(prj_last)  end,
      'brands_first',    case when brd_first is null then null else to_timestamp(brd_first) end,
      'brands_last',     case when brd_last  is null then null else to_timestamp(brd_last)  end,
      'days_since_last_project', case when prj_last is null then null
                                      else round(extract(epoch from now() - to_timestamp(prj_last)) / 86400.0, 1) end,
      'days_since_last_brand',   case when brd_last is null then null
                                      else round(extract(epoch from now() - to_timestamp(brd_last)) / 86400.0, 1) end
    ),

    'templates', tpl_rows,
    'projects',  prj_rows,

    -- ‏היסטוגרמת סוגי השכבות, נצברת מהשכבות עצמן בזמן המעבר על השורות ולא
    -- מרשימה קשיחה של LayerKind. שכבה בלי type נספרת בנפרד ולא מושמטת.
    'by_layer_type', coalesce((
      select jsonb_agg(jsonb_build_object('type', key, 'layers', value::int)
                       order by value::int desc, key)
        from jsonb_each_text(lay_counts)), '[]'::jsonb),

    -- ‏מותגים בלי הלוגו ובלי ה-brief: מה שנשמר, מתי, ובאיזה גודל.
    'brands', coalesce((
      select jsonb_agg(x order by (x->>'id')::bigint desc)
        from (
          select jsonb_build_object(
                   'id', id,
                   'brand_name', nullif(brand_name, ''),
                   'brief_bytes', length(coalesce(brief_json, '')),
                   'kit_bytes',   length(coalesce(kit_json, '')),
                   'has_kit',     coalesce(kit_json, '') <> '',
                   'has_logo_png', coalesce(logo_png, '') <> '',
                   'has_logo_svg', coalesce(logo_svg, '') <> '',
                   'logo_bytes',  length(coalesce(logo_png, '')) + length(coalesce(logo_svg, '')),
                   'created_at',  case when created_at is null then null else to_timestamp(created_at) end,
                   'updated_at',  case when updated_at is null then null else to_timestamp(updated_at) end
                 ) as x
            from public.studio_brands
        ) b), '[]'::jsonb),

    -- ‏שלוש היסטוגרמות על התבניות והפרויקטים יחד, נגזרות מהשורות ולא מרשימה
    -- קשיחה: קטגוריה, סגנון ופורמט חדשים יופיעו כאן בלי לגעת בפונקציה.
    'by_category', coalesce((
      select jsonb_agg(x order by (x->>'templates')::bigint desc, x->>'key')
        from (
          select jsonb_build_object('key', category,
                                    'templates', count(*) filter (where src = 'template'),
                                    'projects',  count(*) filter (where src = 'project')) as x
            from (select category, 'template' as src from public.studio_templates
                  union all
                  select category, 'project'  as src from public.studio_projects) u
           group by category
        ) c), '[]'::jsonb),

    'by_style', coalesce((
      select jsonb_agg(x order by (x->>'templates')::bigint desc, x->>'key')
        from (
          select jsonb_build_object('key', style,
                                    'templates', count(*) filter (where src = 'template'),
                                    'projects',  count(*) filter (where src = 'project')) as x
            from (select style, 'template' as src from public.studio_templates
                  union all
                  select style, 'project'  as src from public.studio_projects) u
           group by style
        ) s), '[]'::jsonb),

    'by_format', coalesce((
      select jsonb_agg(x order by (x->>'templates')::bigint desc, x->>'key')
        from (
          select jsonb_build_object('key', format,
                                    'width', max(width), 'height', max(height),
                                    'templates', count(*) filter (where src = 'template'),
                                    'projects',  count(*) filter (where src = 'project')) as x
            from (select format, width, height, 'template' as src from public.studio_templates
                  union all
                  select format, width, height, 'project'  as src from public.studio_projects) u
           group by format
        ) f), '[]'::jsonb)
  );
end;
$function$;

grant execute on function public.more30_admin_studio_report() to authenticated;

comment on function public.more30_admin_studio_report() is
  'מסך הקליטה של מערכת 26 (סטודיו מודעות) — קורא בלבד, super-admin בלבד. core.issues #86.';
