# מערכת השוואת מחירים "בקלות" — ריפו עצמאי

> ⚠️ **ריפו נפרד ועצמאי.** ריפו זה (`bkalut-price`) הוא עותק עצמאי מלא של מערכת
> השוואת המחירים, שנוצר כדי לא לגעת בעבודת ה-CRM המתמשכת בריפו המקורי
> (`bkalut-app`, ענף `dev` של רבקה). שינויים כאן **אינם** משפיעים על הריפו של רבקה.

## מקורות נתונים (Supabase)

הפרויקט הפעיל בבעלות המשתמש:

| שדה | ערך |
| --- | --- |
| Project ID | `csjekrvukbdznetsrodj` |
| API URL | `https://csjekrvukbdznetsrodj.supabase.co` |
| Region | `eu-central-1` |

הגדר ב-`.env` (ראה `.env.example`):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (צד שרת)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (צד לקוח)

## מצב נתונים נוכחי (07/07/2026)

- **26 רשתות** פעילות עם חנויות
- **1,213 חנויות** (99.4% עם עיר)
- **116,761 מוצרים** (ברקוד = מפתח master)
- **~1,214,000 מחירים** — כולם רשמיים ומאושרים, 0 דמו

## רכיבי מערכת המחירים

- **קליטה**: `script/pc-import.ts` + `script/pc/adapters.ts` (אדפטרים לכל רשת)
- **שרת**: `server/price-comparison.ts` — לוגיקת השוואה וחיפוש
- **API**: `/api/pc/public/*` (catalog, search/advanced, compare/:barcode, filters)
- **לקוח**: `client/src/pages/public-price-comparison.tsx` (מסך ציבורי)
- **תזמון ייבוא**: `.github/workflows/pc-daily-import.yml` (יומי 01:00 UTC)

## חיפוש נתמך (4 מצבים)

1. לפי **שם מוצר**
2. לפי **ברקוד**
3. לפי **עיר**
4. לפי **שם חנות** (נוסף ב-PR #36)

## רשתות שעדיין ממתינות (חסימת רשת/הרשאה — לא באג קוד)

| רשת | ברקוד | חסם |
| --- | --- | --- |
| ויקטורי / מחסני השוק / ח.כהן (matrix) | 7290696200003 / 7290661400001 / 7290455000004 | תקלת DNS/רשת ב-VPS |
| נתיב החסד (web) | 7290058160839 | HTTP 500 מה-VPS |
| קוויק (publishprice) | 7291029710008 | ENOTFOUND מה-VPS |
| סופר-פארם | 7290172900007 | HTTP 492 anti-bot |
| מגה / קרפור | 7290055700007 | דורש סיסמת פורטל `PC_CERBERUS_PASSWORD_CARREFOUR` |
