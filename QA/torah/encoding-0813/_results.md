# 01 torah — ה-HTML שהוגש בייצור היה מקודד פעמיים (#211)

13/08/2026 · מצב טסט · לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873

## מה נמדד לפני הנגיעה, על התשובה החיה ולא על העותק המקומי

```
GET https://more30.com/torah/?cb=step0813b -> 200, 34,338 בייט
<title>׳׳™׳’׳•׳“ ׳”׳©׳™׳¢׳•׳¨׳™׳ ֲ· ׳׳¢׳¨׳›׳× ׳×׳•׳¨׳ ׳™׳× ׳׳׳•׳—׳“׳×</title>
2,001 מופעים של U+05F3
```

הסיבוב `UTF8.GetString(cp1255.GetBytes(live))` החזיר
`<title>איגוד השיעורים · מערכת תורנית מאוחדת</title>` — כלומר בייטים תקינים של
UTF-8 פוענחו פעם אחת כ-cp1255 (עמוד הקוד ה-ANSI של המכונה הזאת) ונכתבו שוב
כ-UTF-8. הפגיעה אינה SEO בלבד: ה-HTML הזה הוא הציור המוקדם, ולכן הביקור הראשון
התחיל ב-29KB של ג'יבריש עד ש-React החליף אותו.

## למה זה תוקן כתיקון בייטים ולא כבנייה מחדש

הכרטיס תיאר מסלול של build → robocopy → prerender, והזהיר ש-torah היא היעד
היחיד שדורש `--seed-url` (בלי הדגל, CLS עלה 0.001 → 0.578 ב-03/08). המסלול הזה
מיותר כאן, ומדידה אחת מראה למה: **הקובץ המקומי והתשובה החיה זהים**.

```
_deploy\torah-more30\torah\index.html   34,102 בייט
https://more30.com/torah/               34,338 בייט
Compare-Object שורה-מול-שורה: 4 שורות בלבד, כולן "Injection By NetFree"
```

כלומר 236 הבייטים הם הזרקת ה-proxy של הרשת המקומית, ולא הפרש תוכן. הקלקול הוא
טרנספורמציה אחת הפיכה, ולכן `cp1255.GetBytes(current)` הוא **בדיוק** מערך
הבייטים המקורי והתקין. בנייה מחדש הייתה מייצרת ציור מוקדם חדש ומכניסה את סיכון
ה-CLS בלי צורך.

בקרות שנעשו לפני הכתיבה, ואף אחת מהן אינה ניחוש:

| בקרה | תוצאה |
|---|---|
| הסיבוב הפיך ללא אובדן — `cp1255.GetString(UTF8.GetBytes(fixed)) -ceq original` | True |
| `<div` לפני / אחרי (הציור המוקדם) | 61 / 61 |
| `<script` לפני / אחרי | 4 / 4 |
| U+05F3 אחרי | 0 |
| הכותרת אחרי | `איגוד השיעורים · מערכת תורנית מאוחדת` |

היקף הקלקול נמדד ולא הונח: סריקת כל 661 הקבצים ב-`_deploy\torah-more30` מצאה
`index.html` בלבד. חבילות ה-JS מחזיקות 1–3 גרשים כל אחת — עברית לגיטימית
(`צ׳יפ`, `ר׳`), לא קלקול. גם `apps\01-torah-platform\index.html` ו-`dist\index.html`
נקיים לחלוטין (0), כלומר המקור מעולם לא נדבק והקלקול נכנס בשלב ההעתקה.

## אחרי הפריסה

`torah-more30`, `dpl_ax1hqCvr8aMPHZZ3dKYnL98RRtwP`, production, READY — מתיקיית
`_deploy\torah-more30` (לא `--prebuilt`).

```
GET https://more30.com/torah/?cb=after0813 -> 200, 29,186 בייט, U+05F3 = 0
<title>איגוד השיעורים · מערכת תורנית מאוחדת</title>
meta description: המערכת המאוחדת לאיגוד השיעורים, מועצות דתיות, ארגונים, בתי כנסת ומגידי שיעור.
<div> של הציור המוקדם: 61 (נשמרו)
/torah/assets/index-B2ayyksV.js  200
/torah/robots.txt                200
/torah/sitemap.xml               200
/torah/auth/reset                200
```

בדפדפן: `01-home-after.png`. שלוש שגיאות הקונסולה אינן קשורות לשינוי — שני
גופנים מ-`fonts.gstatic.com` (חסום מהמכונה הזאת) ו-`refresh_token` 400 של סשן
ישן בדפדפן הבדיקה.

## מה שונה בריפו, ולמה זה לא אותו דבר כמו התיקון

`_deploy` מוחרג ב-`.gitignore:43`, ולכן התיקון עצמו אינו קומיט. מה שכן קומיט
הוא סגירת הפער שאיפשר לזה לקרות פעמיים: `scripts/qa/mojibake-scan.mjs` נכתב
ב-b22e4d9 כדי שהבא לא יימצא במקרה — אבל הוא סורק `apps, portal, packages,
scripts, supabase` ומדלג במפורש על `dist`, ומעולם לא הסתכל על `_deploy`. שתי
המערכות שנדבקו נדבקו בדיוק שם, בקובץ שאין לו מקבילה ב-`public/` של האפליקציה כי
הוא תוצר של `prerender-spa.mjs` שהועתק ביד. הסריקה מכסה עכשיו גם
`_deploy/**/*.html` — רק `.html`, כי החבילות שלידו נבנות ממקורות שהסריקה כבר
קוראת.

הרצה אחרי השינוי:

```
scanned 3356 source files under: apps, portal, packages, scripts, supabase
scanned 21 served .html files under: _deploy
no double-encoded Hebrew found.   exit=0
```

ובקרה שהירוק הזה אומר משהו — אותו כלל אבחון על הבייטים שנשמרו כאן מלפני התיקון:

```
FLAGGED  lines=28  QA/torah/encoding-0813/before-deploy-index.html
FLAGGED  lines=28  QA/torah/encoding-0813/before-live-index.html
clean    lines=0   _deploy/torah-more30/torah/index.html
```

## קבצים

- `before-live-index.html` — 34,338 בייט, מה שהייצור הגיש בפועל לפני הנגיעה
- `before-deploy-index.html` — 34,102 בייט, העותק המקומי הזהה לו
- `01-home-after.png` — דף הבית אחרי, בדפדפן
