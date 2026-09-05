-- 0170 — כסף (34): שורת המקור לא אומרת מאיזה סוג קובץ היא הגיעה
--
-- כל מסמך ב-kesef.source_document כבר נושא meta->>'format' (CSV או XLSX —
-- משרד הפנים החליף פורמט בין שנות הדוח: 2018/2019/2022 פורסמו כ-CSV,
-- 2023/2024 כ-XLSX), נתון אמיתי ושונה בין שורות, לא קבוע. ה-RPC
-- kesef_authority_report כבר קורא מ-meta את license ו-fiscal_year אבל לא
-- format, ולכן מסך הדוח (/kesef/report, קטע "מקורות") מעולם לא יכול היה
-- להציג אותו. אין כאן DDL חדש — הנתון קיים; רק ה-RPC מתעדכן לכלול אותו.

create or replace function public.kesef_authority_report(p_symbol integer)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'kesef'
as $function$
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
        'license', sd.meta->>'license', 'format', sd.meta->>'format', 'sha256', sd.sha256
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
end $function$;
