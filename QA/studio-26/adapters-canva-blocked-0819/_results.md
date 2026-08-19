# QA — CHECKLIST/graphics.md item 11: Canva Autofill adapter (blocked-key placeholder)

תאריך: 19/08/2026. מערכת: 26 studio (`more30.com/studio`).

## מה נבדק לפני הבנייה
`core.secrets` (האב, `uhnrgujbdxhhmoxcjria`): שאילתה על `service`/`name`
מכילים `canva`/`figma`/`adobe` — 0 שורות. אין מפתח Canva, בדיוק כפי שסעיף 11
בצ'קליסט חוזה ("Enterprise, מפתח חסר").

## מה נבנה
פאנל "מתאמים" חדש בעורך (`apps/26-modaot-studio/client/src/pages/Editor.tsx`):
- כפתור `<Blocks>` "מתאמים" בסרגל העליון, ליד "הורד PDF" (`data-testid="button-open-adapters"`).
- `Dialog` עם שלוש שורות: Figma ("בבנייה"), Canva Autofill
  ("חסום — מפתח חסר", `data-testid="badge-canva-blocked"`), Adobe InDesign
  ("בבנייה").
- אין endpoint/קריאת-רשת/מפתח חדשים. placeholder UI טהור.

## אימות חי
Playwright, `more30.com/studio?cachebust=0819adapters`, 1280×900:
1. עמוד הבית נטען תקין (0 שגיאות קונסולה).
2. נפתחה תבנית "שיעור — חסידי מלכותי" → עורך.
3. כפתור "מתאמים" מופיע בסרגל העליון לצד "הורד PNG"/"הורד PDF"/"שמור פרויקט"
   (ללא שינוי בהם).
4. לחיצה פותחת דיאלוג עם שלוש השורות והתגיות הנכונות — צילום:
   `studio-adapters-dialog-0819.png` (בתיקיית העבודה).
5. 0 שגיאות קונסולה לאורך כל הזרימה.
6. כל שאר הפאנלים (שדות/שכבות/רקע/טיפים לקטגוריה) ושכבות התבנית ללא שינוי —
   אפס רגרסיה.

## פריסה
`vite build` (base=`/studio/`, 2168 מודולים) →
`_deploy/studio-more30/public/studio` (robocopy /MIR, `api/` ללא שינוי) →
`vercel deploy --prod --scope l023131500-ops-projects` →
`dpl_EdbJpa5mrPCbX8fmHrzL8jGsuq2e`, READY, aliased `studio-more30.vercel.app`.

## הבא
סעיף 10 (מתאם Figma אמיתי — ציור פרוגרמטי מהמפרט הניטרלי) או סעיף 12
(Adobe IDML) — שני אלה דורשים בנייה אמיתית (סבב נפרד לכל אחד), לא רק תצוגת-מצב.
