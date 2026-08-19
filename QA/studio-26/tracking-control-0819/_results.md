# QA — 41 design-system / 26 studio — checklist item 4b-ii: בקרת `tracking` (letterSpacing)

תאריך: 19/08/2026

## ממצא לפני העריכה
נבדק מול הקוד לפני הבנייה (כמו בפריט 4b-i): בניגוד לתיאור בסעיף 4b-ii..vi
("כל אחד דורש שדה סכימה חדש + חיווט רינדור Konva ספציפי"), השדה
`letterSpacing` **כבר קיים** ב-`TextLayer` (`shared/layers.ts` שורה 40) וכבר
מחווט במלואו ברינדור Konva (`CanvasStage.tsx` שורות 64, 74-75, 95-96 —
`wrapText`, `useMemo` deps, ו-`<Text letterSpacing={layer.letterSpacing ?? 0}>`).
חסרה רק בקרת UI בפאנל השכבות — בדיוק כמו `opacity` בפריט 4b-i.

## מה נבנה
`Editor.tsx` (`TextLayerControls`): סליידר "מרווח אותיות" עם תג
`<code>letterSpacing</code>` (אותו דפוס תיוג כמו 4a/4b-i), טווח -5..30 step 0.5,
ממוקם אחרי סליידר "גודל" (fontSize) ולפני "יישור" — פאנל טקסט בלבד (השדה שייך
ל-`TextLayer`, לא ל-`BaseLayer`, כמו fontSize/align). `data-testid="slider-layer-tracking"`.
אין שינוי סכמה, אין שינוי רינדור/exporter — שימוש חוזר מלא בשדה ובחיווט הקיימים.

## אימות
`tsc --noEmit` נקי. `vite build` נקי (2165 מודולים). פריסה: `robocopy dist/public
→ _deploy/studio-more30/public/studio` → `vercel deploy --prod` → READY.

חי ב-`more30.com/studio` (Playwright, 1280×900, cache-buster `trk0819`):
1. עמוד הבית טוען תקין (0 רגרסיה).
2. נפתחה תבנית "שיעור — חסידי מלכותי", נבחרה שכבת טקסט מהפאנל.
3. הסליידר "מרווח אותיות letterSpacing: 0" מופיע בדיוק אחרי "גודל" ולפני "יישור".
4. הזזת הסליידר עד הקצה (30) עדכנה את התווית ל-"30" והרחיבה בפועל את המרווח
   בין האותיות בקנבס (השוואה חזותית מול שורת טקסט אחרת ללא שינוי) — צילום:
   `studio-tracking-slider-max-0819.png`.
5. 0 שגיאות קונסולה. שאר הבקרות באותה שכבה (עובי/גודל/יישור/fill/stroke/shadow/
   opacity) ללא שינוי ערך — אפס רגרסיה.
