# 30 CRM זכויות — Lighthouse + תיקון landmark-one-main

`/crm` מפנה ל-`/crm/auth`. הרצה ראשונה (`scripts/qa/lighthouse-run.mjs`, מובייל,
production): perf 85 · a11y 98 · bp 77 · seo 100.

**הליקוי האמיתי היחיד:** `landmark-one-main` — מסך הכניסה
(`apps/30-zchuyotpro-crm/src/routes/auth.tsx`) עטף את כל התוכן ב-`<div>` יחיד;
`__root.tsx` לא מוסיף `<main>` בשום מקום בעץ (Outlet ישיר תחת QueryClientProvider).

**מה נכתב.** `auth.tsx`: ה-`<div dir="rtl" className="min-h-screen ...">` החיצוני
הוחלף ל-`<main dir="rtl" className="...">` (אותם attributes, בלי שינוי עיצוב).

**בנייה ופריסה.** `vite build` מקומי — ✓ ללא שגיאות. פריסה **ממקור**
(`vercel deploy --prod --yes`, לא `--prebuilt` — כפי שכבר תועד ב-`crm-favicon-0817`:
ה-nitro/vercel preset של TanStack Start לא כולל rewrites מ-`vercel.json` ב-config
שנוצר, ו-`--prebuilt` היה שובר את ה-rewrite הקיים של `/crm/assets/*`).
`dpl_7TzQnaeBF9WJyjXU51VgsCAfULQj`, READY.

**אימות.**
- `GET https://more30.com/crm/auth?cachebust=0817main` → `200`, HTML מכיל `<main`.
- הרצה חוזרת של Lighthouse על `/crm`: perf 85→89 · **a11y 98→100** · bp 77 · seo 100.

שאר הליקויים שנשארו מתחת ל-90 (`mainthread-work-breakdown`, `redirects`
מ-`/crm`→`/crm/auth`, `unused-javascript` וכו') הם ביצועים בלבד — לא נחקרו כעת.
