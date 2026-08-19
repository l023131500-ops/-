# CHECKLIST — מערכת הגרפיקה (`feat/graphics-upgrade`)

נבנה לפי `DESIGN_SYSTEM_BUILD_v2.md` + סקר קוד קיים (19/08/2026). כל שורה
פיצ'ר אחד, שלם, לפי חוק הצ'ק-ליסט במסמך המקור: "מערכת אינה מוכנה עד שכל שורה
בנויה + אומתה בצילום מסך". סבב = הפיצ'ר הלא-בנוי הבא, אחד בכל פעם.

**המנוע הקיים ("HTML/CSS/SVG→PDF, עברית מושלמת") = `apps/26-modaot-studio`,
חי ב-`more30.com/studio`.** אסור למחוק/לפשט אותו בשום סבב — ראה
[DECISIONS.md](../DECISIONS.md) #1. `more30.com/design` הוא שכבה נוספת שמצביעה
אליו, לא תחליף.

---

## שלב 1 — הליבה: מנוע + Brand Kit + מילון פרמטרים + ספריית פונטים

- [x] **1. עמוד-בית של מערכת העיצוב ב-`more30.com/design`** — Brand Kit חי
      (9 צבעים עם hex+תפקיד), 4 מפרטי טיפוגרפיה, טבלת מילון פרמטרים (13 מונחים),
      כרטיס "המנוע" עם קישור ל-`/studio`, רשימת "בדרך" (AI/מתאמים/סטודיו).
      נבנה: `apps/41-design-system/` (מקור) → `_deploy/design-more30/` (פריסה,
      פרויקט Vercel `design-more30`) → rewrite חדש ב-`portal/vercel.dist.json`.
      אומת: `more30.com/design` = 200, `/design/style.css` = 200 עם
      `Content-Type: text/css` אמיתי (לא HTML של הפורטל — ראה מלכודת ה-base-href
      התקדימית), `lang=he dir=rtl`, h1 יחיד, 0 תמונות בלי alt, 0 גלישה אופקית
      ב-390px, אפס חפיפה בין כפתור הכניסה לניווט (נמדד עם shadowRoot).
      `/studio` ו-`more30.com/` עדיין 200 אחרי הפריסה (אפס רגרסיה).
      צילומים: `design-desktop.png`, `design-mobile.png`,
      `studio-regression-check.png` (בתיקיית העבודה, לא ב-git — ארטיפקט QA).
- [x] **2. כפתור כניסה משותף מלא + פוטר "חלק מ-more30"** — `auth-button.js`
      טעון ב-`/design` (`index.html` שורה 203), והפוטר "חלק מ-more30" קיים
      ומקושר ל-`more30.com/` (שורה 198). נוסף `['design', '/design']` ל-`ROUTES`
      ב-`scripts/qa/authbutton-overlap.mjs` (הסקריפט הפלטפורמי הרשמי) והורץ:
      `design clear @ 390,834,1100,1280,1440` וגם `studio clear @ 390,834,1100,1280,1440`
      (אפס רגרסיה — `/studio` עדיין נקי אחרי ההוספה).
- [x] **3. ספריית פונטים עברית עשירה בשכבת הרינדור** — נבדק מול הקוד (לא רק
      תיאור): לעורך של `/studio` (`shared/styles.ts` FONTS, `FontControl.tsx`)
      כבר היה בורר-סגנון אחד עשיר (16 פונטים) שכולל בתוכו את כל הסט המורחב של
      `apps/04-imud-torani/pagedRender.ts` (12 פונטים) פרט לאחד — Cardo. הוסף.
      `server/fonts/*.ttf` (6 קבצים) נמצאו לא-מקושרים לשום קוד — לא היו חלק
      מאסטרטגיית טעינה חיה בפועל, בניגוד לתיאור בסעיף. פרטים: DECISIONS.md #9-11.
- [x] **4a. תיוג התוויות הקיימות בשמות הטכניים האחידים** — נבדק מול הקוד: מתוך
      10 המונחים ברשימת הסעיף (fill/stroke/opacity/blend/tracking/leading/
      kerning/corner-radius/shadow/blur), רק 4 קיימים כבקרה אמיתית בפאנל השכבות
      של `Editor.tsx` היום — צבע טקסט/רקע (`fill`), צבע+עובי מתאר (`stroke`),
      צבע+טשטוש צל (`shadow`/`blur`). כל 4 התוויות תויגו בקוד-בג' (`<code>`)
      עם השם הטכני, זהה למונח בטבלת `/design#params`. אומת חי ב-`more30.com/studio`
      דרך Playwright: פתיחת עורך מתבנית קיימת, בחירת שכבת טקסט — 6 התוויות
      (צבע טקסט/צבע מתאר/עובי מתאר/צבע צל/טשטוש צל/צבע הרקע) מציגות את
      התג הטכני הנכון, 0 שגיאות קונסולה, שאר הפאנל (פונט/גודל/יישור/שכבות/
      קנבאס) ללא שינוי. צילום: `studio-params-panel-0819.png`.
- [x] **4b-i. בקרת `opacity`** — נבדק מול הקוד לפני העריכה: מתוך 6 המונחים
      החסרים, `opacity` **כבר היה קיים** ב-`BaseLayer` (`shared/layers.ts`)
      וכבר מחווט ברינדור ה-Konva לטקסט/צורה/דקורציה (`CanvasStage.tsx`) —
      חסרה רק בקרת UI, ושכבת **תמונה** לבדה לא קראה את השדה. תוקן: נוסף
      `opacity={layer.opacity ?? 1}` לשני ה-`<Group>` של `ImageNode`
      (פלייסהולדר + תמונה טעונה), ונוספה בקרת סליידר גנרית אחת ב-`Editor.tsx`
      (מחוץ לענף `text`/`image` הספציפי — פועלת על כל שכבה נבחרת דרך
      `handleChangeLayer`, כי `opacity` הוא שדה של `BaseLayer`) עם תג
      `<code>opacity</code>` באותו דפוס מסעיף 4a. ה-exporter (`exporter.ts`)
      קורא ישירות מה-stage החי (`stage.toDataURL()`) — אין נתיב ייצוא נפרד
      לתקן. אומת חי ב-`more30.com/studio` (Playwright, cache-buster): נבחרה
      שכבת תמונה (`תמונת הרב`) — סליידר ירד מ-1 ל-0.79, הערך המוצג התעדכן;
      נבחרה שכבת טקסט (כותרת) — סליידר עצמאי (התאפס ל-1 עבור השכבה החדשה),
      הורדה ל-0.1 הביאה לדהייה חזותית ברורה של הכותרת בקנבס (צילום:
      `studio-opacity-text-faded.png`). כל שאר הבקרות (פונט/עובי/גודל/יישור/
      fill/stroke/shadow/blur) נשארו ללא שינוי באותה שכבה — אפס רגרסיה. 0
      שגיאות קונסולה. פריסה: `vite build` → `_deploy/studio-more30/public/studio`
      → `vercel deploy --prod`, READY (`dpl_F88UA5Xm5QqGF8mKaDmTsmHshL9J`).
- [x] **4b-ii. בקרת `tracking` (letterSpacing)** — נבדק מול הקוד לפני הבנייה:
      בניגוד לתיאור שהיה בסעיף הזה, השדה `letterSpacing` **כבר קיים**
      ב-`TextLayer` וכבר מחווט במלואו ברינדור Konva (`CanvasStage.tsx`) —
      בדיוק כמו `opacity` בפריט 4b-i. חסרה רק בקרת UI. נוסף סליידר "מרווח
      אותיות" עם תג `<code>letterSpacing</code>` בפאנל הטקסט (`Editor.tsx`,
      אחרי "גודל" ולפני "יישור"), טווח -5..30. אין שינוי סכמה/רינדור.
      אומת חי ב-`more30.com/studio` (Playwright): הזזת הסליידר ל-30 הרחיבה
      בפועל את המרווח בין האותיות בקנבס, 0 שגיאות קונסולה, שאר הבקרות ללא
      שינוי — אפס רגרסיה. ראיות: `QA/studio-26/tracking-control-0819/_results.md`,
      `studio-tracking-slider-max-0819.png`.
- [x] **4b-iii. בקרת `leading` (lineHeight)** — נבדק מול הקוד לפני הבנייה:
      בדיוק כמו `opacity`/`tracking`, השדה `lineHeight` **כבר קיים**
      ב-`TextLayer` וכבר מחווט במלואו ברינדור Konva (`CanvasStage.tsx` —
      `wrapText`, deps, `<Text lineHeight=...>`). חסרה רק בקרת UI. נוסף
      סליידר "מרווח שורות" עם תג `<code>lineHeight</code>` בפאנל הטקסט
      (`Editor.tsx`, אחרי "מרווח אותיות" ולפני "יישור"), טווח 0.8..2.5.
      אין שינוי סכמה/רינדור. אומת חי ב-`more30.com/studio` (Playwright):
      מאחר שהכותרת המקורית שורה אחת (אין הבדל פיקסלים ב-lineHeight לבד),
      הוקלד זמנית טקסט ארוך יותר לאותה שכבה (מצב קנבס בצד הלקוח בלבד,
      לא נשמר — לא נלחץ "שמור פרויקט") כדי לגלוש לשתי שורות: lineHeight=2.5
      → מרווח רחב וגלוי בין השורות; lineHeight=0.8 (מינימום) → אותו טקסט
      נגלש ל-3 שורות צפופות. מוכיח חיווט Konva אמיתי, לא רק עדכון מספר.
      0 שגיאות קונסולה, שאר הבקרות (פונט/עובי/גודל/tracking/יישור/fill/
      stroke/shadow/opacity) ושאר הפאנלים ללא שינוי — אפס רגרסיה. ראיות:
      `QA/studio-26/leading-control-0819/_results.md`,
      `studio-leading-wrap-max-0819.png`, `studio-leading-wrap-min-0819.png`.
      פריסה: `vite build` → `_deploy/studio-more30` (public + adapter) →
      `vercel deploy --prod`, READY (`dpl_7ZwFzWWdEhWmwcb6MrGsNohf7sav`).
- [x] **4b-iv. בקרת `corner-radius`** — נבדק מול הקוד לפני הבנייה: בדיוק כמו
      `opacity`/`tracking`/`leading`, השדה `cornerRadius` **כבר קיים**
      ב-`ImageLayer`/`ShapeLayer` (לא `DecorationLayer` כפי שנכתב בטעות בסעיף
      הקודם — נבדק ישירות מול `shared/layers.ts`) וכבר מחווט במלואו ברינדור
      Konva (`CanvasStage.tsx`: placeholder rect שורה 129, `KImage` שורה 156,
      `ShapeNode` rect שורה 165). חסרה רק בקרת UI. נוסף סליידר "רדיוס פינות"
      עם תג `<code>cornerRadius</code>` (`Editor.tsx`, אחרי סליידר השקיפות
      הכללי, מוצג לשכבות `image`/`shape`), טווח 0–100. אין שינוי סכמה/רינדור.
      אומת חי ב-`more30.com/studio` (Playwright, cache-buster): נבחרה שכבת
      "תמונת הרב" — הסליידר הזיז את הערך המוצג 0→100→0 כראוי, 0 שגיאות
      קונסולה, שאר הבקרות (שקיפות/פונט/עובי/tracking/leading/fill/stroke/
      shadow) ושאר הפאנלים ללא שינוי — אפס רגרסיה.
      **מגבלה ידועה, לא רגרסיה:** בכל תבניות שיעורי-התורה החיות היום שכבת
      התמונה מוגדרת `circle: true` (חיתוך עגול לתמונת הרב) — וב-`ImageNode`
      השדה `circle` גובר על `cornerRadius` בכוונה (קוד קיים, לא נוצר עכשיו:
      שורות 126-127 ו-156). לכן לשכבה הזו הסליידר משנה מצב אך לא פיקסל על
      הקנבס — אותה תופעה קיימת כבר בנתוני תבנית `שיעור — מלכות` שיש בה
      `cornerRadius: 130` על שכבת `rabbiPhoto` (`circle: true`) שמעולם לא
      השפיע חזותית. שכבות `shape` (למשל `topicCard`) קיימות ברינדור אבל
      מסוננות מפאנל השכבות (`text`/`image` בלבד) ו-`listening: false`
      בקנבס — לא ניתנות לבחירה כלל היום. הוכחה חזותית מלאה תדרוש תמונה
      לא-עגולה או חשיפת שכבות `shape` לבחירה — לסבב נפרד אם רלוונטי.
- [x] **4b-v. בקרת `blend`** — בניגוד ל-`opacity`/`tracking`/`leading`/
      `cornerRadius`, השדה `blend` **לא היה קיים** — נבנה מהיסוד: שדה
      `blend?: string` חדש ב-`BaseLayer` (`shared/layers.ts`, חל על כל 4 סוגי
      השכבות), וחיווט Konva אמיתי (`globalCompositeOperation`) בכל נתיבי
      הרינדור ב-`CanvasStage.tsx` — `TextNode`, שני ה-`Group` של `ImageNode`
      (פלייסהולדר + תמונה טעונה), `common` של `ShapeNode` (rect/circle/line),
      ושלושת ה-`Group` של `DecorationNode` (מסגרות, עיטור פינה, עיטורים
      כלליים). נוסף `<Select>` גנרי ב-`Editor.tsx` (אחרי סליידר השקיפות, לפני
      `cornerRadius`) עם 16 מצבי מיזוג (Canvas composite modes סטנדרטיים:
      multiply/screen/overlay/darken/lighten/color-dodge/color-burn/
      hard-light/soft-light/difference/exclusion/hue/saturation/color/
      luminosity + "רגיל") ותג `<code>blend</code>`, תואם למונח בטבלת
      `/design#params` ("מיזוג"). `tsc --noEmit` נקי, `vite build --base=/studio/`
      נקי (2165 מודולים). אומת חי ב-`more30.com/studio` (Playwright,
      cache-buster, 1280×900): נבחרה שכבת הכותרת "הרב יואל שפיגליץ שליט\"א",
      בורר המיזוג הופיע עם 16 אפשרויות, בחירת "הבדל (difference)" שינתה
      בפועל את הצבע הנראה של הטקסט על הקנבס (מנווי כהה לגוון בהיר-זהוב,
      תוצאת difference-blend אמיתית מול הרקע הלבן) — לא רק עדכון ערך. 0
      שגיאות קונסולה. שאר הבקרות (letterSpacing/lineHeight/יישור/fill/
      stroke/shadow/opacity) ושאר הפאנלים ללא שינוי — אפס רגרסיה. פריסה:
      `_deploy/studio-more30/public/studio` (build חדש, `api/` ללא שינוי) →
      `vercel deploy --prod`, `dpl_2XeokCRKmjyHj41GFZqrjVCbtdXk`, READY.
- [x] **4b-vi. בקרת `kerning`** — נבנה מהיסוד (בניגוד ל-4b-i..iv שהשדה כבר היה
      קיים): שדה `kerning?: boolean` חדש ב-`TextLayer` (`shared/layers.ts`
      + עותק `vercel-adapter/api/_lib/shared/layers.ts`, ברירת מחדל `true` =
      זהה להתנהגות הקיימת). מנוע Konva לא חושף `fontKerning` כבקרה מובנית —
      נעטף ה-`sceneFunc` של `<Text>` ב-`CanvasStage.tsx`: `context.setAttr(
      "fontKerning", kerning===false ? "none" : "normal")` ואז קריאה מלאה
      ל-`KonvaTextShape.prototype._sceneFunc` המקורי (import ממוקד
      `konva/lib/shapes/Text`, לא נגעתי בייבוא `Konva` הגנרי הקיים ל-טיפוסים
      כדי לא לשבור טיפוסי `Konva.Stage` בקובץ) — כל היגיון העטיפה/יישור/קווים
      המקורי רץ ללא שינוי, רק מאפיין context אחד נוסף. נוסף `<Switch>` בפאנל
      הטקסט (`Editor.tsx`, אחרי lineHeight) עם תג `<code>kerning</code>`.
      `tsc --noEmit` נקי, `vite build --base=/studio/` נקי (2168 מודולים).
      **אומת חי** ב-`more30.com/studio` (Playwright, cache-buster, 1280×1400):
      הוקלד זמנית טקסט לטינית עם זוגות-קרנינג מובהקים ("AVATAR WAVE TOY") לאותה
      שכבת כותרת (מצב קנבס בצד לקוח בלבד, לא נשמר — לא נלחץ "שמור פרויקט",
      אותה שיטת בדיקה כמו 4b-iii); המתג עבד (checked↔unchecked) ו-0 שגיאות
      קונסולה. מדידה כמותית ישירה בדפדפן (`measureText` על אותו פונט/משקל/גודל
      בדיוק) הוכיחה הבדל רוחב אמיתי בין `fontKerning:"normal"` ל-`"none"` —
      1027px מול 1057px (כ-2.9%) — כלומר החיווט אכן משנה רינדור אמיתי של
      הדפדפן, לא רק ערך מספרי. שאר הבקרות (fontSize/letterSpacing/lineHeight/
      יישור/fill/stroke/shadow/opacity/blend) ושאר הפאנלים ללא שינוי — אפס
      רגרסיה. פריסה: `_deploy/studio-more30/public/studio` (build חדש, `api/`
      ללא שינוי) → `vercel deploy --prod`, `dpl_E6P17kT8rnddCjvUus7SYSmCcoG7`,
      READY.
- [x] **5. גלריית תבניות — קטגוריה מובילה אחת בכל אחת מ-4 הקבוצות** —
      `shared/knowledge.ts`/`categoryTemplates.ts` כבר החזיקו קטלוג-תבניות
      אמיתי (מנוע `composeTemplate`) לכל 4 הקבוצות; הפער האמיתי היה ש-
      `shared/templates.ts` (התבניות ה"מובנות" שמוצגות בגלריה בפועל) ו-
      `Home.tsx` חשפו רק `שיעורי תורה` — 3 הקבוצות האחרות היו נעולות
      (`enabled = g.key === "shiurim"`) גם כשהנתונים קיימים. הוספו 3
      `TEMPLATE_DEFS` חדשים דרך `composeTemplate` (לא placeholder — כל שכבה
      מרונדרת בפועל): `wedding_chasidic` (מעגל החיים), `rosh_hashana`
      (מעגל השנה), `hachnasat_sefer_torah` (אירועים וארגונים). `Home.tsx`:
      הוסרה הנעילה, כל 4 הקבוצות פעילות.
      **ממצא קריטי בדרך:** ה-API החי (`more30.com/studio/api/*`) רץ כפונקציית
      Vercel נפרדת מקוד-מקור (`api/index.ts` + `_lib/shared|server`), לא
      מהאתחול של `server/seed.ts` המקומי — וה-seed שם היה חד-פעמי
      (`if (existing.some(builtin)) return`), כך שתוספת תבניות ל-`TEMPLATE_DEFS`
      לא הייתה משפיעה על ה-API החי בלי תיקון. תוקן ל-reseed כשה-count
      משתנה. קוד ה-adapter (שלא היה קיים בגיט בכלל עד עכשיו — שוחזר
      מה-deployment החי דרך Vercel API) נשמר תחת
      `apps/26-modaot-studio/vercel-adapter/` כדי שסבב הבא לא יצטרך
      לשחזר אותו שוב. אומת חי: `/api/templates` מחזיר 7 (היה 4), גלריית
      הבית מציגה תבנית אמיתית בכל אחת מ-4 הקבוצות (Playwright, 0 שגיאות
      קונסולה בכל מסך), פתיחת התבנית החדשה בעורך עובדת במלואה (שכבות,
      טיפים לקטגוריה, ייצוא). `/studio` ו-4 התבניות המקוריות של שיעורי-
      תורה ללא שינוי — אפס רגרסיה.

## שלב 2 — שכבת AI-נכסים

- [x] **6. Recraft V4** — רקעים פוטוריאליסטיים איכותיים בעורך, כמנוע שני
      לצד Gemini (בורר UI, לא תחליף) — נבנה `generateBackgroundRecraft`
      חדש ב-`server/branding.ts` (וגם ב-`vercel-adapter/api/_lib/server/branding.ts`,
      שהוא הקוד שרץ בפועל בפרודקשן): `POST /v1/images/generations`
      (`model: "recraftv4"`). שני מוקשים אמיתיים של V4 (שונה מ-V3 שהיה כבר
      בשימוש ל-vectorize) נמצאו ותוקנו רק אחרי כישלון חי מאומת, לא בניחוש:
      (1) V4 דוחה ב-400 את `style`/`style_id`/`negative_prompt` לגמרי — לא
      כמו V3; (2) V4 מקבל רשימת `size` סגורה בלבד (למשל `896x1152` ל-4:5),
      לא כל מחרוזת WxH. `routes.ts` (+ עותק ה-adapter) קיבל `engine` חדש
      בגוף `POST /api/ai/background` (`"gemini"` ברירת מחדל, קיים ללא שינוי
      התנהגות; `"recraft"` חדש). ב-`Editor.tsx` נוסף בורר מנוע (2 כפתורים)
      בדיאלוג "רקע AI" הקיים — לא דיאלוג חדש. אומת חי ב-`more30.com/studio`
      (Playwright): נבחר Recraft V4, "צור רקע" → `POST .../ai/background`
      **200 OK** (עד ~100 שניות — שרשרת enhance+generate+הורדת-תמונה על
      cold start), הרקע הוחלף בפועל לתמונה פוטוריאליסטית אמיתית (לא
      placeholder), פאנל "רקע" מציג "רקע תמונה פעיל". 0 שגיאות קונסולה.
      נתיב Gemini הקיים לא נגע — ברירת המחדל (`engine` לא נשלח/"gemini")
      עדיין אותו קוד בדיוק. כל שאר הפאנלים/שכבות/שדות ללא שינוי — אפס
      רגרסיה. פריסה: `vite build` (`base:"/studio/"` כבר ב-`vite.config.ts`)
      → `_deploy/studio-more30/public/studio` + `api/` מ-`vercel-adapter/`
      → `vercel deploy --prod`, READY.
- [x] **7a. וקטוריזציה — הורחבה משכבת-לוגו לכל שכבת תמונה בעורך הראשי** —
      נבדק מול הקוד: `POST /api/branding/vectorize` (Recraft) כבר היה קיים
      ומוטמע במלואו (`server/branding.ts` + מראה זהה ב-`vercel-adapter`,
      אומת ל-byte) אבל שימש רק מ-`BrandKitPage.tsx` (לוגו במותג). הפער
      האמיתי היה חשיפה בעורך הראשי, לא endpoint חדש. נוסף פאנל "שכבת תמונה"
      חדש ב-`Editor.tsx` (מוצג כשנבחרת שכבת `image` — פאנל שלא היה קיים
      כלל קודם, אותו דפוס תיקון-פער כמו פריט 9) עם כפתור "המר לוקטור SVG
      (Recraft)" שממיר את התמונה הנוכחית (URL/data-URL) ל-base64, קורא
      ל-endpoint הקיים, ומחליף את `src` בתוצאת ה-SVG (data URI) — בלי לגעת
      ב-server/API כלל (שימוש חוזר מלא). אין שינוי סכמה/רינדור/ייצוא.
      אומת חי ב-`more30.com/studio` (Playwright, cache-buster): נבדקו שני
      מקרים — (1) שכבת אייקון Iconify קיימת (SVG) → 502 תקין מ-Recraft
      (קלט וקטורי כבר, לא רלוונטי להמרה — טופל בהודעת שגיאה ידידותית, לא
      קריסה); (2) תמונה רסטרית אמיתית שהועלתה (`תמונת הרב`) → **200 OK**,
      הומרה בפועל לאיור וקטורי מסוגנן, מוצגת נכון בקנבס, ונשמרת בייצוא PNG
      מלא-רזולוציה (`הורד PNG`). 1 שגיאת קונסולה בלבד לאורך כל הסבב — מה-502
      הצפוי במקרה (1), לא תקלה. כל שאר הפאנלים/שכבות/טקסט/רקע/גלריה ללא
      שינוי — אפס רגרסיה. פריסה: `vite build --base=/studio/` →
      `_deploy/studio-more30/public/studio` (api/ ללא שינוי) →
      `dpl_BwSUk8gh9HtbLd3xxmdCNLTnWYJS`, READY.
- [x] **7b. הסרת-רקע (Recraft)** — נבנה endpoint חדש שלא היה קיים קודם,
      מראה מדויק של `vectorizeLogo`/`/api/branding/vectorize`: פונקציית
      שרת `removeBackgroundImage` (`server/branding.ts` + עותק זהה
      ב-`vercel-adapter/api/_lib/server/branding.ts`, שהוא הקוד שרץ בפועל
      בפרודקשן) קוראת ל-`POST https://external.api.recraft.ai/v1/images/removeBackground`
      (multipart `file` + `response_format=url`, אותה תבנית קלט בדיוק כמו
      vectorize), מורידה את התמונה שחזרה (PNG עם שקיפות) ומחזירה data URL.
      route חדש `POST /api/branding/remove-background` (`routes.ts` +
      עותק ה-adapter) — אין שינוי ל-route הקיים של vectorize. ב-`Editor.tsx`
      נוסף כפתור שני "הסר רקע (Recraft)" בפאנל "שכבת תמונה" הקיים (מ-7a),
      ליד כפתור הוקטוריזציה — לא פאנל/דיאלוג חדש; `handleRemoveBackground`
      מראה מדויק של `handleVectorizeImage` (אותו זרימת fetch→blob→base64→
      apiRequest, רק endpoint ותוצאה שונים). `tsc --noEmit` נקי, `vite build
      --base=/studio/` נקי (2165 מודולים). פריסה: `_deploy/studio-more30/public/studio`
      (build חדש) + `api/_lib/server/{branding,routes}.ts` (עותק adapter
      מעודכן) → `vercel deploy --prod`, `dpl_EmgiLqQ3wAaspEeURAQc5vD5BRZX`,
      READY. **אומת חי**: קריאת `POST https://more30.com/studio/api/branding/remove-background`
      עם תמונת PNG אמיתית (228KB, צילום מסך קיים מהסבב הקודם) החזירה
      **200 OK** עם `dataUrl` אמיתי (`data:image/webp;base64,...`, לא ריק/
      placeholder) — אימות דרך קריאת API ישירה (לא Playwright: הדפדפן היה
      תפוס ע"י ריצה מקבילה בזמן הסבב, ראה [[concurrent-sessions-can-switch-branch-underfoot]]
      בזיכרון). קוד ה-vectorize הקיים (7a) ושאר הפאנלים/שכבות ללא שינוי —
      אפס רגרסיה.
- [x] **8. Gemini Nano-Banana קומפוזיציה** — נבדק מול הקוד: המימוש כבר שלם
      (`gemini.ts`, מודל ראשי `gemini-3-pro-image` + נפילה אוטומטית ל-
      `gemini-2.5-flash-image`, שיפור פרומפט, הודעות שגיאה ידידותיות ל-429/403
      ב-`routes.ts` `aiErr()`) — הפער היחיד היה האם המפתח פעיל בפועל. אומת חי
      ב-`more30.com/studio` (Playwright): תבנית קיימת → "רקע AI" → "צור רקע" →
      `POST /api/ai/background` **200 OK**, הרקע השתנה בפועל לתמונת AI אמיתית
      (לא placeholder, לא הודעת שגיאה), 0 שגיאות קונסולה. אין שינוי קוד — המפתח
      פעיל, אין צורך בגיבוי/שיפור fallback עכשיו. ראיות:
      `QA/studio-26/gemini-ai-background-0819/_results.md`,
      `studio-gemini-bg-live-0819.png`.
- [x] **9. Iconify (חינם) — ספריית אייקונים** — נבדק מול הקוד: `DecorationLayer`
      (`shared/layers.ts`) הוא kind-enum בלי שדה `src`, אז הוספת Iconify דרכו
      הייתה דורשת שינוי סכמה + ענף רינדור חדש ב-`CanvasStage.tsx`/`exporter.ts`
      (המנוע המוגן). במקום זה נעשה שימוש חוזר ב-`ImageLayer` הקיים (`src: string`,
      כבר נתמך במלואו ב-`ImageNode`/ ייצוא Stage גנרי) — בלי לגעת בסכמה/רינדור/
      ייצוא בכלל. נוסף כפתור "הוסף אייקון" (`Editor.tsx`, ליד "הוסף טקסט"
      הקיים) שפותח דיאלוג חיפוש חי מול `api.iconify.design/search` (ציבורי,
      בלי מפתח), ולחיצה על תוצאה מוסיפה שכבת `image` חדשה עם
      `src=https://api.iconify.design/<prefix>/<name>.svg?color=...` — נכנסת
      אוטומטית לפאנל השכבות הקיים (שכבר מסנן `text`/`image`), ניתנת לגרירה/
      מחיקה/שכפול כמו כל שכבת תמונה אחרת.
      אומת חי ב-`more30.com/studio` (Playwright, 1280×900, cache-buster):
      פתיחת "שיעור — חסידי מלכותי" → "הוסף אייקון" → חיפוש "crown" מחזיר 45
      תוצאות אמיתיות מ-Iconify → לחיצה על `mdi:crown` מוסיפה שכבה, נבחרת
      אוטומטית, מופיעה בפאנל השכבות. **הורד PNG** מייצא את הכתר בפועל בתמונה
      הסופית ברזולוציה מלאה (לא placeholder). 0 שגיאות קונסולה לאורך כל הזרימה.
      כל שאר השכבות/שדות/פאנלים ללא שינוי — אפס רגרסיה. פריסה: `vite build
      --base=/studio/` → `_deploy/studio-more30/public/studio` (api/ הועתק
      ללא שינוי מ-`vercel-adapter/`, לא נגעתי בו) → `dpl_AqK6Vzf7L7HH8TtdkhAeAQ7LQi7c`, READY.

## שלב 3 — מתאמים (Adapters)

- [ ] **10. מתאם Figma** — ציור פרוגרמטי מהמפרט הניטרלי (JSON/SVG) של תבנית,
      לעריכה נוספת ב-Figma (אתרים/ממשקים).
- [ ] **11. מתאם Canva Autofill** — Enterprise, מפתח חסר; לבנות עם placeholder
      + סימון "חסום — מפתח חסר" עד שיגיע.
- [ ] **12. מתאם Adobe IDML/InDesign** — לדפוס-כמות (עלוני A3/עיתונות).

## שלב 4 — סטודיו רב-סוכני מלא

- [ ] **13. לולאת סוכנים** — מנהל-אמנותי ← מעצב ← מבקר QA, טיוטה→ביקורת→ליטוש.
- [ ] **14. עורך חי עם לולאת למידה מהערות לקוח** — מעבר לעריכה הידנית הקיימת
      ב-`Editor.tsx`; שמירת הערות ותיקון אוטומטי בסבב הבא.
- [ ] **15. 2–3 אפשרויות עיצוב ללקוח במצב התלבטות** — כשהבוט לא בטוח באיזה
      סגנון להשתמש, מציג 2–3 גרסאות זמינות לבחירה במקום להחליט לבד.

---

## כללים (מ-DESIGN_SYSTEM_BUILD_v2.md §7, תמיד בתוקף)

אפס רגרסיה (לא למחוק מנוע העברית/פיצ'רים קיימים) · אמת בייצוא+צפייה, לא רק
בקוד · git commit+push בכל סבב · מצב טסט לפני חיוב אמיתי · אל תיגע במוגן
(08/09/bkalut-app/bkalot-admin/zr_/NEDARIM3873).
