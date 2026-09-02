# נדל"ן ברגע — מסמך מסירה מלא ל-Claude Code
### מבית מור מערכות תוכנה · תעודת זהות דיגיטלית לכל נכס בישראל

> **למי שקורא (Claude Code):** זהו פרויקט Next.js מלא שכבר קיים ומוכן ברובו על המחשב.
> המשימה שלך: להשלים, לדחוף ל-GitHub, לפרוס לאוויר, ולכייל את חיבורי ה-API הממשלתיים
> מול השרת החי. אל תשנה את מבנה הנתונים ללא צורך. עיצוב אפשר לשפר. **אין נתוני דמה** —
> כשאין מקור, מציגים "לא זמין", לא ממציאים.

---

## 0. איפה הקוד
```
C:\Users\USER\Downloads\nadlan-berega
```
פרויקט Next.js 14 (App Router) + TypeScript + Tailwind (RTL) + Recharts + Supabase.
עבר בדיקת קוד סטטית — עובר `npm run build` (לא נבדק בהרצה כי לא הייתה סביבת ריצה).

### מבנה הקבצים
```
app/
  layout.tsx              # מסגרת RTL, מיתוג, header/footer (print:hidden)
  page.tsx                # דף בית + חיפוש
  globals.css
  property/page.tsx       # עמוד "תעודת זהות" (searchParams.q)
  sources/page.tsx        # מקורות ותמחור + מנויים
  request/page.tsx        # טופס בקשת מסמך (טאבו/רמי/היתרים)
  api/profile/route.ts    # אגרגטור ראשי — מרכיב פרופיל נכס מכל המקורות
  api/agent/route.ts      # סוכן AI — מנסח דוח מקיף מהפרופיל
  api/request/route.ts    # שמירת בקשת מסמך ל-Supabase
components/
  SearchBar.tsx  PropertyIdCard.tsx  RequestForm.tsx  ui.tsx
lib/
  types.ts sources.ts format.ts store.ts score.ts
  govmap.ts nadlan.ts cbs.ts xplan.ts datagov.ts hitchadshut.ts
  environment.ts rental.ts tabu.ts agent.ts
.env.local  .env.example  README.md  CONNECTIONS.html  HANDOFF_CLAUDE_CODE.md
```

---

## 1. הבקאנד — Supabase (כבר הוקם ופעיל)
- **Project ref:** `uhnrgujbdxhhmoxcjria`
- **URL:** `https://uhnrgujbdxhhmoxcjria.supabase.co`
- **anon key (פומבי, בטוח):**
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw`
- **service_role key:** להעתיק מ-Supabase Dashboard → Project Settings → API (סוד — לא בגיט).
- **סכימה:** `nadlan` (כבר נחשפה ל-REST). טבלאות: `properties`, `transactions`, `property_layers`,
  `rental_data`, `sources_registry` (מאוכלסת), `report_exports`, `document_requests`. RLS פעיל
  (קריאה ציבורית + insert לבקשות; כתיבה דרך service_role).
- **מרשם מקורות מרכזי:** הטבלה `nadlan.sources_registry` היא "המערכת ששומרת את כל ה-API" —
  לכל מקור: endpoint, is_paid, auth_type, env_var, status, dataset_id.

---

## 2. משתני סביבה (env)
צור `.env.local` (וגם הזן ב-Railway/Vercel). מה שידוע כבר מלא; מפתחות סוד — להשלים.
```
SUPABASE_URL=https://uhnrgujbdxhhmoxcjria.supabase.co
SUPABASE_ANON_KEY=<anon מלמעלה>
SUPABASE_SERVICE_KEY=<מהדשבורד — חובה לאחסון/קאשינג>
CBS_HOUSING_INDEX_ID=120010
XPLAN_BASE=https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/Xplan/MapServer
DATAGOV_TRANSPORT_RESOURCE=e873e6a2-66c1-494f-a677-f5e77348edb0
DATAGOV_RENEWAL_RESOURCE=        # ראה סעיף 4 (Shapefile — עדיף GovMap WFS)
DATAGOV_SCHOOLS_RESOURCE=        # מאגר ארצי לזיהוי
DATAGOV_CRIME_RESOURCE=e311b6a1-be5a-4a82-8298-f3afbee07b6b   # אופציונלי — קוד כבר עם ברירת מחדל זהה, לדריסה כשמתפרסם מאגר שנה חדשה
DATAGOV_CRIME_YEAR=2025          # אופציונלי — שנת המאגר שלמעלה, לתיוג התצוגה
AI_PROVIDER=anthropic
AI_API_KEY=                      # אופציונלי — מפעיל ניסוח AI מלא
```

---

## 3. סטטוס חיבורי API
| מקור | סטטוס | הערה |
|---|---|---|
| GovMap (כתובת→גוש/חלקה/ITM) | מחובר בקוד | `lib/govmap.ts` — es.govmap TldSearch + WFS PARCEL_ALL |
| כרמ"ן / נדל"ן.gov (עסקאות) | מחובר בקוד | `lib/nadlan.ts` — POST GetDataByQuery + GetAssestAndDeals |
| למ"ס (מדד) | מחובר, לאמת | `CBS_HOUSING_INDEX_ID` — לאמת מזהה סדרה |
| XPLAN (תכנון) | מחובר בקוד | `lib/xplan.ts` — ArcGIS REST |
| data.gov תחבורה | מחובר | resource `e873e6a2-...` |
| התחדשות עירונית | דורש WFS | dataset `gis_urban_renewal` הוא Shapefile → סעיף 4 |
| בתי ספר | חסר מאגר ארצי | לזהות resource טבלאי ארצי |
| טאבו / רמ"י | בתשלום, אין API ציבורי | טופס בקשה + קישור רשמי בנוי |
| חריגות (רישוי זמין) | סגור | דגל "חשד" + הפניה ידנית |
| סוכן AI | מוכן, טעון מפתח | `AI_API_KEY` |

---

## 4. מה להשלים (משימות פיתוח)
1. **⚠️ GovMap דורש אימות TOKEN (נבדק בפועל — זו הסיבה מס' 1 שחיבור הגיאוקוד לא עובד):**
   קריאת שרת נאיבית ל-GovMap מוחזרת ריקה. יש לממש שני שלבים: (A) בקשת auth → token;
   (B) geocode/search-and-locate עם ה-token בכותרת. תיעוד:
   `https://api.govmap.gov.il/docs/javascript-functions/search-and-locate` (כתובת→גוש/חלקה),
   `https://api.govmap.gov.il/docs/intro`. לאיתור ה-endpoints המדויקים: לפתוח govmap.gov.il,
   לבצע חיפוש, ולהעתיק מ-DevTools→Network את בקשת ה-auth ובקשת ה-geocode + הכותרות.
   חלופה: גיאוקוד דרך מאגר כתובות data.gov.il/Nominatim → המרה ל-ITM (proj4) → קדסטר WFS.
   **דרישת המשתמש:** כל רחוב+מספר חייב להזדהות לגוש/חלקה מדויק; תת-חלקה — מטאבו בלבד.
2. **כיול נדל"ן/למ"ס:** גם הם עשויים לדרוש כותרות (User-Agent/Referer). לאמת מול הפלט החי
   ולהתאים ב-`lib/nadlan.ts`, `lib/cbs.ts`. בדיקה: `GET /api/profile?q=הרצל 42 תל אביב`.
2. **דיוק גיאוקוד:** לוודא שכל רחוב+מספר מזוהה לגוש/חלקה. **תת-חלקה** (דירה בבית משותף) אינה
   זמינה חינם — מגיעה מטאבו; יש להוסיף שדה "מספר דירה" ולסמן שתת-חלקה מאומתת רק עם נסח.
3. **התחדשות דרך GovMap WFS:** להחליף את שאילתת ה-CKAN בשכבת WFS של מתחמי פינוי-בינוי
   (point-in-polygon מול נקודת ITM) ב-`lib/hitchadshut.ts`.
4. **למ"ס:** לאמת `CBS_HOUSING_INDEX_ID` מול `api.cbs.gov.il/index/data/price`.
5. **בתי ספר:** לזהות resource ארצי טבלאי (datastore) ולהזין `DATAGOV_SCHOOLS_RESOURCE`.
6. **טאבו/רמ"י פרימיום:** כשיש מפתח ספק — לחבר ב-`lib/tabu.ts` (מסומן `is_paid` במערכת).
7. **עיצוב (אופציונלי):** מותר לשפר עיצוב/UX (אפשר להיעזר ב-Lovable **לעיצוב בלבד, לא למבנה הנתונים**).

---

## 5. פריסה לאוויר (Deploy)
### GitHub
```bash
cd "C:\Users\USER\Downloads\nadlan-berega"
git init
git add .
git commit -m "נדל\"ן ברגע — MVP + backend"
git branch -M main
git remote add origin https://github.com/l023131500-ops/more.30.com.git
git push -u origin main
```
(`.env.local` לא נדחף — הוא ב-.gitignore.)

### Railway (מומלץ — https://railway.com)
1. New Project → Deploy from GitHub repo → בחר `nadlan-berega`.
2. Variables → הזן את כל משתני הסביבה מסעיף 2 (כולל `SUPABASE_SERVICE_KEY`).
3. Deploy. Next.js מזוהה אוטומטית (`npm run build` / `npm start`).
4. Settings → Networking → Generate Domain, או חבר תת-דומיין `nadlan.more30.com` (CNAME).
   **חשוב:** שירות חדש ונפרד — לא לגעת בשירותים הקיימים של more30.

---

## 6. פיצ'רים קיימים (לוודא שעובדים אחרי פריסה)
- חיפוש כתובת → תעודת זהות 7 שכבות (משפטי, תכנוני, שווי, פיזי, סביבה, השבחה, מסמכים).
- כל שדה עם מקור + תאריך + סימון "בתשלום".
- גרף היסטוריית מחיר למ"ר + טבלת עסקאות (היסטוריה רב-שנתית).
- **דו"ח איכות עסקה** (ציון + GO/בזהירות/NO-GO מקלט מחיר מבוקש).
- **דוח AI מקיף** (`/api/agent`).
- **בחירת שכבות להורדה** + ייצוא PDF (הדפסה).
- **טופס בקשת מסמך** (`/request`) למקורות בלי API + קישורים רשמיים תקינים
  (טאבו: gov.il/he/service/land_registration_extract · רמ"י: gov.il/he/service/rights-approval-request).
- עמוד **מקורות ותמחור** + מודל מנויים (חינם / Pro / עסקי-API).

---

## 7. בדיקות קבלה (Acceptance)
- [ ] `npm run build` עובר.
- [ ] `/api/profile?q=<כתובת אמיתית>` מחזיר גוש/חלקה + עסקאות + מדד.
- [ ] עמוד הנכס מציג נתונים חיים, ומקורות שלא נטענו מופיעים כ"לא זמין" (בלי דמה).
- [ ] `/request` שומר בקשה ל-`nadlan.document_requests`.
- [ ] פרוס עם דומיין פעיל.

בהצלחה — הבסיס איתן; נשאר לחבר לשרת חי, לכייל, ולפרוס.
