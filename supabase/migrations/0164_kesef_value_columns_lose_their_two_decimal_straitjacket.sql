-- Historical record only -- do not re-run. Originally authored as supabase/migrations/0145_kesef_value_columns_lose_their_two_decimal_straitjacket
-- (renumbered because 0145/0146/0150 collided with unrelated nadlan-pro migrations already
-- merged at those numbers on this branch lineage; see core.issues #290). Already applied live
-- against the hub project's kesef schema on 2026-08-02 -- verified 2026-09-04 by confirming the
-- RPCs/tables it creates (kesef_authority_report, kesef_authorities_compare, kesef_my_watchlist,
-- kesef_watch_toggle, kesef_authority_alerts, kesef.fact_financial/app_user/watch/alert) exist
-- live on project uhnrgujbdxhhmoxcjria.

-- 0145 — עמודות הערך של כסף משתחררות משתי ספרות אחרי הנקודה
--
-- ‏fact_financial.value היה numeric(18,2) — מידה שנתפרה לאלפי ש"ח, אבל הדוחות
-- המבוקרים נושאים גם יחסים טהורים (אחוז גביה 0.854048…), ששתי ספרות מעגלות
-- ל-0.85 — כלומר המסך היה מציג "85.0%" במקום "85.4%". אותו דבר בעמודות
-- האחוזונים של metric_value (סקלה 4) וב-delta_vs_peer_pct (סקלה 2).
-- ‏numeric חופשי לא מאבד דבר ולא עולה דבר.
--
-- נתפס לפני שפורסם ולו מדד אחד: הטעינה הראשונה של 24/08 נמדדה, נמצאה מעוגלת,
-- נמחקה (truncate) ונטענה מחדש במלוא הדיוק אחרי ההרחבה הזו.
--
-- ‏שתי תצוגות-המפה (ריקות עד שיהיה מיפוי coa) תלויות בעמודה ולכן נזרקות
-- ונבנות מחדש מילה במילה.

drop view if exists kesef.v_authority_year_summary;
drop view if exists kesef.v_topic_spending;

alter table kesef.fact_financial alter column value type numeric;
alter table kesef.metric_value
  alter column value type numeric,
  alter column peer_median type numeric,
  alter column peer_p25 type numeric,
  alter column peer_p75 type numeric,
  alter column national_median type numeric,
  alter column delta_vs_peer_pct type numeric;

create view kesef.v_authority_year_summary as
 select a.symbol, a.name_he, f.fiscal_year,
    sum(f.value) filter (where c.flow = 'receipt' and f.measure = 'actual') as total_income,
    sum(f.value) filter (where c.flow = 'payment' and f.measure = 'actual') as total_expense,
    a.population,
    count(distinct f.source_document_id) as source_doc_count
   from kesef.fact_financial f
     join kesef.authority a on a.id = f.authority_id
     left join kesef.chart_of_accounts c on c.code = f.coa_code
  where f.superseded_by is null
  group by a.symbol, a.name_he, f.fiscal_year, a.population;

create view kesef.v_topic_spending as
 select a.symbol, a.name_he, f.fiscal_year, c.topic,
    sum(f.value) filter (where f.measure = 'actual') as actual,
    sum(f.value) filter (where f.measure = 'budget') as budget,
    a.population
   from kesef.fact_financial f
     join kesef.authority a on a.id = f.authority_id
     join kesef.chart_of_accounts c on c.code = f.coa_code
  where f.superseded_by is null and c.topic is not null
  group by a.symbol, a.name_he, f.fiscal_year, c.topic, a.population;

-- אינדקסים שהטעינה הוכיחה שחסרים: מחיקה/עדכון על self-FK בלי אינדקס = ריבועי.
create index if not exists fact_financial_superseded_by_idx
  on kesef.fact_financial (superseded_by) where superseded_by is not null;
create index if not exists fact_financial_authority_year_idx
  on kesef.fact_financial (authority_id, fiscal_year, sheet_name);
