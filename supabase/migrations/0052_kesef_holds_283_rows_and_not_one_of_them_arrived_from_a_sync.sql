-- 0052 — כסף מחזיקה 283 שורות, ואף אחת מהן לא הגיעה מסנכרון
--
-- ‏0051 (קומיט 207ec68) פיצל את core.issues #86 — שש מערכות ציבוריות חיות בלי
-- מסך ניהול — ומצא ששלוש מהשש כלל אינן בפרויקט שהחשבון הזה מנהל. משלוש
-- הנותרות נבחרה **34 kesef** בטענה אחת: היא מחזיקה את הנתונים האמיתיים
-- היחידים שאיש אינו רואה, 283 שורות מול 4 של studio ו-2 של imud.
--
-- ── מה נמדד עכשיו, לפני שנכתב מסך ──────────────────────────────────────────
--
-- ‏283 השורות אמיתיות, אבל הן אינן מה שהמספר הזה נשמע כמו. נמדד 09/08 על
-- המסד החי:
--
--   kesef.authority           259   259 רשויות
--   kesef.data_source          12
--   kesef.chart_of_accounts     8
--   kesef.term_normalization    4
--
-- ‏ומן הצד השני:
--
--   population is not null                0 מתוך 259
--   socio_economic_cluster is not null    0 מתוך 259
--   website_url is not null               0 מתוך 259
--   financial_status is not null          0 מתוך 259
--   kesef.data_source where last_ok_at is not null   0 מתוך 12
--   kesef.sync_run                        0
--   kesef.fact_financial                  0
--   kesef.app_user                        0
--
-- ‏כלומר: כל 283 השורות הן **קטלוג** — שמות רשויות, מחוזות, סימבולים, סעיפי
-- תקציב ומילון מונחים, מה שנזרע ביד כשהסכימה נבנתה. המוצר עצמו מעולם לא
-- הכניס שורה אחת: שנים-עשר המקורות פעילים כולם ואף אחד מהם לא הצליח אי-פעם,
-- אין ולו ריצת סנכרון אחת, ואין ולו עובדה פיננסית אחת. גם עמודות הדמוגרפיה
-- שכבר קיימות ב-authority ריקות לחלוטין.
--
-- זה משנה מה המסך צריך להיות. "מנהל נתונים" שמדפדף ב-259 רשויות מציג טבלה
-- שכל עמודה מעניינת בה ריקה, וקורא הלוח יסיק שהמערכת עובדת. מה שיש לנהל
-- כאן הוא **הקליטה**: אילו מקורות מוגדרים, מתי כל אחד הצליח לאחרונה, ומה
-- הפער בין הקטלוג לבין מה שנקלט בפועל.
--
-- ── מה נוסף כאן ────────────────────────────────────────────────────────────
--
-- ‏more30_admin_kesef_report() — קורא בלבד, super-admin בלבד, באותה תבנית של
-- more30_admin_systems_report ו-more30_admin_join_rejects. הוא מחזיר:
--
--   catalog     — ארבע הטבלאות שיש בהן שורות, עם המספר
--   coverage    — לכל עמודה מעניינת ב-authority: כמה מלאות מתוך 259
--   ingestion   — שנים-עשר המקורות, אחד-אחד, עם last_ok_at ו-last_error
--   product     — מה שהמוצר עצמו כתב: עובדות, ריצות, משתמשים, מנויים
--   empty_tables — נמנה **דינמית** בלולאה על information_schema, לא מרשימה
--                  קשיחה, כדי שהיום שבו טבלה תתמלא ישנה את המסך מעצמו
--
-- ‏אין כאן ולו ערך מוערך אחד. טבלה ריקה מדווחת 0 ומופיעה ב-empty_tables;
-- שדה ריק מדווח 0 ב-coverage. ‎notes.zero‎ אומר במפורש ש-0 כאן הוא מדידה
-- ולא כשל בקריאה, כדי שמי שרואה מסך של אפסים לא ינחש איזה מהשניים.
--
-- ‏מה שאין כאן: כתיבה. אין הפעלת סנכרון, אין עריכת רשות, אין מחיקה. מסך
-- שכותב לסכימה שהמוצר שלה אינו בעץ הזה (apps/34-kesef הוא app.json יחיד)
-- הוא ניחוש על חוזה שלא נקרא. הקריאה קודמת.
--
-- ‏security definer + search_path קבוע, כמו כל אחיותיה: הסכימה kesef אינה
-- חשופה ל-PostgREST, וזו הדרך היחידה שמסך בדפדפן יכול לקרוא אותה בלי לפתוח
-- אותה לכל המחוברים.

create or replace function public.more30_admin_kesef_report()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'kesef', 'auth'
as $function$
declare
  r          record;
  n          bigint;
  counts     jsonb := '{}'::jsonb;
  empty_list text[] := '{}';
  total      bigint := 0;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  -- ‏מניין חי של כל טבלת בסיס בסכימה. תצוגות (v_*) אינן נספרות — הן נגזרות.
  for r in
    select table_name
      from information_schema.tables
     where table_schema = 'kesef' and table_type = 'BASE TABLE'
     order by table_name
  loop
    execute format('select count(*) from kesef.%I', r.table_name) into n;
    counts := counts || jsonb_build_object(r.table_name, n);
    total  := total + n;
    if n = 0 then
      empty_list := empty_list || r.table_name;
    end if;
  end loop;

  return jsonb_build_object(
    'generated_at', now(),
    'app_key', 'kesef',
    'schema', 'kesef',
    'notes', jsonb_build_object(
      'what', 'מסך הקליטה של מערכת 34 (כסף). כל המספרים כאן נספרים בזמן הקריאה על סכימת kesef עצמה, ואין בהם ולו ערך מוערך אחד.',
      'zero', '0 כאן הוא מדידה ולא כשל בקריאה. טבלה שאין בה שורות מדווחת 0 ומופיעה גם ב-empty_tables; עמודה שלא מולאה באף שורה מדווחת 0 ב-coverage.',
      'catalog_vs_ingested', 'catalog הוא מה שנזרע ביד כשהסכימה נבנתה — שמות רשויות, סעיפי תקציב, מילון מונחים. ingestion ו-product הם מה שהמוצר עצמו הכניס. הפער בין השניים הוא המצב האמיתי של המערכת, ולכן הם מוצגים בנפרד ולא מסוכמים יחד.',
      'read_only', 'הדוח קורא בלבד. אין כאן הפעלת סנכרון, עריכה או מחיקה — מקור המוצר של 34 אינו בעץ הזה (apps/34-kesef הוא app.json יחיד), וכתיבה לסכימה שחוזה הכתיבה שלה לא נקרא היא ניחוש.',
      'sources', 'is_active הוא הגדרה, לא מצב. מקור פעיל ש-last_ok_at שלו null מעולם לא הצליח, ו-ok=false אומר בדיוק את זה.'
    ),

    'totals', jsonb_build_object(
      'rows',         total,
      'tables',       (select count(*) from information_schema.tables
                        where table_schema='kesef' and table_type='BASE TABLE'),
      'empty_tables', array_length(empty_list, 1),
      'authorities',  (select count(*) from kesef.authority),
      'sources',      (select count(*) from kesef.data_source),
      'sources_ok',   (select count(*) from kesef.data_source where last_ok_at is not null),
      'sync_runs',    (select count(*) from kesef.sync_run),
      'facts',        (select count(*) from kesef.fact_financial),
      'users',        (select count(*) from kesef.app_user)
    ),

    'row_counts',   counts,
    'empty_tables', to_jsonb(empty_list),

    'catalog', jsonb_build_object(
      'authorities_by_status', coalesce((
        select jsonb_object_agg(q.k, q.n)
          from (select a.status::text as k, count(*) as n
                  from kesef.authority a group by 1) q), '{}'::jsonb),
      'authorities_by_district', coalesce((
        select jsonb_object_agg(q.k, q.n)
          from (select coalesce(a.district, '—') as k, count(*) as n
                  from kesef.authority a group by 1) q), '{}'::jsonb),
      'chart_of_accounts', (select count(*) from kesef.chart_of_accounts),
      'term_normalization', (select count(*) from kesef.term_normalization)
    ),

    -- ‏כמה מ-259 הרשויות מחזיקות ערך בכל עמודה שמסך היה מציג. כולן 0 היום.
    'coverage', (
      select jsonb_build_object(
        'of', count(*),
        'fields', jsonb_build_object(
          'population',             count(a.population),
          'socio_economic_cluster', count(a.socio_economic_cluster),
          'peripherality_cluster',  count(a.peripherality_cluster),
          'pct_children',           count(a.pct_children),
          'pct_elderly',            count(a.pct_elderly),
          'website_url',            count(a.website_url),
          'financial_status',       count(a.financial_status),
          'geom_center',            count(a.geom_center)
        )
      ) from kesef.authority a
    ),

    'ingestion', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.ok, x.slug)
        from (
          select s.slug,
                 s.display_name,
                 s.kind::text                          as kind,
                 s.base_url,
                 s.sync_frequency,
                 coalesce(s.is_active, false)          as is_active,
                 s.last_ok_at,
                 (s.last_ok_at is not null)            as ok,
                 s.last_error,
                 -- ‏הכינוי sr ולא r: r הוא משתנה הלולאה שלמעלה, ורשומת plpgsql
                 -- ‏מסתירה כינוי טבלה באותו שם — "record r has no field source_id".
                 (select count(*) from kesef.sync_run sr where sr.source_id = s.id) as runs,
                 (select jsonb_build_object(
                           'status', sr.status, 'started_at', sr.started_at,
                           'finished_at', sr.finished_at,
                           'rows_in', sr.rows_in, 'rows_written', sr.rows_written,
                           'rows_rejected', sr.rows_rejected, 'message', sr.message)
                    from kesef.sync_run sr
                   where sr.source_id = s.id
                   order by sr.started_at desc nulls last
                   limit 1)                            as last_run
            from kesef.data_source s
        ) x), '[]'::jsonb),

    -- ‏מה שהמוצר עצמו כתב, בנפרד מהקטלוג שנזרע ביד.
    'product', jsonb_build_object(
      'fact_financial',  (select count(*) from kesef.fact_financial),
      'tabar',           (select count(*) from kesef.tabar),
      'tender',          (select count(*) from kesef.tender),
      'support_grant',   (select count(*) from kesef.support_grant),
      'source_document', (select count(*) from kesef.source_document),
      'sync_run',        (select count(*) from kesef.sync_run),
      'app_user',        (select count(*) from kesef.app_user),
      'subscription',    (select count(*) from kesef.subscription),
      'review_open',     (select count(*) from kesef.review_queue
                           where coalesce(status,'open') <> 'resolved'),
      'alerts',          (select count(*) from kesef.alert)
    )
  );
end;
$function$;

grant execute on function public.more30_admin_kesef_report() to authenticated;

comment on function public.more30_admin_kesef_report() is
  'מסך הקליטה של מערכת 34 (כסף) — קורא בלבד, super-admin בלבד. core.issues #86.';
