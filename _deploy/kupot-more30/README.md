# kupot-more30 — מה חייב להיות כאן, ולמה

> ## ✅ 10/08 14:01Z — נפרס. העץ הזה **שוב משקף את הייצור**
>
> האזהרה שעמדה כאן — "העץ מקדים את הייצור" — בוטלה: אותה פקודה בדיוק שנדחתה
> ב-11:47Z במכסה (`api-deployments-free-per-day`, ‏`core.issues #83`) התקבלה
> ב-14:00Z. החלון המתגלגל שחרר משבצת; לא היה כאן שום ליקוי בקוד.
> ‏`dpl_AyL2TUY2T2ycfkRoE3JhPgsDJkcD` · `READY` · production.
>
> **מה שהשתנה בייצור:** ‏`index-BlT4DUpe.js` → `index-DbBm6hnF.js`, ושלושת
> המסלולים שנבלעו ב-catch-all של ה-SPA עונים עכשיו מהפונקציה:
>
> | מסלול | לפני | אחרי |
> |---|---|---|
> | `GET /kupot/api/hf/meta` | ‏200 `text/html` (קליפת SPA) | ‏200 `application/json`, ‏1,875 בייט |
> | `POST /kupot/api/agent` | ‏200 `text/html` | ‏400 `application/json` — «Required at "topicId"…» |
> | `POST /kupot/api/switch-lead` | ‏200 `text/html` | ‏400 `application/json` — «Required at "fullName"…» |
>
> ה-400 הוא ההוכחה ולא כשל: שתי הכתיבות נשלחו `{}` ריק בכוונה, ורק המטפל של
> האפליקציה עצמה יודע לקרוא לשדות בשמותיהם. משלוח גוף תקין ל-`switch-lead`
> היה כותב ליד אמיתי במערכת חיה.
>
> **הבדיקה שאחרי הפריסה עברה:** ‏`textLen` נשאר 3,157 (הסימן שה-API לא נעלם —
> פריסה גרועה בעבר הפילה אותו ל-513), אפס שגיאות קונסולה, והעמוד מצייר את
> המספרים של הפונקציה: 435 נושאים · 65 זכויות ממשלה · 15 עמותות.
> ‏`QA/platform/kupot-deploy-0810/_results-shipped.json` · `prod-after-deploy.png`.
>
> **החזרה, אם פריסה עתידית תשבור:**
> `npx vercel promote https://kupot-more30-aiwtncgj7-l023131500-ops-projects.vercel.app --scope l023131500-ops-projects --yes`
>
> הפקודה לפריסה הבאה מכאן נשארת אחת, בלי בנייה ובלי העתקה:
>
> ```
> cd _deploy/kupot-more30
> vercel deploy --prod --yes --scope l023131500-ops-projects
> ```

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
