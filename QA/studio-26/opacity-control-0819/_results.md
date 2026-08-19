# QA — 26 studio (modaot-studio): בקרת opacity (item 4b-i) — 19/08/2026

## מה נבדק
`CHECKLIST/graphics.md` שלב 1 פריט 4b — "בקרות חדשות ל-6 המונחים החסרים".
קריאת קוד (Explore agent, read-only) לפני נגיעה במנוע הראתה ש-`opacity`
שונה מהותית מ-5 המונחים האחרים: השדה כבר קיים ב-`BaseLayer`
(`shared/layers.ts:23`) וכבר מחווט ברינדור Konva לטקסט/צורה/דקורציה
(`CanvasStage.tsx`) — רק `ImageNode` לא קרא אותו, ובקרת UI לא הייתה
קיימת בכלל לאף סוג שכבה. פוצל 4b ל-4b-i..vi; בוצע `opacity` בלבד.

## מה נוסף
- `CanvasStage.tsx`: `opacity={layer.opacity ?? 1}` נוסף לשני ה-`<Group>`
  של `ImageNode` (פלייסהולדר + תמונה טעונה) — 2 שורות בלבד.
- `Editor.tsx`: סליידר גנרי אחד ("שקיפות `opacity`: X") מחוץ לענפי
  `text`/`image` הספציפיים, פועל על כל שכבה נבחרת דרך
  `handleChangeLayer(selectedLayer.id, {opacity: v})` הקיים — ללא שכפול
  קוד בין `TextLayerControls` לפאנל התמונה.
- אין שינוי ב-`exporter.ts` — אומת בקוד לפני העריכה ש-PNG/PDF נובעים
  ישירות מ-`stage.toDataURL()` על ה-stage החי, אז שקיפות Konva נאפית
  אוטומטית לפיקסלים בייצוא.

## איך נבדק
Playwright, 1280×900, `more30.com/studio` (production, cache-buster):
1. נפתחה תבנית "שיעור — חסידי מלכותי" קיימת.
2. נבחרה שכבת תמונה (`תמונת הרב`) — הסליידר הופיע, ערך התחלתי 1.
   הורדה ל-0.79 (מקלדת) — הערך המוצג התעדכן בפועל
   (`studio-opacity-before.png` / `studio-opacity-after-image-layer-0.79.png`).
3. נבחרה שכבת טקסט (כותרת "שיעור בפנימיות התורה") — סליידר עצמאי
   התאפס ל-1 עבור השכבה החדשה (לא "דלף" מהשכבה הקודמת). הורדה ל-0.1 —
   הכותרת דהתה חזותית בבירור בקנבס
   (`studio-opacity-text-faded-0.1.png`).
4. שאר בקרות הטקסט (פונט/עובי/גודל/יישור/`fill`/`stroke`/`shadow`/`blur`)
   נבדקו — נשארו ללא שינוי, שום ערך לא נדרס.
5. `browser_console_messages` בכל שלב — 0 הודעות (לא רק 0 שגיאות).

## תוצאה
0 שגיאות קונסולה לאורך כל הסבב. הבקרה עובדת לשני סוגי השכבות שנבדקו
(טקסט, תמונה) עם ערך עצמאי per-layer. שאר הפאנלים/שכבות/גלריה/רקע/קופי
ללא שינוי — אפס רגרסיה.

## לא נבדק (מחוץ לסקופ)
- ייצוא PNG/PDF בפועל עם שכבה שקופה-חלקית (לא הורד קובץ ולא נפתח —
  ה-exporter נקרא ישירות מה-stage, כפי שאומת בקוד, אך לא צולם).
- שכבות `shape`/`decoration` (כבר מחווטות קודם ב-`CanvasStage.tsx`,
  לא נגעתי בהן — לא נבדקו מחדש כי אין להן פאנל-מאפיינים ייעודי היום).

## נשאר לפריט 4b (ii–vi)
`blend`/`tracking`/`leading`/`kerning`/`corner-radius` — כל אחד דורש
שדה סכימה חדש (בניגוד ל-`opacity` שכבר היה קיים) + חיווט רינדור Konva
ייעודי. סבבים נפרדים, אחד בכל פעם.

## פריסה
`vite build` (`base:"/studio/"`, 2165 מודולים, נקי) →
`_deploy/studio-more30/public/studio` (api/ ללא שינוי) →
`dpl_F88UA5Xm5QqGF8mKaDmTsmHshL9J`, READY, aliased `studio-more30.vercel.app`.
