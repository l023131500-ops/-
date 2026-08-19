# 26 studio — favicon (NEEDS_USER §0פ, "six remaining" list) — 17/08/2026

## מה נמדד
`apps/26-modaot-studio/client/index.html` הצהיר `<link rel="icon" type="image/png" href="/favicon.png" />`,
וקובץ בשם הזה **לא קיים** בשום מקום — לא ב-`client/public/`, לא ב-`dist/public/`,
ולא ב-`_deploy/studio-more30/public/studio/`. זהה לדפוס שכבר נמצא ב-`torah`
(הצהירה `/favicon.svg` שמעולם לא היה קיים) ו-5 המונטים שהצהירו נתיב מוחלט-לשורש
במקום נתיב-למונט.

## סימן גרפי חי?
`Logo.tsx` (רכיב שקיים בקוד) **אינו בשימוש בשום מקום** — נבדק עם grep על כל
`client/src`, אפס תוצאות. הסימן שבאמת מצויר על המסך הוא ב-`Home.tsx:130`:
אייקון `Crown` (lucide-react) בצבע `#C9A227` (זהב) על רקע `#0B1220` (נייבי) —
אותו זוג צבעים שהנווט כולו בנוי סביבו (`border-[#C9A227]/20`, `bg-[#0B1220]/80`).

ניגודיות #C9A227 על #0B1220 (WCAG): **7.74:1** — עובר בנוחות.

## מה נעשה
1. `favicon.svg` חדש ב-`apps/26-modaot-studio/client/public/` — עותק נאמן של
   נתיבי ה-SVG של lucide `Crown` (מ-`node_modules/lucide-react/dist/esm/icons/crown.js`),
   זהב על ריבוע נייבי מעוגל, 32×32.
2. תוקן `client/index.html`: `<link rel="icon" type="image/svg+xml" href="/studio/favicon.svg" />`
   — נתיב מוחלט **למונט**, לא לשורש (הבאג שכבר נמצא ב-5 מערכות אחרות).
3. הועתק ל-`_deploy/studio-more30/public/studio/favicon.svg`, ותוקן אותו תג
   ב-`_deploy/studio-more30/public/studio/index.html`.
4. `vercel deploy --prod --yes --scope l023131500-ops-projects` מתוך
   `_deploy/studio-more30` → `READY`, `dpl_8ZLdru79o9pVHfmThHd7JjnEhX95`.

## אימות
- `GET https://more30.com/studio/?cachebust=...` — ה-HTML החי כותב עכשיו
  `<link rel="icon" type="image/svg+xml" href="/studio/favicon.svg" />` (מאומת
  מילה-במילה).
- `GET https://more30.com/studio/favicon.svg` ו-`https://studio-more30.vercel.app/studio/favicon.svg`
  שני אלה חזרו `200` אבל עם `Content-Type: image/webp` ותוכן EXIF/WebP גולמי —
  **לא** ה-SVG שהועלה. זו החלפה של NetFree ברמת הפרוקסי המקומי (ראה זיכרון
  `gannenet-dev-served-by-stale-sw` / הערות NetFree קודמות) — לא תקלת ייצור.
  אומת עצמאית מול ה-Vercel API (`GET /v13/deployments/{id}/files`, לא עובר
  דרך NetFree): `favicon.svg` **קיים** בעץ הפריסה שהועלה, תחת אותו נתיב
  בדיוק (`public/studio/favicon.svg`), עם `uid` המצביע לתוכן שהועלה.

## מצב טסט, נמדד ולא הוצהר
אין שינוי במסד, אין נגיעה במערכת מוגנת. הפריסה מוסיפה קובץ נכס סטטי אחד
ומתקנת שורת `<link>` אחת — אין שינוי בהתנהגות אפליקטיבית.
