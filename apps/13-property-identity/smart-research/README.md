# מחקר חכם לנדל"ן — Smart Real-Estate Research

מנוע מחקר חכם המחשב עבור כל כתובת בישראל את **הפרמטרים הקובעים את מחיר הדירה**, על בסיס נתוני ממשלה חינמיים בלבד + שכבת העשרה ממקורות פתוחים (OpenStreetMap). פיצ'ר נפרד למשתמשים רשומים, מבודד בסכימת `nadlan` — ללא נגיעה בקוד/בטבלאות הקיימות.

> הפיצ'ר הקיים `nadlan-aggregates` ממשיך לעבוד ללא שינוי. כל הקוד החדש חי בסכימה מבודדת ובפונקציה נפרדת.

## מה מקבל משתמש חופשי
לכל כתובת מוחזרים הפרמטרים הקובעים את המחיר, כל אחד עם ערך, מקור וקישור:
שכר חציוני, בעלי תעודה אקדמית, מידת דתיות ודת דומיננטית, צפיפות אוכלוסייה, גיל חציוני, שיעורי בעלות/שכירות, פשיעה, מרחק לתחבורה/רכבת/מוסד חינוך/בית כנסת/מרכז מסחר, מספר בתי כנסת ברדיוס 500 מ', אחוז הצבעה והרכב סוציו-דתי (לפי בחירות), מחיר ממוצע בשכונה, מדד תשואה ומגמת מחירים — וכן **ציון כדאיות** (0-100) עם פירוט.

## דו"ח מפורט (לאחר הרשמה)
כפתור "מעוניין לקבל את המידע המפורט על כדאיות העסקה" → רישום פרטים בטבלת `research_leads` (insert-only) → ליד להנהלה + דו"ח דיגיטלי. לאחר המחקר מוצג **שאלון כדאיות רכישת דירה** (נשמר ב-`questionnaire_templates`, 6 מקטעים).

## ארכיטקטורה
- **Edge Function**: `nadlan-smart-research` (Deno, Supabase). קלט: `{"address":"..."}`. פלט: פרופיל מלא + `profile_id`. שומר ל-`nadlan.location_profiles` דרך service_role.
- `geo.ts` — גיאוקוד (GovMap autocomplete → deal-info; fallback לפי שם ישוב מ-CBS), המרות ITM/Web-Mercator→WGS84, haversine.
- `sources.ts` — מחברים למקורות: CKAN של data.gov.il + Overpass (OSM).
- `engine.ts` — `buildSmartProfile(address)`: גיאוקוד → זיהוי אזור → משיכה מקבילה מ-10 מקורות → בניית פרמטרים → חישוב ציון כדאיות.
- `index.ts` — HTTP handler + CORS + שמירה ל-DB.

## מקורות נתונים (חינמיים, ללא מפתח)
| פרמטר | מקור | Resource / API |
|---|---|---|
| סוציו-אקונומי | data.gov.il (למ"ס) | `7c860e04-9f8d-41c2-9f24-6249958d2081` (ישובים קטנים) |
| מפקד 2022 (שכר/דתיות/צפיפות/גיל/בעלות) | data.gov.il | `9a9e085f-3bc8-41df-b15f-be0daaf99e30` |
| פשיעה 2024 | משטרת ישראל / data.gov.il | `5fc13c50-b6f3-4712-b831-a75e0f91a17e` |
| תחנות תח"צ ורכבת | משרד התחבורה / data.gov.il | `e873e6a2-66c1-494f-a677-f5e77348edb0` |
| קואורדינטות מוסדות חינוך | משרד החינוך / data.gov.il | `5c5d6bb0-755d-470d-84b6-d7dd3135ba9c` |
| בחירות כנסת 25 (הרכב סוציו-דתי) | ועדת הבחירות / data.gov.il | `cc223336-07bc-485d-b160-62df92967c0a` |
| בתי כנסת / כבישים ראשיים / מרכזי מסחר | OpenStreetMap (Overpass) | `https://overpass-api.de/api/interpreter` |
| גיאוקוד | GovMap + api.nadlan.gov.il | autocomplete + deal-info |
| מחיר ממוצע/תשואה בשכונה | nadlan.gov.il | דרך הצינור הקיים |

הנחיות השפעת הפרמטרים ומקורות מלאים: ראו `../research_parameters_sources.md`.

## סכימת בסיס הנתונים (schema: `nadlan`)
`location_profiles` (פרופיל מחושב לכל כתובת + `parameters_full` jsonb + `score_breakdown` jsonb), `data_sources` (רישום מקורות), `localities`, `stat_areas`, `crime_stats`, `geo_pois`, `election_results`, `urban_renewal`, `research_leads` (insert-only), `questionnaire_templates`. מיגרציה: `../migration_smart_research.sql`.

## שימוש
```bash
curl -X POST "https://csjekrvukbdznetsrodj.supabase.co/functions/v1/nadlan-smart-research" \
  -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"address":"דיזנגוף 100 תל אביב"}'
```

## בדיקה מקומית
```bash
export PATH="$HOME/.deno/bin:$PATH"
deno run --allow-net smart/test_engine.ts "רגר 1 באר שבע"
```

## תוצאות בדיקה מאומתות (E2E, מול DB)
| כתובת | ישוב | פרמטרים | ציון | profile_id |
|---|---|---|---|---|
| רגר 1 באר שבע | 9000 | 14 | 60 | 1 |
| דיזנגוף 100 תל אביב | 5000 | 20 | 79 | 3 |
| הרצל 10 חיפה | 4000 | 17 | 77 | 4 |
| רבי עקיבא 50 בני ברק | 6100 | 18 | 56 | 5 |

## שלב ב' (בהמשך)
UI (Next.js) עם תצוגת פרמטרים חופשית, כפתור ליד, טופס הרשמה, שאלון וייצור דו"ח אוטומטי.

## עקרונות
שירותים חינמיים בלבד · נתוני ממשלה/מקורות פתוחים · ללא חשיפה משפטית · בידוד מלא מהקוד הקיים.
