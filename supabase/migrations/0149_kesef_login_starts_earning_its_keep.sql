-- 0149 — כסף (34): הכניסה עם חשבון more30 מתחילה להצדיק את עצמה
--
-- ‏מאז 0146 עמוד הבית מבטיח: "חשבון more30 ישמש בהמשך להתראות ולתיקים
-- שמורים". הסכימה תוכננה לזה מראש (app_user / watch / alert קיימות מ-0052,
-- ריקות עד היום), וה-backfill של 0148 סיפק את מה שהתראות באמת צריכות:
-- היסטוריית מדדים אמיתית (15,240 שורות metric_value, עד 5 שנות דוח לרשות).
-- הצעד הזה מחבר את השלושה: מעקב אחרי רשות מאחורי הכניסה הקיימת, והתראות
-- שנגזרות מהמדדים לפי כללים מוצהרים.
--
-- ‏עקרונות, זהים ל-0146/0147:
--   · הסכימה kesef אינה חשופה ל-PostgREST — כל גישה דרך RPC ב-public,
--     security definer עם search_path קבוע.
--   · אין נתונים מומצאים: התראה נושאת evidence עם השורות שמהן חושבה,
--     והניסוח עובדתי — מספרים ושנים, לא ייחוס אשמה.
--   · אין שליחות: ההתראות מוצגות במסך בלבד (watch.channel='screen').
--     שום מייל לא נשלח — אין כאן צינור שליחה בכלל.
--   · מה שאין — נאמר שאין: סמל לא מוכר חוזר not_found; קריאה בלי משתמש
--     מחובר חוזרת not_authenticated, לא שורה ריקה שנראית כמו "אין מעקבים".
--
-- ‏כללי ההתראות (מכוילים על הנתונים האמיתיים, 258 רשויות, latest מול השנה
-- הקודמת שנטענה; הספירות נמדדו לפני הקיבוע):
--   · arnona_collection_drop — גביית הארנונה מהשוטף ירדה ≥3 נק' אחוז (23
--     רשויות; ≥7 נק' = high, 8 רשויות).
--   · debt_burden_rise — עומס המלוות מן ההכנסה עלה ≥5 נק' אחוז (14; ≥10 = high, 6).
--   · deficit_current_high — גירעון שוטף ≥5% מן ההכנסה בשנת הדוח האחרונה (29; ≥10% = high).
--   · deficit_accum_high — גירעון נצבר ≥25% מן ההכנסה (20; ≥50% = high).
-- הכיוונים האלה הם בדיוק אלה שעמוד הדוח כבר סימן כ"מותרים לשיפוט עובדתי"
-- (good:'high'/'low'); מדדים נייטרליים לא מייצרים התראה.
--
-- ‏זכות תגובה (כלל שהסכימה עצמה אוכפת): הטריגר enforce_alert_publication מ-0052
-- אוסר לפרסם ממצא ברמת high לפני שחלפו 14 יום מיידוע הרשות. מאחר שאין עדיין
-- הליך יידוע (ולא שולחים כלום), ממצאי high נשמרים is_public=false — קיימים,
-- ספורים, אך לא מתפרסמים; ממצאי notice מתפרסמים מייד. הכלל מוצהר גם במסך
-- (/kesef/my#rules), לא רק נאכף במסד.

-- מעקב כפול הוא באג ולא מצב: אכיפה במסד, לא רק בלוגיקת ה-toggle.
create unique index if not exists watch_user_target_uidx
  on kesef.watch (user_id, target_type, target_ref);

-- ---------------------------------------------------------------------------
-- מנוע ההתראות: נגזר-מחדש מכל היסטוריית המדדים, אידמפוטנטי (מוחק ומחשב).
-- פנימי בלבד — אין grant ל-anon/authenticated; רץ במיגרציה ואחרי כל טעינה.
-- ---------------------------------------------------------------------------
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
           to_char((p.value - l.value)*100, pct.f) || ' נקודות אחוז.',
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
           to_char((l.value - p.value)*100, pct.f) || ' נקודות אחוז.',
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

revoke all on function kesef.compute_metric_alerts() from public;

-- ---------------------------------------------------------------------------
-- מעקב: הוספה/הסרה בלחיצה אחת. דורש משתמש מחובר (חשבון more30 הקיים).
-- ---------------------------------------------------------------------------
create or replace function public.kesef_watch_toggle(p_symbol int)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'kesef'
as $$
declare
  uid uuid := auth.uid();
  aid uuid;
  removed boolean := false;
begin
  if uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select a.id into aid from kesef.authority a where a.symbol = p_symbol;
  if aid is null then
    return jsonb_build_object('error', 'not_found', 'symbol', p_symbol);
  end if;

  -- המשתמש קיים במערכת ההזדהות של הפלטפורמה; כאן רק שיקוף מקומי כדי
  -- שה-FK של watch יחזיק. אימייל הוא NOT NULL בסכימה — למשתמש בלי claim
  -- כזה (עתידי) נשמר מזהה במקום, לא מומצאת כתובת של מישהו אחר.
  insert into kesef.app_user (id, email, display_name)
  values (
    uid,
    coalesce(nullif(auth.jwt() ->> 'email', ''), uid::text || '@no-email.more30'),
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name',
             auth.jwt() -> 'user_metadata' ->> 'username'))
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, kesef.app_user.display_name);

  delete from kesef.watch
  where user_id = uid and target_type = 'authority' and target_ref = p_symbol::text;
  if found then removed := true; end if;

  if not removed then
    insert into kesef.watch (user_id, target_type, target_ref, channel)
    values (uid, 'authority', p_symbol::text, 'screen')
    on conflict (user_id, target_type, target_ref) do nothing;
  end if;

  return jsonb_build_object('symbol', p_symbol, 'watching', not removed);
end $$;

revoke all on function public.kesef_watch_toggle(int) from public;
grant execute on function public.kesef_watch_toggle(int) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- המעקב שלי: הרשויות שבמעקב, המדדים האחרונים שלהן וההתראות הציבוריות.
-- אותה צורת metrics כמו kesef_authorities_compare — distinct-on-latest,
-- כדי ששני המסכים ימשיכו להסכים זה עם זה כשייטענו שנים נוספות.
-- ---------------------------------------------------------------------------
create or replace function public.kesef_my_watchlist()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'kesef'
as $$
  select case when auth.uid() is null then
    jsonb_build_object('error', 'not_authenticated')
  else
    jsonb_build_object(
      'watches', coalesce((
        select jsonb_agg(jsonb_build_object(
          'symbol', a.symbol, 'name', a.name_he, 'status', a.status,
          'district', a.district, 'population', a.population,
          'population_year', a.population_year,
          'socio_cluster', a.socio_economic_cluster,
          'watched_at', w.created_at,
          'metrics', (
            select coalesce(jsonb_object_agg(m.metric_key, jsonb_build_object(
              'fiscal_year', m.fiscal_year, 'value', m.value,
              'peer_median', m.peer_median, 'national_median', m.national_median,
              'delta_vs_peer_pct', m.delta_vs_peer_pct
            )), '{}'::jsonb)
            from (
              select distinct on (mv.metric_key) mv.*
              from kesef.metric_value mv
              where mv.authority_id = a.id
              order by mv.metric_key, mv.fiscal_year desc
            ) m
          ),
          'alerts', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'rule_key', al.rule_key, 'severity', al.severity,
              'fiscal_year', al.fiscal_year, 'statement_he', al.statement_he,
              'measured_value', al.measured_value,
              'reference_value', al.reference_value,
              'delta_pct', al.delta_pct, 'evidence', al.evidence
            ) order by al.severity desc, al.rule_key), '[]'::jsonb)
            from kesef.alert al
            where al.authority_id = a.id and al.is_public
          )
        ) order by w.created_at)
        from kesef.watch w
        join kesef.authority a on a.symbol::text = w.target_ref
        where w.user_id = auth.uid() and w.target_type = 'authority'
      ), '[]'::jsonb),
      'generated_at', now())
  end;
$$;

revoke all on function public.kesef_my_watchlist() from public;
grant execute on function public.kesef_my_watchlist() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ההתראות הציבוריות של רשות אחת — לפאנל "ממצאים אוטומטיים" בעמוד הדוח.
-- פתוח גם ל-anon: ההתראות נגזרות מדוחות מבוקרים ציבוריים והן is_public.
-- ---------------------------------------------------------------------------
create or replace function public.kesef_authority_alerts(p_symbol int)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'kesef'
as $$
  select case when a.id is null then
    jsonb_build_object('error', 'not_found', 'symbol', p_symbol)
  else
    jsonb_build_object(
      'authority', jsonb_build_object('symbol', a.symbol, 'name', a.name_he),
      'alerts', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'rule_key', al.rule_key, 'severity', al.severity,
          'fiscal_year', al.fiscal_year, 'statement_he', al.statement_he,
          'measured_value', al.measured_value,
          'reference_value', al.reference_value,
          'delta_pct', al.delta_pct, 'methodology_url', al.methodology_url,
          'evidence', al.evidence
        ) order by al.severity desc, al.rule_key), '[]'::jsonb)
        from kesef.alert al
        where al.authority_id = a.id and al.is_public
      ),
      'generated_at', now())
  end
  from (select 1) one
  left join kesef.authority a on a.symbol = p_symbol;
$$;

revoke all on function public.kesef_authority_alerts(int) from public;
grant execute on function public.kesef_authority_alerts(int) to anon, authenticated, service_role;

-- חישוב ראשון — על הנתונים שכבר נטענו.
select kesef.compute_metric_alerts();
