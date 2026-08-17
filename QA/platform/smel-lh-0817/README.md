# smel-lh-0817 — 12 נדל"ן Smel: Lighthouse ראשון + 2 ליקויי נגישות אמיתיים תוקנו

המשך ישיר לסבב סריקת הלילה 17/08 (`fix/nadlan-a11y`, אחרי 02/04/06/10 —
הבא בסדר `#` בטבלת SYSTEMS_STATUS שעוד לא נמדד): `smel`(12) עוד לא נמדד
ב-Lighthouse אף פעם. הרצתי
`node scripts/qa/lighthouse-run.mjs QA/platform/smel-lh-0817 smel` מול
`https://more30.com/smel` החי.

## תוצאה (לפני → אחרי)
פרפורמנס **73→80** · נגישות **92→100** · Best Practices **77** · SEO **100**.

`failedAudits` חשף שני ליקויי נגישות אמיתיים (`lh-detail.mjs` על כל אחד
בנפרד, כדי לדעת איזה DOM node ולא רק את שם הבדיקה):

### 1. `color-contrast` — `.gold-text` בהיר מדי במצב אור
`apps/12-smel-ndln/client/src/index.css` — `hsl(43 62% 45%)` נתן **2.78:1**
מול הרקע הבהיר (#ba922c על #fbfaf8) — מתחת ל-AA (4.5:1 לטקסט מודגש 18px).
זו הקלאס שמצייר "NDLN"/"לפני שקונים" בזהב בדף הבית. הועבר ל-`32%` בהירות
(`hsl(43 62% 32%)`) — נבדק בסקריפט נפרד (`hslToRgb`+יחס ניגודיות WCAG):
**5.06:1**. אותו גוון בדיוק, רק כהה מספיק. מצב כהה לא נגע — הוא כבר עבר.

### 2. `link-name` — קישור "פרימיום" בהדר, ריק וב-tab order במובייל
`apps/12-smel-ndln/client/src/components/Header.tsx` — ה-`<Button
className="hidden sm:inline-flex">` היה בתוך `<Link href="/premium">`.
wouter v3 עוטף ילד שאינו `<a>` ב-`<a>` משלו (כמו הלוגו למעלה, שכבר תועד
בקוד). ה-`hidden` היה על ה-Button בלבד — כך שב-viewport מובייל (Lighthouse
מודד mobile) ה-`<a>` עצמו נשאר גלוי מבחינת ה-DOM, ניתן למיקוד, ובלי טקסט
נראה בכלל: "Element is in tab order and does not have accessible text".
הועבר ה-`hidden sm:inline-flex` מה-Button ל-Link עצמו — עכשיו כל הקישור
(כולל השם הנגיש שלו) מוסתר יחד במובייל, לא רק התוכן הפנימי.

## פריסה ואימות
`npm run build` (vite, מ-`apps/12-smel-ndln`) → `index-DKNGwr_X.js` /
`index-DzPZCg3g.css` (השתנו כי הקוד/CSS השתנו — לא היה עותק קודם לזהות
מולו). הועתק ל-`_deploy/smel-more30/smel/` (קבצי ה-hash הישנים נמחקו
בשמם המפורש). `vercel deploy --prod --yes --scope
l023131500-ops-projects` מ-`_deploy/smel-more30` —
`dpl_F2oruq6kdtoxTBNMAoRZ8q3KZqQE`, READY, alias `smel-more30.vercel.app`.

אומת חי: `Invoke-WebRequest https://more30.com/smel?cachebust=0817smel`
מכיל `index-DKNGwr_X` ולא `index-BzxcokTm` (הבנדל הקודם). `lh-detail.mjs`
מחדש נגד הכתובת החיה: `color-contrast` score 1, `link-name` score 1 —
שניהם "no failing nodes reported". מדידה מלאה חוזרת: נגישות 92→100.

## נשאר פתוח (לא נחקר בסבב הזה)
פרפורמנס 80 (מתחת לסף 90) ו-Best Practices 77 — תואם דפוס
NetFree/`third-party-cookies` שכבר מתועד ב-32/10/06/04/02. לא עבודה חדשה
כאן.

## מצב טסט / מוגן
שינוי תצוגה בלבד ב-`apps/12-smel-ndln` (מערכת 12, לא מוגנת). אין נגיעה
במסד/לידים/שליחה. Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב
כקובץ `_heartbeat-pending.sql`.
