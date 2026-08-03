-- ============================================================================
-- מחקר חכם לנדל"ן — סכימת פרמטרים קובעי מחיר (Smart Real-Estate Research)
-- סכימה מבודדת: nadlan  |  לא נוגע בשום טבלה קיימת ב-public
-- כל הנתונים ממקורות ממשלתיים חינמיים (data.gov.il, למ"ס, משרד התחבורה,
-- משטרת ישראל, מינהל התכנון) + העשרה בחיפוש חכם.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. קטלוג מקורות נתונים (לתיעוד provenance מלא — מאיזה מקור כל נתון)
-- ----------------------------------------------------------------------------
create table if not exists nadlan.data_sources (
  source_key    text primary key,               -- למשל 'cbs_socioeconomic', 'moc_census2022'
  title         text not null,                   -- שם מלא בעברית
  authority     text,                            -- הגוף (למ"ס / משרד התחבורה / משטרת ישראל)
  url           text,                            -- URL מדויק למקור
  access_type   text,                            -- 'ckan_api' / 'gtfs' / 'gis' / 'web'
  resource_id   text,                            -- resource_id ב-data.gov.il אם רלוונטי
  geo_resolution text,                           -- 'locality' / 'stat_area' / 'point' / 'polygon'
  last_updated  date,
  notes         text
);

comment on table nadlan.data_sources is 'קטלוג מקורות ממשלתיים חינמיים — provenance לכל פרמטר במחקר החכם';

-- ----------------------------------------------------------------------------
-- 2. יישובים — מפתח מרחבי ברמת יישוב (סמל למ"ס)
-- ----------------------------------------------------------------------------
create table if not exists nadlan.localities (
  locality_code   integer primary key,           -- סמל יישוב (למ"ס)
  name_he         text not null,
  name_en         text,
  regional_council text,
  socioeconomic_cluster integer,                  -- אשכול 1-10 (ESHKOL 2019) ברמת יישוב
  source_key      text references nadlan.data_sources(source_key),
  updated_at      timestamptz default now()
);

comment on table nadlan.localities is 'יישובים + אשכול חברתי-כלכלי (למ"ס resource 7c860e04)';

-- ----------------------------------------------------------------------------
-- 3. אזורים סטטיסטיים — רזולוציה עדינה (מפתח מרחבי מרכזי)
--    מפתח: locality_code + stat_area
-- ----------------------------------------------------------------------------
create table if not exists nadlan.stat_areas (
  stat_area_id    text primary key,              -- למשל '5000-123' (locality-statarea)
  locality_code   integer references nadlan.localities(locality_code),
  stat_area       text,                          -- מזהה אזור סטטיסטי
  name_he         text,
  -- דמוגרפיה (מפקד 2022, resource 9a9e085f)
  pop_approx      integer,                        -- אוכלוסייה מקורבת
  pop_density     numeric,                        -- צפיפות
  religion_he     text,                           -- דת דומיננטית
  age_median      numeric,
  age0_19_pcnt    numeric,
  age65_pcnt      numeric,
  dependency_ratio numeric,
  hh_religiosity  text,                           -- hh_MidatDatiyut_Name (מידת דתיות)
  employees_med_wage numeric,                     -- שכר חציוני שכירים
  acadm_cert_pcnt numeric,                        -- % בעלי תעודה אקדמית
  own_pcnt        numeric,                         -- % בעלות על דירה
  rent_pcnt       numeric,                         -- % בשכירות
  vehicle2up_pcnt numeric,
  parking_pcnt    numeric,
  raw_demographics jsonb,                          -- כל שדות המפקד הגולמיים
  demographics_source text references nadlan.data_sources(source_key),
  updated_at      timestamptz default now()
);

comment on table nadlan.stat_areas is 'אזורים סטטיסטיים — דמוגרפיה מפורטת (מפקד 2022) + מפתח לחיבור פשיעה/סוציו-אקונומי';

-- ----------------------------------------------------------------------------
-- 4. פשיעה לפי אזור סטטיסטי (משטרת ישראל, resource 5fc13c50 / e311b6a1)
--    מאוחסן כספירה מצרפית לפי אזור/שנה/רבעון
-- ----------------------------------------------------------------------------
create table if not exists nadlan.crime_stats (
  crime_id        bigserial primary key,
  locality_code   integer,
  yeshuv          text,
  stat_area_kod   text,
  stat_area_name  text,
  year            integer,
  quarter         integer,
  total_records   integer,                         -- מספר רשומות פשיעה (ספירה)
  by_group        jsonb,                            -- פילוח לפי StatisticGroup
  source_key      text references nadlan.data_sources(source_key),
  fetched_at      timestamptz default now()
);

create index if not exists idx_crime_locality on nadlan.crime_stats(locality_code, year);
create index if not exists idx_crime_statarea on nadlan.crime_stats(stat_area_kod, year);
comment on table nadlan.crime_stats is 'פשיעה מצרפית לפי אזור סטטיסטי (משטרת ישראל)';

-- ----------------------------------------------------------------------------
-- 5. נקודות עניין גאוגרפיות (POI) — תחנות תח"צ, בתי ספר, בתי כנסת וכו'
--    מאוחסן כנקודות WGS84 לחישוב מרחקים
-- ----------------------------------------------------------------------------
create table if not exists nadlan.geo_pois (
  poi_id          bigserial primary key,
  category        text not null,                   -- 'transit' / 'train' / 'school' / 'synagogue' / 'park' / 'commerce'
  subtype         text,                            -- 'תחנה רגילה' / 'רכבת ישראל' / 'ממלכתי' וכו'
  name_he         text,
  locality_code   integer,
  city_name       text,
  lat             numeric not null,
  lon             numeric not null,
  attrs           jsonb,                            -- מאפיינים נוספים ספציפיים לקטגוריה
  source_key      text references nadlan.data_sources(source_key),
  fetched_at      timestamptz default now()
);

create index if not exists idx_pois_category on nadlan.geo_pois(category);
create index if not exists idx_pois_locality on nadlan.geo_pois(locality_code, category);
create index if not exists idx_pois_latlon on nadlan.geo_pois(lat, lon);
comment on table nadlan.geo_pois is 'נקודות עניין (תחנות/בתי ספר/בתי כנסת/פארקים) לחישוב קרבה לנכס';

-- ----------------------------------------------------------------------------
-- 6. תוצאות בחירות לפי קלפי/יישוב (פרוקסי סוציו-דתי) — ועדת הבחירות (resource cc223336)
-- ----------------------------------------------------------------------------
create table if not exists nadlan.election_results (
  election_id     bigserial primary key,
  knesset         integer,                         -- מספר הכנסת (25, 24...)
  locality_code   integer,
  yeshuv          text,
  ballot_box      text,                            -- קלפי (null = מצרפי ברמת יישוב)
  eligible        integer,                         -- בזב
  voters          integer,                         -- מצביעים
  valid           integer,                         -- כשרים
  turnout_pcnt    numeric,
  party_votes     jsonb,                            -- {אמת: n, מחל: n, שס: n, ...}
  bloc_shares     jsonb,                            -- חלוקה לגושים סוציו-דתיים (מחושב)
  source_key      text references nadlan.data_sources(source_key),
  fetched_at      timestamptz default now()
);

create index if not exists idx_elections_locality on nadlan.election_results(locality_code, knesset);
comment on table nadlan.election_results is 'תוצאות בחירות (פרוקסי להרכב סוציו-דתי של האזור)';

-- ----------------------------------------------------------------------------
-- 7. מתחמי התחדשות עירונית (פינוי-בינוי / תמ"א) — GIS (הרשות להתחדשות עירונית)
--    מאוחסן כמרכז + מטא (הגאומטריה המלאה אופציונלית)
-- ----------------------------------------------------------------------------
create table if not exists nadlan.urban_renewal (
  renewal_id      bigserial primary key,
  name_he         text,
  status          text,                            -- 'מוכרז' / 'בתכנון' / 'בביצוע'
  locality_code   integer,
  city_name       text,
  program_type    text,                            -- 'פינוי-בינוי' / 'תמ"א 38'
  units_existing  integer,
  units_planned   integer,
  center_lat      numeric,
  center_lon      numeric,
  attrs           jsonb,
  source_key      text references nadlan.data_sources(source_key),
  fetched_at      timestamptz default now()
);

create index if not exists idx_renewal_locality on nadlan.urban_renewal(locality_code);
create index if not exists idx_renewal_latlon on nadlan.urban_renewal(center_lat, center_lon);
comment on table nadlan.urban_renewal is 'מתחמי התחדשות עירונית (מוסיף 40%-60% לשווי)';

-- ----------------------------------------------------------------------------
-- 8. פרופיל מיקום מחושב לכתובת — התוצר של המחקר החכם
--    מצרף את כל הפרמטרים לכתובת ספציפית + ציון כדאיות
-- ----------------------------------------------------------------------------
create table if not exists nadlan.location_profiles (
  profile_id      bigserial primary key,
  -- קלט המשתמש
  query_address   text not null,
  lat             numeric,
  lon             numeric,
  -- שיוך מרחבי
  locality_code   integer,
  locality_name   text,
  stat_area_id    text,
  neighborhood_id text,                            -- מזהה שכונה nadlan (לחיבור לאגרגטים הקיימים)
  settlement_id   text,
  -- פרמטרים חופשיים (מוצגים לכל משתמש, ללא עלות)
  socioeconomic_cluster integer,
  pop_density     numeric,
  age_median      numeric,
  religiosity     text,
  dominant_religion text,
  own_pcnt        numeric,
  acadm_cert_pcnt numeric,
  med_wage        numeric,
  crime_per_1000  numeric,                          -- מנורמל לאלף תושבים
  dist_transit_m  numeric,                          -- מרחק לתחנת תח"צ קרובה (מטר)
  dist_train_m    numeric,                          -- מרחק לרכבת קרובה
  dist_school_m   numeric,                          -- מרחק לבית ספר קרוב
  dist_synagogue_m numeric,
  near_urban_renewal boolean,                       -- מתחם התחדשות בטווח
  urban_renewal_dist_m numeric,
  election_bloc_shares jsonb,                        -- הרכב סוציו-דתי לפי בחירות
  -- אגרגטים ממחיר (מהמחבר הקיים)
  avg_price       numeric,
  index_yield     numeric,
  -- ציון כדאיות מחושב (0-100) + פירוט הגורמים
  opportunity_score numeric,
  score_breakdown jsonb,                             -- תרומת כל פרמטר לציון
  parameters_full jsonb,                             -- כל הפרמטרים הגולמיים + מקורות (provenance)
  is_deep_report  boolean default false,             -- true = דוח מעמיק שהופק אחרי lead
  computed_at     timestamptz default now()
);

create index if not exists idx_profiles_address on nadlan.location_profiles(query_address);
create index if not exists idx_profiles_locality on nadlan.location_profiles(locality_code);
create index if not exists idx_profiles_computed on nadlan.location_profiles(computed_at desc);
comment on table nadlan.location_profiles is 'פרופיל מיקום מחושב + ציון כדאיות — התוצר של המחקר החכם';

-- ----------------------------------------------------------------------------
-- 9. לידים (Leads) — פניות של משתמשים לדוח מעמיק
-- ----------------------------------------------------------------------------
create table if not exists nadlan.research_leads (
  lead_id         bigserial primary key,
  profile_id      bigint references nadlan.location_profiles(profile_id),
  full_name       text not null,
  phone           text,
  email           text,
  query_address   text,
  message         text,
  questionnaire   jsonb,                             -- תשובות שאלון רכישת הדירה
  status          text default 'new',                -- 'new' / 'contacted' / 'closed'
  report_generated boolean default false,
  report_url      text,
  created_at      timestamptz default now()
);

create index if not exists idx_leads_status on nadlan.research_leads(status, created_at desc);
comment on table nadlan.research_leads is 'פניות משתמשים רשומים לדוח מעמיק (lead capture)';

-- ----------------------------------------------------------------------------
-- 10. שאלון רכישת דירה — מבנה שאלות (נבנה מהפרמטרים הקובעים)
-- ----------------------------------------------------------------------------
create table if not exists nadlan.questionnaire_templates (
  template_id     bigserial primary key,
  version         text not null,
  title           text,
  questions       jsonb not null,                    -- מערך שאלות: {key, label, type, options, weight, param}
  active          boolean default true,
  created_at      timestamptz default now()
);

comment on table nadlan.questionnaire_templates is 'תבנית שאלון רכישת דירה (מבוסס פרמטרים קובעי מחיר)';

-- ----------------------------------------------------------------------------
-- הרשאות — כמו שאר סכימת nadlan (anon/authenticated/service_role)
-- ----------------------------------------------------------------------------
grant usage on schema nadlan to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema nadlan to service_role;
grant select on all tables in schema nadlan to anon, authenticated;
grant usage, select on all sequences in schema nadlan to anon, authenticated, service_role;

-- לידים: משתמשים יכולים להוסיף (טופs) אבל לא לקרוא של אחרים — service_role בלבד לקריאה
grant insert on nadlan.research_leads to anon, authenticated;
revoke select on nadlan.research_leads from anon, authenticated;

-- ----------------------------------------------------------------------------
-- זריעת קטלוג המקורות
-- ----------------------------------------------------------------------------
insert into nadlan.data_sources (source_key, title, authority, url, access_type, resource_id, geo_resolution, last_updated, notes) values
  ('cbs_socioeconomic', 'מדד חברתי-כלכלי (אשכול 2019) לפי יישוב', 'למ"ס / מערך הדיגיטל', 'https://data.gov.il/dataset/social_economic_cluster', 'ckan_api', '7c860e04-9f8d-41c2-9f24-6249958d2081', 'locality', '2023-10-14', 'אשכול 1-10'),
  ('moc_census2022', 'מפקד האוכלוסין והדיור 2022 — לפי אזור סטטיסטי', 'למ"ס', 'https://data.gov.il/dataset/2022', 'ckan_api', '9a9e085f-3bc8-41df-b15f-be0daaf99e30', 'stat_area', '2024-06-03', 'צפיפות, גיל, דת, שכר, בעלות'),
  ('police_crime2024', 'עבירות פליליות לפי אזור סטטיסטי 2024', 'משטרת ישראל', 'https://data.gov.il/dataset/crime_records_data', 'ckan_api', '5fc13c50-b6f3-4712-b831-a75e0f91a17e', 'stat_area', '2025-01-01', 'ספירת רשומות פשיעה'),
  ('mot_transit_stops', 'תחנות תחבורה ציבורית', 'משרד התחבורה', 'https://data.gov.il/dataset/bus_stops', 'ckan_api', 'e873e6a2-66c1-494f-a677-f5e77348edb0', 'point', '2026-07-01', 'Lat/Long כולל רכבת'),
  ('moe_school_coords', 'קואורדינטות מוסדות חינוך', 'משרד החינוך', 'https://data.gov.il/dataset/coordinates', 'ckan_api', '5c5d6bb0-755d-470d-84b6-d7dd3135ba9c', 'point', '2023-03-21', 'ITM + WGS84'),
  ('cec_knesset25', 'תוצאות בחירות לכנסת ה-25 לפי קלפי', 'ועדת הבחירות המרכזית', 'https://data.gov.il/dataset/votes-knesset', 'ckan_api', 'cc223336-07bc-485d-b160-62df92967c0a', 'ballot_box', '2024-11-27', 'פרוקסי סוציו-דתי'),
  ('urban_renewal_gis', 'מתחמי התחדשות עירונית', 'הרשות להתחדשות עירונית', 'https://govil.ai/datasets/1de95a22-576e-4e9c-b7c4-59db01d85290/', 'gis', null, 'polygon', '2026-04-01', 'פינוי-בינוי / תמ"א'),
  ('nadlan_gov', 'אתר הנדל"ן הממשלתי — עסקאות ואגרגטים', 'רשות המסים', 'https://www.nadlan.gov.il', 'web', null, 'address', null, 'מחיר, שטח, קומה, שנת בנייה'),
  ('street_list', 'רשימת רחובות בישראל', 'רשות האוכלוסין', 'https://data.gov.il/dataset/321', 'ckan_api', '9ad3862c-8391-4b2f-84a4-2d4c68625f4b', 'street', '2026-06-28', 'גיאוקודינג/שיוך')
on conflict (source_key) do update set
  title = excluded.title, url = excluded.url, resource_id = excluded.resource_id,
  last_updated = excluded.last_updated, notes = excluded.notes;
