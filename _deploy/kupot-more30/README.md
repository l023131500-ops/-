# kupot-more30 — מה חייב להיות כאן, ולמה

> ## ⚠️ 10/08 — העץ הזה **מקדים את הייצור**, ואינו משקף אותו יותר
>
> עד היום התיקייה הזאת שיקפה את מה שחי. עכשיו לא: הבנייה של `6551b75`
> (‏`core.issues #154` — שתי הכתיבות שבדף הלכו לפורטל) שוכנה כאן, והפריסה
> **נדחתה במכסה** — `api-deployments-free-per-day` (‏`core.issues #83`).
> ההעלאה הצליחה (2.3MB) והשחרור לא, ולכן הייצור לא זז: עדיין
> `index-BlT4DUpe.js`, ‏`textLen` 3,157, אפס שגיאות קונסולה.
>
> **מה מוכן כאן:** `kupot/` מ-`dist/public` (‏`index-DbBm6hnF.js`),
> `api/index.js` החדש (‏1,820,578 בייט, נושא את ברירת המחדל
> `API_PATH_PREFIX ?? "/kupot"`), ו-`vercel.json` עם `/kupot/api/(.*)` לפני
> ה-catch-all. הכל נבדק מול הייצור לפני השיכון: ‏`index.html` החדש זהה בתוכן
> לזה שחי חוץ משם החבילה — ‏`QA/platform/kupot-deploy-0810/_results.json`.
>
> **הפריסה הבאה היא פקודה אחת, בלי בנייה ובלי העתקה נוספת:**
>
> ```
> cd _deploy/kupot-more30
> vercel deploy --prod --yes --scope l023131500-ops-projects
> ```
>
> **ומיד אחריה, לפני שעוזבים** — ‏`/kupot/api/hf/meta` חייב לחזור
> `application/json` ולא `text/html`, ו-`node scripts/qa/system-facts.mjs kupot`
> חייב להישאר על `textLen` 3,157. ירידה חדה פירושה שה-API נעלם, והחזרה היא
> `npx vercel promote https://kupot-more30-aiwtncgj7-l023131500-ops-projects.vercel.app --scope l023131500-ops-projects --yes`.
>
> **מה זה משנה לכל מי שיפתח את התיקייה עד אז:** אי אפשר להשתמש בה כבסיס
> להשוואה מול הייצור, כי היא כבר לא הוא. הבסיס האמין היחיד הוא
> `more30.com` עצמו.

התיקייה הזאת החזיקה **רק** את הבנייה הסטטית, בזמן שהפרודקשן מגיש גם
`/api/hf/*` מפונקציית serverless. פריסה ממנה במצב הזה **מחקה את ה-API**:
הטקסט בדף צנח מ-3,157 תווים ל-513, ושתי הקריאות שהאתר עושה בטעינה החזירו 404.
האתר נראה חי — הוא החזיר 200 — ופשוט לא היה בו תוכן.

## מה חייב להיות בעץ

| קובץ | מקור | למה |
|---|---|---|
| `kupot/` | `apps/28-kupot-health-funds/dist/public` אחרי `npx vite build --base=/kupot/` | האתר מותקן על נתיב, והפורטל מנתב `/kupot` לכאן |
| `api/index.js` | `apps/28-kupot-health-funds/api/index.js` | **תוצר בנייה** של `script/build-vercel-fn.ts`, לא מקור — מעתיקים, לא עורכים |
| `hf_data_export.json` | שורש האפליקציה | הפונקציה קוראת אותו; בלי `includeFiles` הוא לא נארז איתה |
| `vercel.json` | כאן | מאחד את ה-rewrite של `/api` עם זה של `/kupot` |
| `package.json` | כאן | `"type": "module"` בלבד — ראה למטה |

## למה יש כאן `package.json` ריק כמעט

`api/index.js` הוא חבילת ESM. בלי `"type": "module"` בשורש הפריסה, Vercel
מתרגם אותה ל-CommonJS — וזה מופיע בלוג הבנייה כ**אזהרה**, לא כשגיאה:

> Node.js functions are compiled from ESM to CommonJS. If this is not intended,
> add `"type": "module"` to your package.json file.

הבנייה מסתיימת בהצלחה, הפריסה עולה, והפונקציה נופלת רק בזמן ריצה — `/api/hf/*`
מחזיר 500. כלומר הסימן היחיד לפני הפריסה הוא שורה שנראית שפירה בלוג. תיקיית
האפליקציה מגדירה `"type": "module"`, ולכן הפריסה משם עבדה והפער הזה לא היה
גלוי.

## מה **לא** לעשות

- אל תפרוס מתיקיית האפליקציה עצמה. יש בה `vercel.json` משלה עם
  `outputDirectory: dist/public`, והיא מגישה את האתר בשורש — בזמן שהפורטל
  מנתב ל-`/kupot/`. התוצאה היא 404 מלא.
- אל תבנה בלי `--base=/kupot/`. ה-`vite.config.ts` מגדיר `base: "./"`, שעובד
  גם בשורש וגם בנתיב, אבל הפרודקשן מגיש הפניות מוחלטות (`/kupot/assets/...`)
  ולכן זו הצורה שמשחזרת אותו.

## איך לוודא לפני שפורסים

```bash
node scripts/qa/system-facts.mjs kupot     # לפני
# ... פריסה ...
node scripts/qa/system-facts.mjs kupot     # אחרי
```

`textLen` הוא הסימן המהיר: ירידה חדה פירושה שה-API נעלם. אם זה קרה —
`npx vercel promote <previous-prod-url> --scope l023131500-ops-projects --yes`.

הסימן שהעץ אינו מייצג את הפרודקשן: `npx vercel ls kupot-more30` מראה שהפריסה
החיה ישנה מכל שינוי מקומי.
