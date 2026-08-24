-- 0147 — כסף (34) לומדת להשוות: RPC קריאה-בלבד למסך השוואת רשויות
--
-- ‏0146 פתח את הדוח לרשות בודדת — הרשות מול חציון קבוצת שווים אנונימי. הצעד
-- הבא של מוצר שקיפות הוא ההשוואה השמית: ראש רשות (או תושב) לא שואל "איפה אני
-- מול חציון" אלא "איפה אני מול הרשות השכנה". הנתונים כבר קיימים לכל 258
-- הרשויות (12 מדדים × 258 = 3,096 שורות metric_value, שנת הדוח 2024).
--
-- ‏למה RPC ייעודי ולא N קריאות ל-kesef_authority_report: הדוח המלא גורר את כל
-- שורות "דוח לתושב" של כל שנה שנטענה (לפיילוט — חמש שנים, כל הגיליונות של שלוש
-- קבוצות הגיליונות שהוא מסנן). ההשוואה צריכה רק את שורת המדדים המחושבים —
-- תשובה קטנה פי כמה, בבקשה אחת.
--
-- ‏אותם עקרונות בדיוק כמו 0146:
--   · security definer + search_path קבוע — הסכימה kesef אינה חשופה ל-PostgREST.
--   · קריאה בלבד; אין שום כתיבה מהדפדפן.
--   · מה שאין — נאמר שאין: סמל שלא קיים חוזר ברשימת not_found (לא מומצא),
--     ורשות בלי מדדים מחזירה metrics ריק.
--   · תקרה של 4 רשויות להשוואה (truncated=true כשהתבקש יותר) — גבול מוצר
--     מוצהר, לא כשל שקט: הקורא רואה בדיוק שקוצץ.
--   · distinct on (metric_key) ... order by fiscal_year desc — היום יש רק
--     2024, אבל כשייטענו שנים נוספות ההשוואה תמשיך להציג את השנה האחרונה
--     של כל מדד במקום להתרסק על כפילות מפתח ב-jsonb_object_agg.

create or replace function public.kesef_authorities_compare(p_symbols int[])
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'kesef'
as $$
declare
  syms int[];
  requested int;
  result jsonb;
begin
  -- ניקוי הקלט: הסרת כפילויות תוך שמירת סדר הקורא, ותקרת 4 רשויות.
  select count(distinct s) into requested from unnest(coalesce(p_symbols, '{}')) s;
  select array_agg(s order by ord) into syms
  from (
    select s, min(ord) as ord
    from unnest(coalesce(p_symbols, '{}')) with ordinality u(s, ord)
    group by s
    order by min(ord)
    limit 4
  ) t;

  if syms is null then
    return jsonb_build_object('authorities', '[]'::jsonb, 'not_found', '[]'::jsonb,
                              'truncated', false, 'generated_at', now());
  end if;

  select jsonb_build_object(
    'authorities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'symbol', a.symbol, 'name', a.name_he, 'status', a.status,
        'district', a.district, 'population', a.population,
        'population_year', a.population_year,
        'socio_cluster', a.socio_economic_cluster,
        'metrics', (
          select coalesce(jsonb_object_agg(m.metric_key, jsonb_build_object(
            'fiscal_year', m.fiscal_year, 'value', m.value,
            'peer_median', m.peer_median, 'peer_p25', m.peer_p25, 'peer_p75', m.peer_p75,
            'national_median', m.national_median,
            'delta_vs_peer_pct', m.delta_vs_peer_pct
          )), '{}'::jsonb)
          from (
            select distinct on (mv.metric_key) mv.*
            from kesef.metric_value mv
            where mv.authority_id = a.id
            order by mv.metric_key, mv.fiscal_year desc
          ) m
        )
      ) order by s.ord)
      from unnest(syms) with ordinality s(sym, ord)
      join kesef.authority a on a.symbol = s.sym
    ), '[]'::jsonb),
    'not_found', coalesce((
      select jsonb_agg(s.sym order by s.ord)
      from unnest(syms) with ordinality s(sym, ord)
      where not exists (select 1 from kesef.authority a where a.symbol = s.sym)
    ), '[]'::jsonb),
    'truncated', requested > 4,
    'generated_at', now()
  ) into result;

  return result;
end $$;

revoke all on function public.kesef_authorities_compare(int[]) from public;
grant execute on function public.kesef_authorities_compare(int[]) to anon, authenticated, service_role;
