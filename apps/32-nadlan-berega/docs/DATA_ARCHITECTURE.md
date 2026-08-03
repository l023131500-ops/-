# ארכיטקטורת דיוק מקסימלי — נדל"ן ברגע
### מסמך נתונים · גרסה 1.0 · יולי 2026

> נכתב מתוך "הצעת דיוק מקסימלי" (5 השלבים). כל שדה נושא מקור, תאריך, רמת ביטחון
> וסוג מקור. **עקרון-על: אין נתוני דמה. מקור שלא זמין → "לא זמין".**

## עקרונות
1. **מפתח אחיד** לכל נכס: גוש/חלקה/תת-חלקה + נקודת ITM (EPSG:2039).
2. **כל שדה** נושא: `value · source · date · confidence · source_type · isPaid`.
3. **שקיפות זיהוי**: לכל תוצאת גיאוקוד מסומן המקור (govmap/nominatim) והאם אומת.
4. **הפרדת דיוק**: נתון ברמת הנכס (חלקה) מופרד מנתון אזורי (רחוב/עיר).
5. **מדורג לפי תשלום**: מקור פתוח = חינם; מקור סגור/ספק = מסלול בתשלום (מתויג, לא מחויב).

## שלב א — זיהוי ומקורות (מיושם)

### 1. גיאוקוד דו-שכבתי (עם סימון מקור)
| שכבה | מקור | Token? | הערה |
|---|---|---|---|
| ראשי | GovMap autocomplete (`www.govmap.gov.il/api/search-service/autocomplete`) | ❌ לא | רמת בניין, מדויק |
| גיבוי | Nominatim/OSM → ITM → קדסטר WFS | ❌ לא | קהילתי; `?geo=free` כופה אותו |
| קדסטר | GovMap GeoServer `opendata:Parcels_ITM` (point-in-polygon) | ❌ לא | גוש/חלקה סופי |

ה-API הרשמי של GovMap (`api.govmap.gov.il`, token) **לא בשימוש**: הוא נעול-דומיין
ומיועד לצד-לקוח (referrer-locked) — לא מתאים לקריאת שרת; רישום דרך אימייל; תמחור
מסחרי לא מפורסם. שני המסלולים הקיימים חינמיים לחלוטין וללא רישום.

### 2. מקורות רשמיים חינמיים מחוברים
| מקור | endpoint | סטטוס |
|---|---|---|
| עסקאות (כרמ"ן) | `govmap.gov.il/api/real-estate/*` | ✅ חי |
| מדד למ"ס | `api.cbs.gov.il/index/data/price?id=40010` | ✅ חי |
| תכנון XPLAN | `ags.iplan.gov.il/arcgisiplan/.../Xplan/MapServer/4` | ✅ חי |
| התחדשות | `services6.arcgis.com/.../GIS_UrbanRenewal/FeatureServer/1` | ✅ חי |
| סביבה (בתי ספר/תחבורה) | data.gov.il → מטמון `nadlan.poi` | ✅ חי |
| MAVAT (זכויות כמותיות) | הוראות תכנית לפי pl_number | ⬜ שלב ב |

### 3. סכימת שדה (SourcedValue)
```
{ label, value, status, sourceKey, sourceType, confidence, lastUpdated, isPaid, costIls, requiresTier, note }
```
- **source_type**: `official` (ממשלתי) · `community` (OSM) · `computed` (חישוב שלנו) ·
  `paid` (ספק/סגור) · `pending` (טרם חובר).
- **confidence**: `high` / `medium` / `low` — לכל שדה, לא רק לשכבה.
- **requiresTier**: `free` / `premium` / `vip` — לתיוג מסלול בתשלום.

### 5. מסלולי מנוי (תשתית, ללא חיוב)
- Supabase Auth (email/password) + טבלת `nadlan.subscribers` (user → tier).
- **free**: כל המקורות הפתוחים (זיהוי, עסקאות, מדד, תכנון, סביבה, התחדשות).
- **premium**: מחקר מקיף + דוח AI + חישובים (תשואה/מס) — `requiresTier='premium'`.
- **vip / paid**: טאבו, אישור רמ"י, תת-חלקה, חריגות — `sourceType='paid'`, `requiresTier='vip'`.

## שלבים הבאים
- **שלב ב**: MAVAT (זכויות בנייה כמותיות), פשיעה (אזור סטטיסטי), שכ"ד (Yadata/למ"ס).
- **שלב ג**: חישובי VIP (תשואה, מס רכישה/שבח, משכנתא, תזרים).
- **שלב ד**: חיבור ספק טאבו/רמ"י (pass-through בתשלום).
