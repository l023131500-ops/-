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

- [x] **10. מתאם Figma** — ציור פרוגרמטי אמיתי מהמפרט הניטרלי (`TemplateDoc`,
      לא מה-Konva stage) ל-SVG וקטורי אמיתי: `stageToSVG`/`downloadSVG`
      (`client/src/lib/exporter.ts`) — שכבות טקסט (`<text>`+`<tspan>` לכל
      שורה, יישור/ישור-אנכי/פונט/משקל/צבע/מתאר/tracking/כיוון-RTL), תמונה
      (`<image>` עם `clipPath` לעיגול/`cornerRadius`, פלייסהולדר מלבן מתויג
      כשאין `src`), צורה (rect/circle/line), רקע (solid/gradient/image),
      ו-opacity/blend (`mix-blend-mode`)/rotation לכל שכבה — נאמן ל-`shared/layers.ts`
      ול-`CanvasStage.tsx`. שכבות עיטור (`DecorationLayer`, מסגרות/כתרים/
      קישוטים מצוירים ב-Konva דרך `lib/ornaments.ts`) **לא שוכפלו** ל-SVG
      בסבב הזה — מיוצאות כמלבן-מיקום מתויג בשם הקישוט (`data-decoration-kind`),
      תיוג כן ולא הטעיה, לעיצוב-מחדש ידני של הקישוט עצמו ב-Figma; הרחבה
      לסבב נפרד אם רלוונטי. כפתור "Figma" בדיאלוג "מתאמים" (`Editor.tsx`)
      הוחלף מ-Badge "בבנייה" לכפתור עובד "הורד SVG"
      (`data-testid="button-export-figma-svg"`) — Canva/InDesign ללא שינוי.
      `tsc --noEmit` נקי, `vite build --base=/studio/` נקי (2168 מודולים,
      זהה למספר לפני הסבב). אומת חי ב-`more30.com/studio` (Playwright,
      cache-buster, 1280×900): נפתחה "שיעור — חסידי מלכותי" → מתאמים →
      "הורד SVG" הוריד קובץ `.svg` אמיתי (לא ריק) עם 7 שכבות טקסט/תמונה/
      עיטור אמיתיות מהתבנית (טקסט עברי מקודד נכון, רקע-גרדיאנט אמיתי,
      placeholder תמונה מתויג) — נבדק ידנית תוכן הקובץ שהורד. 0 שגיאות
      קונסולה. שאר הפאנל/הכפתורים (PNG/PDF/שמירה/שכבות/רקע) ללא שינוי —
      אפס רגרסיה. צילום: `studio-figma-svg-export-0819.png`. פריסה:
      `vite build` → `_deploy/studio-more30/public/studio` (build חדש, `api/`
      ללא שינוי) → `vercel deploy --prod`, `dpl_FVTj8sf2EdhnyW7HMpwkKmCGqC4A`,
      READY.
- [x] **11. מתאם Canva Autofill** — נבדק מול `core.secrets`: אין `CANVA` בשום
      שם/שירות (Enterprise, מפתח חסר, בדיוק כפי שהסעיף חוזה). נבנה פאנל
      "מתאמים" חדש בעורך (`Editor.tsx`): כפתור `<Blocks>` בסרגל העליון (ליד
      "הורד PDF"), פותח `Dialog` עם שלוש שורות — Figma/Canva Autofill/Adobe
      InDesign — כל שורה עם `Badge` סטטוס. Canva Autofill מסומן
      **"חסום — מפתח חסר"** (`data-testid="badge-canva-blocked"`), בדיוק לפי
      הניסוח בסעיף. Figma/InDesign מסומנים "בבנייה" (סעיפים 10/12, לא נבנו
      בסבב הזה — תצוגת-מצב כנה, לא תפקוד מדומה). אין endpoint/קריאת-רשת/מפתח
      חדשים — placeholder UI טהור, שום קוד ייצוא לא נכתב (אין מה לבנות בלי
      מפתח). `tsc --noEmit` נקי, `vite build --base=/studio/` נקי (2168
      מודולים, זהה למספר לפני הסבב). אומת חי ב-`more30.com/studio`
      (Playwright, cache-buster, 1280×900): נפתחה תבנית קיימת ("שיעור — חסידי
      מלכותי"), כפתור "מתאמים" חדש מופיע בסרגל העליון, לחיצה פותחת את הדיאלוג
      עם שלוש השורות והתגיות הנכונות (צילום: `studio-adapters-dialog-0819.png`).
      0 שגיאות קונסולה. כל שאר הכפתורים/הפאנלים/השכבות בעורך ללא שינוי —
      אפס רגרסיה. פריסה: `vite build` → `_deploy/studio-more30/public/studio`
      (build חדש, `api/` ללא שינוי) → `vercel deploy --prod`,
      `dpl_EdbJpa5mrPCbX8fmHrzL8jGsuq2e`, READY.
- [x] **12. מתאם Adobe IDML/InDesign** — לדפוס-כמות (עלוני A3/עיתונות). נבנה
      מהיסוד (בניגוד ל-10 שהיה SVG טקסטואלי פשוט): מודול חדש
      `client/src/lib/idmlExporter.ts` בונה חבילת IDML **אמיתית** (zip תקני
      method=store + XML לפי סכמת `idPkg` הרשמית של אדובי — designmap/
      Resources(Graphic/Fonts/Styles/Preferences)/MasterSpreads/Spreads/Stories)
      ישירות מ-`TemplateDoc`, כמו `stageToSVG` (מתאם Figma, #10) — לא ריצוף
      פיקסלים. אין ספריית zip בפרויקט (לא jszip וכו') — נכתב כותב-zip תקני
      (CRC32 + local/central-directory records) ביד, ~90 שורות. שכבות **טקסט**
      = `TextFrame` אמיתי עם `Story` נפרד לכל שכבה (פונט/גודל/צבע/יישור/
      tracking/leading/כיוון RTL אמיתיים, בר-עריכה מלאה ב-InDesign) — הליבה
      האמיתית של המתאם, במקביל לזרימת דפוס-כמות. שכבות image/shape/decoration
      = מלבן-מיקום מתויג בהערת XML (`<!-- placeholder layer: ... -->`) — **אותה
      מגבלה מתועדת בדיוק כמו עיטורים במתאם Figma #10**, לעיצוב-מחדש ידני
      ב-InDesign. כפתור "מתאמים" > InDesign הוחלף מ-Badge "בבנייה" לכפתור עובד
      "הורד IDML" (`data-testid="button-export-idml"`) — Figma/Canva ללא שינוי.
      `tsc --noEmit` נקי (אחרי תיקון 3 שגיאות `--downlevelIteration` —
      הוחלפו ל-`Array.from`), `vite build --base=/studio/` נקי (2169 מודולים).
      **אומת חי** ב-`more30.com/studio` (Playwright, cache-buster, 1280×900):
      נפתחה "שיעור — חסידי מלכותי" → מתאמים → "הורד IDML" הוריד קובץ `.idml`
      אמיתי (21,097 בתים) — 0 שגיאות קונסולה לאורך כל הזרימה (פתיחת עורך +
      דיאלוג + הורדה). **אי-אפשר לפתוח בפועל ב-Adobe InDesign בסביבה הזו** (אין
      InDesign מותקן) — לכן האימות נעשה מבנית, באותה רמת קפדנות כמו קבצים
      שהורדו בפריטים קודמים: `Expand-Archive` פירק את ה-zip ל-14 קבצים
      (mimetype + designmap + 4 Resources + MasterSpread + Spread + 6 Stories,
      תואם ל-6 שכבות טקסט בתבנית), כל 14 קבצי ה-XML נטענו ללא שגיאה דרך
      `System.Xml.XmlDocument` (well-formed), תוכן `Story_u2` תואם בדיוק
      ל"שיעור בפנימיות התורה" (עברית תקינה, לא מקודדת-כפולה — נבדק דרך .NET
      XML API, לא pipeline טקסט של PowerShell), `StoryDirection="RightToLeftDirection"`
      נכון, ו-`Spread_u1.xml` מכיל 6 `TextFrame` (=6 שכבות טקסט) ו-7 `Rectangle`
      (רקע + 6 שכבות image/shape/decoration שאינן טקסט, כולל עיטורים שמסוננים
      מפאנל השכבות ב-UI לפי #4b-iv — המתאם מייצא את **כל** `doc.layers`, לא רק
      את מה שגלוי בפאנל). כל שאר הכפתורים/הפאנלים/השכבות בעורך ואדפטרי
      Figma/Canva ללא שינוי — אפס רגרסיה. צילום: `studio-idml-dialog-0819.png`.
      פריסה: `vite build` → `_deploy/studio-more30/public/studio` (build חדש,
      `api/` ללא שינוי) → `vercel deploy --prod`, `dpl_DHxcpWejKA2sqnKjnbNSWWNZJGEM`,
      READY.

## שלב 4 — סטודיו רב-סוכני מלא

- [ ] **13. לולאת סוכנים** — מנהל-אמנותי ← מעצב ← מבקר QA, טיוטה→ביקורת→ליטוש.
      **התקדמות חלקית (19/08):** נבנה שלב **"מבקר QA"** כפיצ'ר עצמאי ועובד —
      לא הלולאה האוטומטית המלאה. כפתור "ביקורת AI" חדש בסרגל העליון של העורך
      (`Editor.tsx`, ליד "מתאמים") שולח תקציר של הטיוטה הנוכחית (מיקום/גודל/
      פונט/צבע לכל שכבה — **בלי** base64 של תמונות) ל-Claude (`claude()` הקיים
      ב-`server/ai.ts`, אותו דפוס בדיוק כמו `generateCopy`/`generateConcepts`),
      ומציג משוב מובנה בדיאלוג: ציון 0-100, חוזקות, רשימת בעיות (חומרה+שכבה+
      הסבר), הצעות שיפור קונקרטיות. **קריאה בלבד — שום שכבה לא משתנה
      אוטומטית**, המעצב/הלקוח מחליטים אם ליישם. אין endpoint/מפתח AI חדש —
      שימוש חוזר מלא בתשתית Anthropic הקיימת. `tsc --noEmit` נקי, `vite build
      --base=/studio/` נקי (2169 מודולים, זהה לבסיס). אומת חי ב-`more30.com/studio`
      (Playwright, cache-buster, 1280×900): נפתחה "שיעור — חסידי מלכותי" →
      "ביקורת AI" → **200 OK** מ-`/api/ai/critique` → משוב אמיתי וספציפי-לתבנית
      (זיהה חפיפה אמיתית בין `rabbiPhoto` ל-`topic` לפי קואורדינטות מדויקות,
      וגלישת כותרת מחושבת — לא טקסט גנרי), ציון 64/100. 0 שגיאות קונסולה. שאר
      הכפתורים/הפאנלים (PNG/PDF/מתאמים/שכבות/רקע/AI-רקע/וקטוריזציה/אייקונים)
      ללא שינוי — אפס רגרסיה. `/studio`, `/design`, `more30.com/` עדיין 200.
      פריסה: `_deploy/studio-more30` (build+api חדשים) → `vercel deploy --prod`,
      `dpl_2rLWVqfom1gEizcHAxq7T4v6DGH9`, READY. **נשאר לסבב הבא:** הלולאה
      האוטומטית עצמה (מעצב מייצר טיוטה → ליטוש איטרטיבי אוטומטי לפי הביקורת,
      בלי מעורבות אדם) — לא נבנתה; זהו שלב-הביקורת בלבד, לא הלולאה. גם "2-3
      אפשרויות ללקוח" כבר קיים בנפרד (פריט 15).
      **תוספת (19/08, סבב נוסף) — "החל תיקון" לכל הערה:** שלוש פעמים ברצף
      (כולל הסבב הזה) הוערך שהלולאה האוטומטית המלאה (בלי מעורבות אדם) גדולה/
      מסוכנת מדי לצעד יחיד — נבנתה במקום זאת פרוסה בטוחה ואמיתית ממנה: הפרומפט
      ב-`critiqueDesign` (`server/ai.ts` + עותק `vercel-adapter`) מבקש עכשיו
      מ-Claude גם `fix?: {layerId, field, value}` אופציונלי לכל issue — רק
      כשיש תיקון חד-משמעי לשכבה קיימת אחת, מתוך רשימת-הרשאה סגורה של 9 שדות
      שכבר חשופים כבקרות ידניות בפאנל (opacity/letterSpacing/lineHeight/
      cornerRadius/fontSize/x/y/fill/stroke — לא טקסט/שכבות חדשות). ב-`Editor.tsx`
      (`resolveCritiqueFix`) כל `fix` שמגיע מה-AI עובר קודם אימות+clamp מלא
      בצד הלקוח (שכבה קיימת, שדה ברשימה, טווח מספרי/hex תקין) — לא נסמך על
      ה-AI. לכל issue עם fix תקף מופיע כפתור "החל תיקון (<field>)" בדיאלוג
      הביקורת; לחיצה קוראת ל-`handleChangeLayer` הקיים (בדיוק אותו נתיב כמו
      עריכה ידנית בפאנל) על שכבה אחת בלבד ומסמנת את הכפתור "הוחל ✓". שום שכבה
      לא משתנה בלי לחיצה מפורשת על ההערה הספציפית — זה עדיין לא הלולאה
      האוטומטית (אין ריצה-מחדש-של-הביקורת/איטרציה בלי אדם), אבל הופך משוב
      טקסטואלי-בלבד למנגנון תיקון-בקליק אמיתי, בטוח ומדיד. `tsc --noEmit`
      נקי, `vite build --base=/studio/` נקי (2169 מודולים, זהה לבסיס — 0
      קוד מת). אומת חי ב-`more30.com/studio` (Playwright, cache-buster,
      1280×900): נפתחה "שיעור — חסידי מלכותי" → ביקורת AI → ציון 63/100,
      3 מתוך 5 הערות קיבלו כפתור "החל תיקון" (2×fontSize, 1×y) — לחיצה על
      תיקון ה-fontSize של הכותרת החליפה בפועל את הגודל הנבחר בפאנל הטקסט
      מ-130 (המקורי) ל-112 (הערך שה-AI הציע בתוך הטווח המותר), בחרה אוטומטית
      את השכבה, וסימנה "הוחל ✓". 0 שגיאות קונסולה. שאר הבקרות/הפאנלים/הכפתורים
      (PNG/PDF/מתאמים/הערות לקוח/שכבות/רקע/AI-רקע/וקטוריזציה/אייקונים/שמירה)
      ללא שינוי — אפס רגרסיה; `/studio`, `/design`, `more30.com/` עדיין 200.
      צילום: `studio-critique-apply-fix-0819.png`. פריסה: `vite build` →
      `_deploy/studio-more30/public/studio` (build חדש) + `api/_lib/server/ai.ts`
      (עותק adapter מעודכן) → `vercel deploy --prod`,
      `dpl_3ZzUNLr2oGgWi2PddbAJzt8z8zsw`, READY. **נשאר לסבב הבא:** עדיין
      הלולאה האוטומטית המלאה (ריצה-מחדש של הביקורת אחרי תיקון, בלי אדם) —
      במכוון לא נבנתה, אותה סיבה בדיוק כמו קודם.
      **תוספת (19/08, סבב נוסף) — "בדוק שוב אחרי התיקונים":** כפתור חדש
      בתחתית דיאלוג הביקורת, מוצג רק אחרי הפעלת תיקון אחד לפחות, קורא שוב
      ל-`handleAiCritique()` הקיימת (אותו endpoint בדיוק) — עדיין ביוזמת אדם
      בלבד, לא איטרציה אוטומטית. אומת חי: תיקון fontSize → כפתור הופיע →
      לחיצה → ציון התעדכן 63→64. פרטים: `SYSTEMS_STATUS.md` +42. **נשאר
      לסבב הבא:** עדיין הלולאה האוטומטית המלאה עצמה — אותה סיבה כמו קודם.
      **תוספת (19/08, סבב נוסף) — "החל את כל התיקונים":** כפתור חדש בכותרת
      רשימת ה"הערות" שמריץ את `handleApplyCritiqueFix` הקיימת על כל התיקונים
      הממתינים והניתנים-לפתרון בבת אחת (לחיצת אדם יזומה אחת, לא איטרציה).
      **קוד בלבד, לא נפרס הסבב הזה** — `node_modules` לא זמין בעץ העבודה ואין
      פרישה מ-`vite build` בלי התקנה, ו-`studio-more30` אינו push-triggered
      (`vercel-adapter/vercel.json`: `echo no-build`). ראה `DECISIONS.md` #47-49.
      **נשאר לסבב הבא:** `vite build` + פריסה + אימות Playwright חי של הכפתור
      החדש, ועדיין הלולאה האוטומטית המלאה עצמה.
- [ ] **14. עורך חי עם לולאת למידה מהערות לקוח** — מעבר לעריכה הידנית הקיימת
      ב-`Editor.tsx`; שמירת הערות ותיקון אוטומטי בסבב הבא.
      **התקדמות חלקית (19/08):** נבנה שלב **שמירת ההערה** בלבד — לא הלולאה
      האוטומטית. כפתור חדש "הערות לקוח" בסרגל העליון (ליד "ביקורת AI") פותח
      דיאלוג עם `Textarea` חופשי; הטקסט נשמר בתוך `layersJson` הקיים כשדה אח
      ל-`background`/`layers` (לא כחלק מ-`TemplateDoc` עצמו — כך שמייצא/מתאם/
      ביקורת AI לא רואים אותו ולא מושפעים ממנו) — **בלי מיגרציה, בלי endpoint
      חדש**, אותו `POST`/`PATCH /api/projects` הקיים מקבל אותו כמו כל שדה אחר
      בתוך המחרוזת. `templateContext.tsx` מקבל `clientNotes?: string` על
      `SelectedTemplate`; `Projects.tsx` (מסך "העבודות שלי") פורק אותו בחזרה
      בפתיחת עבודה שמורה. `tsc --noEmit` נקי, `vite build --base=/studio/`
      נקי (2169 מודולים, זהה לבסיס — אין קוד מת נוסף). אומת חי ב-
      `more30.com/studio` (Playwright, cache-buster, 1280×900): נפתחה תבנית →
      "הערות לקוח" → הקלדה ("בדיקת QA 19/08 — נא להחליף את הכותרת לגוון זהב
      בהיר יותר") → "שמור הערה ופרויקט" → `POST /api/projects` 200 → מעבר
      ל"העבודות שלי" ופתיחה מחדש של אותה עבודה → הדיאלוג מציג בדיוק את אותו
      טקסט. 0 שגיאות קונסולה בכל השלבים. עבודת הבדיקה נמחקה אחרי האימות (אין
      נתון מומצא בהאב). שאר הכפתורים/הפאנלים (PNG/PDF/מתאמים/ביקורת
      AI/שכבות/רקע/AI-רקע/וקטוריזציה/אייקונים/שמירה) ללא שינוי — אפס רגרסיה.
      פריסה: `_deploy/studio-more30/public/studio` (build חדש, בייט-לבייט זהה
      ל-`dist/public`, `api/` ללא שינוי) → `vercel deploy --prod`,
      `dpl_6KYGYvcJxYghTYQ1sW2kK9fdJjKB`, READY. ראיות:
      `QA/platform/studio-client-notes-0819/`. **נשאר לסבב הבא:** התיקון
      האוטומטי לפי ההערה (לולאת עיצוב→ביקורת→ליטוש שקוראת את `clientNotes`
      ומפעילה מחדש את `/api/ai/critique` או מנוע דומה) — לא נבנה; זהו שלב
      השמירה בלבד, באותו דפוס בדיוק שפריט 13 נבנה בו (שלב-ביקורת בלי הלולאה
      האוטומטית).
      **תוספת (19/08, סבב נוסף):** חוט מקשר בטוח בין שני החלקים —
      `critiqueDesign()` מקבל `clientNotes?` אופציונלי, ואם קיים, הפרומפט
      מנחה את Claude לתעדף התייחסות אליו בביקורת. קריאה בלבד, שום שכבה לא
      משתנה אוטומטית עדיין. אומת חי: הערה על ניגודיות כותרת/רקע → ביקורת AI
      → המשוב התייחס במפורש להערה. פרטים: `SYSTEMS_STATUS.md` +40.
      **נשאר לסבב הבא:** עדיין הלולאה האוטומטית עצמה (ליטוש אוטומטי לפי
      ההערה בלי מעורבות אדם) — לא נבנתה.
- [x] **15. 2–3 אפשרויות עיצוב ללקוח במצב התלבטות** — נבנה על גבי דיאלוג "רקע
      AI" הקיים (לא דיאלוג חדש): כפתור שני "לא בטוחים? הצע 2 אפשרויות לבחירה"
      (`Editor.tsx`, `handleAiBackgroundVariants`) קורא ל-`/api/ai/background`
      הקיים פעמיים במקביל (`Promise.allSettled`) — פעם אחת עם `engine:"gemini"`
      ופעם עם `engine:"recraft"` — ומציג את שתי התוצאות כתמונות-ממוזערות
      לבחירה בגריד 2 עמודות; לחיצה על אחת מחילה אותה (`applyAiBackgroundVariant`)
      וסוגרת את הדיאלוג, בדיוק כמו שהמפרט מבקש ("מציג 2–3 גרסאות זמינות
      לבחירה במקום להחליט לבד"). אין endpoint/מפתח חדשים — שימוש חוזר מלא
      בשני המנועים שכבר נבנו בפריטים 6/8. כפתור "צור רקע" הקיים (בחירת מנוע
      אחד + החלה מיידית) נשאר ללא שינוי לגמרי — זו תוספת, לא תחליף.
      `tsc --noEmit` נקי, `vite build --base=/studio/` נקי (2169 מודולים,
      זהה למספר לפני הסבב). אומת חי ב-`more30.com/studio` (Playwright,
      cache-buster, 1280×900): נפתחה "שיעור — חסידי מלכותי" → רקע AI → "לא
      בטוחים?..." → שתי תמונות אמיתיות (לא placeholder) הופיעו בפועל בגריד
      תוך כ-45 שניות, 0 שגיאות קונסולה; לחיצה על אפשרות Recraft החליפה בפועל
      את רקע הקנבס לתמונה שנבחרה וסגרה את הדיאלוג — שאר הפאנלים/שכבות/טקסט
      ללא שינוי. `/studio`, `/design` ו-`more30.com/` עדיין 200 אחרי הפריסה —
      אפס רגרסיה. צילומים: `studio-ai-background-variants-0819.png`,
      `studio-ai-variant-applied-0819.png`. פריסה: `vite build` →
      `_deploy/studio-more30/public/studio` (build חדש, `api/` ללא שינוי) →
      `vercel deploy --prod`, `dpl_5Nm1ijR1j8PrZuanqs6eEWmwoxmE`, READY.

## שלב 5 — וידאו קידום + קריינות (video + narration TTS)

- [ ] **16. קריינות עברית (TTS)** — הבסיס הראשון לשכבת "וידאו קידום" (המערכת
      עצמה עדיין מנוע תמונה סטטית; זה השלב הראשון לקראת רצף פריימים+קול).
      נבנה מהיסוד, לפי אותו ספק/דפוס בדיוק כמו `apps/27-bkalut-price/server/hf-podcast.ts`
      (ElevenLabs, `ELEVENLABS_API_KEY`, `eleven_multilingual_v2`) — לא ספק
      חדש. `shared/tts-hebrew.ts` (עותק מותאם של `apps/27-bkalut-price/shared/tts-hebrew.ts`,
      כל מערכת ממוספרת מנוהלת בנפרד ולכן לא ייבוא חוצה-אפליקציות) ממיר
      מספרים/מטבע/אחוזים/שנים למילים לפני שליחה למנוע, כדי שהקריינות תישמע
      טבעית. `server/narration.ts` חדש: `generateNarration(script, voiceId?)`
      מחזיר `data:audio/mpeg;base64,...` — בדיוק כמו שה-Recraft
      vectorize/remove-background כבר מחזירים data URL של תמונה, כי למערכת
      26 אין אחסון קבצים משלה (רק ארבע טבלאות `studio_*`). route חדש
      `POST /api/ai/narration` (`routes.ts` + עותק זהה
      `vercel-adapter/api/_lib/server/{narration,routes}.ts`). בעורך: כפתור
      "קריינות" חדש בסרגל העליון (ליד "הערות לקוח", אותו קומפוננט/סגנון
      בדיוק) פותח דיאלוג עם `Textarea` לתסריט + כפתור "צור קריינות" +
      נגן `<audio controls>` לתצוגה מקדימה. נשמר לצד הטיוטה בתוך `layersJson`
      כשדה אח ל-`background`/`layers` (`narrationScript`/`narrationAudioUrl`),
      אותו דפוס בדיוק כמו `clientNotes` (פריט 14) — לא חלק מ-`TemplateDoc`,
      לא משפיע על הרינדור/ייצוא/מתאמים הקיימים. `templateContext.tsx` +
      `Projects.tsx` מעבירים/משחזרים את שני השדות כשפותחים עבודה שמורה.
      **לא נבדק חי ולא נפרס הסבב הזה** — הסבב הזה חסר גישת build/dev-server
      (אותה מגבלה בדיוק שתועדה בפריט 13, "החל את כל התיקונים": אין
      `node_modules`/`vite build` זמינים בסביבה). הקוד נכתב ונבדק בקריאה
      ישירה מול הדפוסים הקיימים (`branding.ts` data-URL pattern, `clientNotes`
      sibling-field pattern, `routes.ts`/`vercel-adapter` mirror אחד-לאחד) —
      לא בהרצה. **נשאר לסבב הבא (עם build/dev-server זמינים):** `tsc --noEmit`
      + `vite build --base=/studio/` + פריסה + אימות Playwright חי
      (כפתור מופיע, קריינות אמיתית מתקבלת, נשמרת ונטענת בחזרה, אפס רגרסיה
      לשאר הכפתורים), ואז המשך הבנייה בפועל של "וידאו קידום": רצף
      פריימים/מעברים על גבי מנוע ה-Konva הקיים + סנכרון לאורך הקריינות +
      קידוד וידאו (ככל הנראה `MediaRecorder`/`canvas.captureStream()`
      בדפדפן, כדי להימנע מתלות ב-ffmpeg בסביבת Vercel serverless).

---

## כללים (מ-DESIGN_SYSTEM_BUILD_v2.md §7, תמיד בתוקף)

אפס רגרסיה (לא למחוק מנוע העברית/פיצ'רים קיימים) · אמת בייצוא+צפייה, לא רק
בקוד · git commit+push בכל סבב · מצב טסט לפני חיוב אמיתי · אל תיגע במוגן
(08/09/bkalut-app/bkalot-admin/zr_/NEDARIM3873).
