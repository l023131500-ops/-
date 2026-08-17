# עורך תורני (18/orech) — פריסת כפתור סיבוב/היפוך + תצוגה מקדימה, 17/08/2026

## מה נמצא
`more30-fixes-and-features.md` §"המרת כתב יד" מבקש כפתור היפוך/סיבוב לתמונת
כתב היד וכן תצוגה מקדימה בזמן השליחה. הקוד **כבר היה כתוב** ב-
`apps/18-torah-editor-mvp/app/htr/page.tsx` (commit `6dca79f`,
2026-08-05T14:01:38+03:00, "Handwriting upload: straighten the page before
it goes in, and show what is sent"): `bakeTransform()` (baking rotate/flip
לתוך קובץ ה-PNG בפועל לפני העלאה), preview חי עם `transform: rotate()
scaleX()`, וכפתורי "⟲ סיבוב שמאלה" / "⟳ סיבוב ימינה" / "⇋ היפוך אופקי" /
"איפוס".

## מה נמדד — לא נפרס מעולם
פריסת הייצור האחרונה של `orech-more30` (`prj_9FxRiF4Pl3DnjvKSfgOymUxHJgdp`)
לפני הצעד הזה הייתה `dpl_uUVhZzmTCf2e5pEKE4T7m8iMURVz`, `created:
1785927501215` = **2026-08-05T10:58:21Z** — שלוש דקות **לפני** ה-commit
(11:01:38Z). חבילת ה-JS החיה
(`/orech/_next/static/chunks/app/htr/page-434c240a685820ab.js`, 4,070
בתים) לא הכילה `bakeTransform`/`rotation`/מחרוזות "סיבוב"/"היפוך". הקוד
נשאר בענף/ריפו בלבד, אף פעם לא הגיע לייצור.

## מה נעשה
`npm run build` (Next.js 14.2.35, הצליח, 11 עמודים) →
`npx vercel deploy --prod --yes --scope l023131500-ops-projects` מתוך
`apps/18-torah-editor-mvp`. `dpl_E3ZzrZGmYsfDmx92roqZwEnwGvnk`, READY,
alias `orech-more30.vercel.app`.

## אימות אחרי הפריסה
- `GET https://more30.com/orech/htr?cachebust=…` → אותה חבילה
  `page-434c240a685820ab.js`, אבל עכשיו **10,753 בתים** (היה 4,070), ומכילה
  את שלוש המחרוזות "סיבוב", "היפוך", "איפוס" (בדיקה על ה-UTF-8 הגולמי, לא
  הוחלף ע"י NetFish/NetFree — הבדיקה על bytes ולא על טקסט מרונדר).
- Playwright, `1280×900`, `more30.com/orech/htr`: העמוד נטען נקי, טופס
  ההעלאה + בורר "סוג החומר"/"רמת מנוי" + רשימת 3 העבודות הקיימות מוצגים
  כרגיל — אין רגרסיה. כפתורי הסיבוב/היפוך מותנים בבחירת קובץ (`previewUrl`
  לא ריק) ולכן אינם מופיעים לפני העלאה — זה ההתנהגות המתוכננת בקוד, לא
  תקלה.
- לא הועלה קובץ אמיתי בסבב הזה (לא נדרש לצורך אימות פריסה; ההוכחה שהכפתורים
  קיימים היא תוכן החבילה).

## מסקנה
פריט "כפתור היפוך/סיבוב" ו"תצוגה מקדימה" בעורך תורני (18) — **סגור, פרוס
וחי**. שום שינוי קוד לא נדרש; זו הייתה תקלת פריסה בלבד.
