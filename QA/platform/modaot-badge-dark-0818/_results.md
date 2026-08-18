# 03 מודעות (modaot) — סבב-3 נגישות: תג "1/2/3" בלתי-קריא במצב כהה

המשך סבב-3 (`contrast-probe.mjs`) אחרי torah(01) → הבא לפי `ROUTES`
(`scripts/qa/lighthouse-run.mjs`): modaot(03). מול `https://more30.com/modaot`
במצב כהה: 3 כשלים זהים — `rgb(200, 214, 238)` (בהיר) על `rgb(201, 168, 76)`
(זהב), 1.56:1, נדרש 3:1 — עיגולי המספרים "1"/"2"/"3" בסקציית "איך זה עובד".

**השורש** ב-`apps/03-igud-ads/app/(public)/page.tsx:66`: `text-brand-dark`
על `bg-brand-goldsurface`. `brand-goldsurface` הוא משטח קבוע (`#C9A84C`, לא
מתהפך בין מצבים — ראו ההערה ב-`globals.css:10-14`), אבל `brand-dark` הוא
טוקן-דיו שכן מתהפך: `14 27 54` (נייבי כהה) בבהיר → `200 214 238` (בהיר) בכהה.
בדיוק אותה מלכודת שכבר תועדה ותוקנה ב-`.btn-gold` (`globals.css:98-101`,
"`text-brand-darksurface` ולא `text-brand-dark`: הכפתור יושב על זהב קבוע") —
אבל התג המספרי בעמוד הבית לא עקב אחרי אותו כלל.

**התיקון:** `text-brand-dark` → `text-brand-darksurface` (משטח-דיו קבוע,
לא מתהפך) על שלושת התגים.

**נבדק גם:** ריצת ה-probe במצב בהיר על אותו עמוד החזירה רשימת "כשלים" ארוכה
(טקסט לבן על רקע קרם) — **false positive של הכלי, לא באג אמיתי**: ל-`<main>`
יש `bg-gradient-to-b from-brand-blue to-brand-dark` (רקע-גרדיאנט אמיתי, נייבי
כהה), אבל `contrast-probe.mjs` קורא רק `background-color` המחושב ולא
`background-image`, ולכן מדלג על הגרדיאנט וממשיך לטפס עד `<body>` (קרם).
אומת ישירות: `getComputedStyle(main).backgroundImage` =
`linear-gradient(rgb(26, 46, 90), rgb(14, 27, 54))` — נייבי אמיתי, טקסט לבן
עליו בניגודיות תקינה. לא תוקן (מגבלת כלי, לא קוד ייצור) — לציין אם נבדקות
עוד מערכות עם `bg-gradient-*` על אלמנט-עטיפה.

אומת: `next build` נקי. נפרס `vercel deploy --prod` מתוך `apps/03-igud-ads`
(`modaot-more30`, `dpl_9TPLrFZFFXds5yfS3zcGZTSSD7Gp`, READY, aliased). אומת חי
עם cache-buster: `contrast-probe.mjs` במצב כהה על `/modaot` — 3 כשלים ← 0.
צילום: `modaot-dark-after.png`.
