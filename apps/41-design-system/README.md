# 41 · Design System Hub — `more30.com/design`

עמוד-הבית של מערכת העיצוב של more30: Brand Kit חי (פלטה + טיפוגרפיה), מילון
הפרמטרים, ותיאור המנוע הקיים (HTML/CSS/SVG→PDF, עברית מושלמת) עם קישור ישיר
לסטודיו המודעות החי ב-`/studio` (app 26 — `26-modaot-studio`).

## מה זה **לא**

זה לא מחליף את מנוע העריכה הקיים ולא כופל אותו. `apps/26-modaot-studio`
(הקנבס השכבתי, autofit, ייצוא PNG/PDF, AI-רקעים) נשאר בדיוק כפי שהוא, חי
ב-`/studio`. העמוד הזה הוא ה"חלון-ראווה" של השפה החזותית המשותפת + מדריך
העיצוב — הבסיס לשלבים הבאים לפי `DESIGN_SYSTEM_BUILD_v2.md` §6 (שכבת AI-נכסים,
מתאמים, סטודיו רב-סוכני).

## מקור האמת לצבעים/פונטים

`portal/src/styles.css` (`:root` ב-portal). הטוקנים כאן מועתקים ידנית ממנו —
אם `portal/src/styles.css` משתנה, יש לעדכן כאן.

## פריסה

עמוד סטטי טהור, בלי build step. נפרס כפרויקט Vercel נפרד `design-more30`
(תואם לתבנית `studio-more30`), וממופה ב-`portal/vercel.dist.json` תחת
`/design`, `/design/`, `/design/:path*`.

```
_deploy/design-more30/
  public/design/index.html   ← זהה ל-apps/41-design-system/index.html
  public/design/style.css
  public/design/favicon.svg
  vercel.json
  .vercel/project.json
```

**חובה לשמור זהות בין `apps/41-design-system/` (מקור) ל-`_deploy/design-more30/public/design/`
(פריסה)** — עדכון באחד בלי השני מייצר סטייה בין המקור לפרודקשן.
