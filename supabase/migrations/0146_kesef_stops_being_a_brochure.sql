-- 0145 — כסף (34) מפסיקה להיות עמוד תדמית: הפיילוט נטען, והמסך הציבורי מקבל API
--
-- ‏0052 מדד את המצב במדויק: 283 שורות קטלוג, אפס עובדות, אפס סנכרונים, ומסך
-- ניהול שכל תפקידו להראות את הפער הזה. NEEDS_USER (19/08) ביקש "מיקום קוד
-- המקור או אישור לבנות מחדש" — והנחיית הלולאה (24/08, Loop C) הכריעה: 34 בהיקף,
-- להחליט לבד, לבנות. אז נבנה, מהמקור הציבורי שהסכימה עצמה כבר הצביעה עליו.
--
-- ── מה נטען (24/08/2026, דרך extension http בתוך ה-DB, מקור: data.gov.il) ──
--
--   dataset local-authorities (משרד הפנים, רישיון CC-BY):
--   דוחות כספיים מבוקרים 2018/2019/2022/2023/2024.
--
--   kesef.fact_financial   60,453 שורות אמת (0 → 60,453):
--     · גיליון "דוח לתושב" + "נתונים כלליים" 2024 — לכל 258 הרשויות שנמצאו
--       בדוחות (מתוך 260 ישויות בקובץ: בוסתאן אל-מרג' אינה בקטלוג ה-seed,
--       ו"חברון וע. מוניציפלית" חסרת קוד רשות — נדחו ותועדו, לא הומצא סמל).
--     · הדוח המלא, כל הגיליונות, לפיילוט חצור הגלילית — לכל 5 השנים.
--   kesef.source_document  5 מסמכי מקור (resource לכל שנה) עם sha256 אמיתי
--     שמחושב על השורות שנקלטו (meta.sha256_of=canonical_ingested_rows) —
--     r2_key הוא מפתח יעד; meta.archived=false אומר בפירוש שאין עדיין עותק ארכיון.
--   kesef.metric_value     3,096 שורות: 12 מדדי-כותרת לכל רשות עם חציון/רבעונים
--     של קבוצת שווים (אותו מעמד מוניציפלי, אשכול ±1, בלי הרשות עצמה) וחציון ארצי.
--   kesef.authority        אוכלוסייה + אשכול חברתי-כלכלי 2024 על 258 רשויות;
--     איות משרד-הפנים שנוסף כ-name_variant על 26 רשויות (קרית/קריית וכו').
--   kesef.peer_group       64 שווים לפיילוט. kesef.sync_run — ריצה מתועדת אחת.
--
-- ‏תיקון דיוק שנתפס תוך כדי: fact_financial.value היה numeric(18,2) — נכון
-- לאלפי ש"ח, הרסני ליחסים (0.854048 → 0.85 → "85.0%"). הוחלף ל-numeric חופשי
-- (מיגרציה kesef_value_columns_lose_their_two_decimal_straitjacket) והנתונים
-- נטענו מחדש במלוא הדיוק לפני שחושב ולו מדד אחד.
--
-- ── מה נוסף כאן: שני RPC ציבוריים לקריאה בלבד ─────────────────────────────
--
-- ‏באותה תבנית בדיוק כמו maatefet_*/np_*/evg_*: הסכימה kesef אינה חשופה
-- ל-PostgREST, ולכן מסך בדפדפן קורא אותה רק דרך security definer עם
-- search_path קבוע. שניהם קוראים בלבד; אין כאן שום כתיבה מהדפדפן.
--
--   kesef_authorities_list()          — לבוחר הרשות: סמל, שם, מעמד, מחוז,
--                                       אוכלוסייה, אשכול, אילו שנים נטענו.
--   kesef_authority_report(p_symbol)  — הדוח המלא לרשות: מדדים מול קבוצת
--                                       השווים, שורות "דוח לתושב" לכל שנה
--                                       שנטענה, מסמכי המקור, ומתי סונכרן.
--
-- ‏העיקרון של המערכת נשמר בקוד: אין ערך בלי מסמך מקור (source_document_id
-- הוא NOT NULL בעובדות שנטענו), אין אומדנים (value_status='reported' בלבד),
-- ומה שאין — נאמר שאין (רשות בלי שנה מסוימת פשוט לא מחזירה אותה).

create or replace function public.kesef_authorities_list()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'kesef'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'symbol', a.symbol,
    'name', a.name_he,
    'status', a.status,
    'district', a.district,
    'population', a.population,
    'socio_cluster', a.socio_economic_cluster,
    'years', y.years
  ) order by a.name_he), '[]'::jsonb)
  from kesef.authority a
  join lateral (
    select jsonb_agg(distinct f.fiscal_year order by f.fiscal_year) years
    from kesef.fact_financial f where f.authority_id = a.id
  ) y on y.years is not null;
$$;

create or replace function public.kesef_authority_report(p_symbol int)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'kesef'
as $$
declare
  v_auth kesef.authority%rowtype;
  result jsonb;
begin
  select * into v_auth from kesef.authority where symbol = p_symbol;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  select jsonb_build_object(
    'authority', jsonb_build_object(
      'symbol', v_auth.symbol, 'name', v_auth.name_he, 'status', v_auth.status,
      'district', v_auth.district, 'population', v_auth.population,
      'population_year', v_auth.population_year,
      'socio_cluster', v_auth.socio_economic_cluster,
      'socio_cluster_year', v_auth.socio_economic_year
    ),
    'metrics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', mv.metric_key, 'fiscal_year', mv.fiscal_year, 'value', mv.value,
        'peer_median', mv.peer_median, 'peer_p25', mv.peer_p25, 'peer_p75', mv.peer_p75,
        'national_median', mv.national_median, 'delta_vs_peer_pct', mv.delta_vs_peer_pct,
        'formula', mv.formula
      ) order by mv.metric_key)
      from kesef.metric_value mv where mv.authority_id = v_auth.id
    ), '[]'::jsonb),
    'peer_count', (
      select count(*) from kesef.authority p
      where p.id <> v_auth.id and p.status = v_auth.status
        and (v_auth.socio_economic_cluster is null
             or p.socio_economic_cluster between v_auth.socio_economic_cluster - 1
                                             and v_auth.socio_economic_cluster + 1)
    ),
    'citizen_report', coalesce((
      select jsonb_object_agg(t.fiscal_year::text, t.rows)
      from (
        select f.fiscal_year, jsonb_agg(jsonb_build_object(
          'sheet', f.sheet_name, 'row', btrim(f.row_label), 'col', btrim(f.column_label),
          'value', f.value, 'measure', f.measure, 'unit', f.unit,
          'source_document_id', f.source_document_id
        ) order by f.sheet_name, f.moi_code nulls last) as rows
        from kesef.fact_financial f
        where f.authority_id = v_auth.id
          and f.sheet_name in ('דוח לתושב', 'נתונים כלליים', 'נתונים נוספים')
        group by f.fiscal_year
      ) t
    ), '{}'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sd.id, 'fiscal_year', (sd.meta->>'fiscal_year')::int, 'title', sd.title,
        'url', sd.url, 'published_at', sd.published_at, 'fetched_at', sd.fetched_at,
        'license', sd.meta->>'license', 'sha256', sd.sha256
      ) order by (sd.meta->>'fiscal_year')::int desc)
      from kesef.source_document sd
      where sd.id in (select distinct f.source_document_id
                      from kesef.fact_financial f where f.authority_id = v_auth.id)
    ), '[]'::jsonb),
    'last_sync', (
      select jsonb_build_object('finished_at', sr.finished_at, 'status', sr.status,
                                'rows_written', sr.rows_written)
      from kesef.sync_run sr
      join kesef.data_source ds on ds.id = sr.source_id
      where ds.slug = 'data_gov_local_authorities' and sr.status = 'ok'
      order by sr.finished_at desc limit 1
    ),
    'generated_at', now()
  ) into result;

  return result;
end $$;

revoke all on function public.kesef_authorities_list() from public;
revoke all on function public.kesef_authority_report(int) from public;
grant execute on function public.kesef_authorities_list() to anon, authenticated, service_role;
grant execute on function public.kesef_authority_report(int) to anon, authenticated, service_role;
