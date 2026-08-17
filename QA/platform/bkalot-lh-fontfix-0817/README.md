# bkalot-lh-fontfix-0817 — 10 בקלות: תוקן שורש הפרפורמנס (Google Fonts render-blocking) — פרטים

המשך ישיר ל-`bkalot-lh-0817` (dbb7a57, אותו סבב) — שם כבר זוהה `render-blocking-insight`
(חיסכון משוער 1,210ms) ברשימת ה-`failedAudits`, אותו דפוס בדיוק שכבר תוקן ב-01/02/03/04/06/32:
`apps/10-bkalot-rights/index.html` טען Heebo + Frank Ruhl Libre דרך
`<link href="fonts.googleapis.com/css2?...">` סינכרוני ב-`<head>`.

## התיקון
תבנית `loadCSS` הסטנדרטית (זהה לתיקון ב-04/06, שני אתרים סטטיים בלי build):
`<link rel="preload" as="style">` + `<link rel="stylesheet" media="print" onload="this.media='all'">`
+ `<noscript>` גיבוי. הוחל גם ב-`apps/10-bkalot-rights/index.html` (מקור) וגם ב-
`_deploy/bkalot-more30/bkalot/index.html` (עותק הפריסה) — `Compare-Object -Encoding UTF8`
אישר שהשניים זהים אחרי ההעתקה.

גיליון סגנון שני (`bkalot-theme.css`, אחסון Supabase) נשאר סינכרוני ולא נגעתי בו —
מחוץ לדפוס המתועד, לא נחקר בסבב הזה.

## פריסה ואימות
`vercel deploy --prod --yes --scope l023131500-ops-projects` מתוך `_deploy/bkalot-more30`
(`dpl_HEiYsuhoK6GLeigmURmQFUf8ff6w`), READY, alias `bkalot-more30.vercel.app`. אומת חי:
`more30.com/bkalot/?cachebust=0817bkalotfont` — גם `rel="preload" as="style"` וגם
`media="print" onload="this.media='all'"` מופיעים ב-HTML המוגש.

## נמדד אחרי
פרפורמנס **82→69**, נגישות 100/BP 77 ללא שינוי, SEO 91→100 (רעש מדידה, לא קשור לשינוי —
כמו ב-04 imud). `render-blocking-insight` ירד מ-1,210ms ל-330ms חיסכון משוער (השתפר, לא נעלם —
הגיליון השני שלא טופל). ה-FCP/LCP/SI כולם השתפרו (3.1s→2.7s / 3.1s→2.9s / 7.2s→4.2s) אבל
`mainthread-work-breakdown` עלה (5.9s→7.6s) ו-TBT נכנס לרשימת הכשלים (770ms) — לא היה שם קודם.
ציון כולל ירד למרות שיפור ב-3 מדדי הצבע העיקריים: תואם את דפוס הרעש המתועד כבר ב-06 בריאות
("84-93 noisy") ו-32 נדל"ן (`mainthread-work-breakdown` תלוי-רשת/NetFree) — לא נחקר כרגרסיה
אמיתית בסבב הזה. ראיות: `QA/platform/bkalot-lh-0817/_lighthouse.json` (לפני, perf 82) ·
`QA/platform/bkalot-lh-fontfix-0817/_lighthouse.json` (אחרי, perf 69).

Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

הבא בסבב-2 (פרפורמנס, בסדר המערכות): `smel` (הבא ברשימת `ROUTES` אחרי `bkalot`
ב-`scripts/qa/lighthouse-run.mjs`).
