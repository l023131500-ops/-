# עימוד (04) — פונקציית ה-API לפריסה, 10/08/2026

‏`core.issues` #153. עד עכשיו לפריסה `_deploy/imud-more30` לא הייתה פונקציה
כלל: `vercel.json` הפנה את `/imud/:path*` אל `index.html`, ולכן
`/imud/api/books` החזיר 200 `text/html` — קליפת ה-SPA — והלקוח נכשל על
`JSON.parse` ולא על סטטוס. זו הצורה שקשה לראות מבחוץ, כי שום דבר לא 404.

## מה נוסף

* `api/index.ts` — אותם מסלולים כמו `apps/04-imud-torani/server/routes.ts`,
  כפונקציית Vercel אחת: `GET /api/meta`, `POST /api/wizard/infer`,
  `GET·POST /api/books`, `GET·PATCH·DELETE /api/books/:id`,
  `GET /api/books/:id/docx`.
* `api/_lib/{schema,templates,wizard,docx}.ts` — עותקים של מודולי האפליקציה.
  שינוי יחיד: ב-`docx.ts` הייבוא `@shared/schema` הפך ל-`./schema`.
* `api/_lib/storage.ts` — עותק של `server/storage.ts`, עם שני הבדלי הגדרה:
  לקוח Supabase נבנה כאן (בלי `ws`, אין realtime בפונקציה), וברירות המחדל
  של הסכימה/הטבלה הן `public.otvedaf_books` במקום `otvedaf.books`.
* `vercel.json` — `functions` + rewrites בצורת mechiron; הסטטי עבר ל-`public/`
  כדי שקבצי ה-TypeScript של הפונקציה לא יוגשו כקבצים סטטיים.

## מה אומת

`dispatch.txt` — `node scripts/qa/imud-api-dispatch.mjs`, 8/8 עוברים.
‏`/api/meta` מחזיר נתונים אמיתיים מהמודולים: 32 תבניות, 13 גופנים,
15 פונקציות, 4 שאלות. מסלול לא-מוכר מחזיר 404 JSON שנוקב בנתיב שביקשו —
הסימן שמבדיל בייצור בין הפונקציה הזאת לבין 404 של הפורטל (`text/plain`)
או קליפת SPA (`text/html`).

`typecheck.txt` — `tsc -p _deploy/imud-more30/tsconfig.check.json`. נותרה
שגיאה אחת, `rightTabStop` ב-`docx.ts:357`, והיא אינה של העותק: אותה שגיאה
מדווחת על המקור עצמו ב-`apps/04-imud-torani/server/docx.ts:356` תחת ה-`tsc`
של האפליקציה. `rightTabStop` אינו ב-`ITableOfContentsOptions` של `docx@8`,
כלומר הוא מאפיין עודף שנזרק בזמן ריצה. הושאר verbatim כדי שהעותק לא יסטה
מהמקור; התיקון שייך למקור.

## מה נשאר לפני שזה עובד בייצור — דורש את המשתמש

הטבלה `public.otvedaf_books` קיימת ומחזיקה 2 שורות אמיתיות
(`id` הוא identity BY DEFAULT, ולכן insert בלי id תקין), אבל היא מוגנת
ב-RLS **ללא policies** — נמדד: `rowsecurity=true`, 0 policies. כלומר anon
חסום לגמרי, ו-`service_role` הוא הדרך היחידה.

בפרויקט `imud-more30` ב-Vercel צריך להגדיר:

* `SUPABASE_URL`
* `SUPABASE_SERVICE_KEY`

בלעדיהם הפונקציה אינה מתרסקת בטעינה — היא מחזירה 500 עם שמות המשתנים
החסרים בגוף (נבדק: שלושת המסלולים שנוגעים במסד עושים בדיוק זאת). זו עדיין
תקלה, אבל כזו שאפשר לאבחן מהדפדפן, בניגוד למצב היום.

ואז — פריסה. עד אז הייצור עונה כמקודם.
