-- 0150 — כסף (34): משפט ההתראה מסכים עם עצמו
--
-- ‏0149 ניסח: "ירדה מ-75.0% בשנת 2023 ל-70.8% בשנת 2024 — ירידה של 4.1 נקודות
-- אחוז". הקצוות עוגלו לספרה אחת אבל ההפרש חושב על הערכים המדויקים, ולכן קורא
-- שמחסר את שני המספרים שבמשפט מקבל 4.2 ותוהה מי טועה. במוצר שכל הבטחתו היא
-- דיוק עובדתי, משפט חייב להסכים עם עצמו: ההפרש בפרוזה מחושב מעכשיו מהקצוות
-- המעוגלים שמופיעים בו. עמודות הנתונים (delta_pct, evidence) נשארות מדויקות —
-- העיגול הוא של הניסוח, לא של העובדה.

create or replace function kesef.compute_metric_alerts()
returns jsonb
language plpgsql
volatile
set search_path to 'kesef', 'public'
as $$
declare
  n int;
begin
  delete from kesef.alert
  where rule_key in ('arnona_collection_drop','debt_burden_rise',
                     'deficit_current_high','deficit_accum_high');

  with latest as (
    select distinct on (authority_id, metric_key) *
    from kesef.metric_value
    where metric_key in ('arnona_collection_pct','debt_burden_pct',
                         'deficit_current_pct','deficit_accum_pct')
    order by authority_id, metric_key, fiscal_year desc
  ),
  prev as (
    select distinct on (mv.authority_id, mv.metric_key) mv.*
    from kesef.metric_value mv
    join latest l on l.authority_id = mv.authority_id
                 and l.metric_key = mv.metric_key
                 and mv.fiscal_year < l.fiscal_year
    order by mv.authority_id, mv.metric_key, mv.fiscal_year desc
  ),
  pct as (select 'FM999990.0'::text as f)
  insert into kesef.alert
    (authority_id, fiscal_year, rule_key, severity, statement_he,
     measured_value, reference_value, delta_pct, methodology_url, evidence, is_public)

  -- ירידה בגביית הארנונה מהשוטף, שנה מול השנה הקודמת שנטענה
  select l.authority_id, l.fiscal_year, 'arnona_collection_drop',
         case when p.value - l.value >= 0.07 then 'high'::kesef.alert_severity
              else 'notice'::kesef.alert_severity end,
         'גביית הארנונה מהחיוב השוטף ירדה מ-' || to_char(p.value*100, pct.f) ||
           '% בשנת ' || p.fiscal_year || ' ל-' || to_char(l.value*100, pct.f) ||
           '% בשנת ' || l.fiscal_year || ' — ירידה של ' ||
           to_char(round(p.value*100,1) - round(l.value*100,1), pct.f) || ' נקודות אחוז.',
         l.value, p.value, (l.value - p.value)*100,
         '/kesef/my#rules',
         jsonb_build_object(
           'metric_key', l.metric_key, 'rule', 'latest <= prev - 0.03',
           'years', jsonb_build_array(
             jsonb_build_object('year', p.fiscal_year, 'value', p.value),
             jsonb_build_object('year', l.fiscal_year, 'value', l.value)),
           'peer_median', l.peer_median, 'formula', l.formula,
           'source', 'kesef.metric_value'),
         not (p.value - l.value >= 0.07)
  from latest l
  join prev p on p.authority_id = l.authority_id and p.metric_key = l.metric_key
  cross join pct
  where l.metric_key = 'arnona_collection_pct' and l.value <= p.value - 0.03

  union all
  -- עלייה בעומס המלוות מן ההכנסה
  select l.authority_id, l.fiscal_year, 'debt_burden_rise',
         case when l.value - p.value >= 0.10 then 'high'::kesef.alert_severity
              else 'notice'::kesef.alert_severity end,
         'עומס המלוות מן ההכנסה עלה מ-' || to_char(p.value*100, pct.f) ||
           '% בשנת ' || p.fiscal_year || ' ל-' || to_char(l.value*100, pct.f) ||
           '% בשנת ' || l.fiscal_year || ' — עלייה של ' ||
           to_char(round(l.value*100,1) - round(p.value*100,1), pct.f) || ' נקודות אחוז.',
         l.value, p.value, (l.value - p.value)*100,
         '/kesef/my#rules',
         jsonb_build_object(
           'metric_key', l.metric_key, 'rule', 'latest >= prev + 0.05',
           'years', jsonb_build_array(
             jsonb_build_object('year', p.fiscal_year, 'value', p.value),
             jsonb_build_object('year', l.fiscal_year, 'value', l.value)),
           'peer_median', l.peer_median, 'formula', l.formula,
           'source', 'kesef.metric_value'),
         not (l.value - p.value >= 0.10)
  from latest l
  join prev p on p.authority_id = l.authority_id and p.metric_key = l.metric_key
  cross join pct
  where l.metric_key = 'debt_burden_pct' and l.value >= p.value + 0.05

  union all
  -- גירעון שוטף מעל 5% מן ההכנסה בשנת הדוח האחרונה
  select l.authority_id, l.fiscal_year, 'deficit_current_high',
         case when l.value >= 0.10 then 'high'::kesef.alert_severity
              else 'notice'::kesef.alert_severity end,
         'הגירעון השוטף בשנת ' || l.fiscal_year || ' עמד על ' ||
           to_char(l.value*100, pct.f) || '% מן ההכנסה השנתית' ||
           case when l.peer_median is not null
                then ' (חציון קבוצת השווים: ' || to_char(l.peer_median*100, pct.f) || '%)'
                else '' end || '.',
         l.value, l.peer_median,
         case when l.peer_median is not null then (l.value - l.peer_median)*100 end,
         '/kesef/my#rules',
         jsonb_build_object(
           'metric_key', l.metric_key, 'rule', 'latest >= 0.05',
           'years', jsonb_build_array(
             jsonb_build_object('year', l.fiscal_year, 'value', l.value)),
           'peer_median', l.peer_median, 'formula', l.formula,
           'source', 'kesef.metric_value'),
         not (l.value >= 0.10)
  from latest l cross join pct
  where l.metric_key = 'deficit_current_pct' and l.value >= 0.05

  union all
  -- גירעון נצבר מעל 25% מן ההכנסה
  select l.authority_id, l.fiscal_year, 'deficit_accum_high',
         case when l.value >= 0.50 then 'high'::kesef.alert_severity
              else 'notice'::kesef.alert_severity end,
         'הגירעון הנצבר בשנת ' || l.fiscal_year || ' עמד על ' ||
           to_char(l.value*100, pct.f) || '% מן ההכנסה השנתית' ||
           case when l.peer_median is not null
                then ' (חציון קבוצת השווים: ' || to_char(l.peer_median*100, pct.f) || '%)'
                else '' end || '.',
         l.value, l.peer_median,
         case when l.peer_median is not null then (l.value - l.peer_median)*100 end,
         '/kesef/my#rules',
         jsonb_build_object(
           'metric_key', l.metric_key, 'rule', 'latest >= 0.25',
           'years', jsonb_build_array(
             jsonb_build_object('year', l.fiscal_year, 'value', l.value)),
           'peer_median', l.peer_median, 'formula', l.formula,
           'source', 'kesef.metric_value'),
         not (l.value >= 0.50)
  from latest l cross join pct
  where l.metric_key = 'deficit_accum_pct' and l.value >= 0.25;

  get diagnostics n = row_count;
  return jsonb_build_object('inserted', n, 'computed_at', now());
end $$;


-- חישוב מחדש עם הניסוח המתוקן.
select kesef.compute_metric_alerts();
