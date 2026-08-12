# 35 kioskfleet — המערכת האחת שהסריקה הקודמת השאירה בחוץ — 12/08/2026

**מה נמדד.** `QA/platform/server-side-binding-0812` שאל את סביבת הייצור של 11
מערכות ב-Vercel לאיזה פרויקט Supabase הן מדברות, ורשם במפורש בשורה הפתוחה (3):
**"35 kioskfleet יושבת על Railway ולא נמדדה כאן"**. זה סוגר את השורה הזו.

קריאה בלבד: לא נפרס דבר, לא נכתב דבר ל-Railway/Supabase/אתר, ולא נוצר משתמש.
ה-login היחיד מנפיק token ואינו כותב כלום.

סקריפט חוזר: `scripts/qa/kiosk-railway-binding.mjs` · תוצאות: `_results.json`

---

## התוצאה: אין לה חיבור Supabase בכלל, וזה לא פער — זו הארכיטקטורה

לשירות `kioskfleet` בייצור יש **10 משתני סביבה משלו, ואפס מהם Supabase**:

    BASE_PATH  DB_PATH  JWT_SECRET  KIOSK_ENV  NODE_ENV
    OFFLINE_AFTER_MINUTES  PUBLIC_URL  SEED_ADMIN_PASSWORD  SEED_ADMIN_USER  WS_HOST

הנתונים שלה יושבים ב-**SQLite בקובץ שעליו מצביע `DB_PATH`, על ה-volume
המחובר ב-`/app/data`** — לא במסד משותף. לכן היא לא הייתה אמורה להופיע בסריקה
של פרויקטי Supabase מלכתחילה, ו-`core.projects` צדק עליה:

| שדה | רישום | מדידה |
| --- | --- | --- |
| `supabase_project` | `null` | אין ולו משתנה Supabase אחד ✔ |
| `supabase_schema` | `null` | ✔ |
| `deploy_target` | `railway` | ✔ |
| `live` / `is_deployed` | `true` | `/api/health` → 200 ✔ |

**לא שיניתי את הרישום.** ההבדל מול אתמול הוא שהוא כבר לא הנחה — הוא נמדד.
זו התשובה ההפוכה מ-34 kesef מהסריקה הקודמת: שם הרישום נוקב בפרויקט והחיבור
חסר; כאן הרישום ריק **והוא אמור להיות ריק**.

## §1ב נבדק אגב אורחא, ומחזיק

`POST /kiosk/api/auth/login` עם `admin` / `More30Admin2026` → **200**, עם JWT
ו-`{"id":1,"username":"admin","role":"admin","fullName":"מנהל מערכת"}`.

זה לא מובן מאליו: ה-volume שורד כל פריסה, ולכן כל דבר בצורת "seed on first
run" רץ פעם אחת מזמן ומאז `SEED_ADMIN_*` הפסיקו להשפיע בלי אף boot כושל.
התיאום-בכל-עלייה שנוסף ב-12/08 הוא מה שמוחזק כאן — נמדד, לא הונח.

`/api/health` מחזיר גם `basePath: "/kiosk"`, כלומר קידומת ה-mount נכונה בצד
השרת ולא רק ב-rewrite.

## הצי ריק, וזה הנתון

`GET /kiosk/api/devices` → `{"devices":[]}`. אפס מכשירים רשומים. זה נתון אמת,
לא כשל: המערכת חיה, האדמין נכנס, ואף מכשיר לא נרשם אליה עדיין.
`/api/users` ו-`/api/groups` מחזירים 404 — הם לא קיימים במנוע הזה.

## מה לא נמדד, ונרשם ככזה

- **הערכים** של `DB_PATH`, `SEED_ADMIN_*`, `JWT_SECRET` — Railway מחזיר
  ל-OAuth app שמות בלבד (`valuesRedacted: true`). נמדד שהם קיימים, לא מה הם.
  זה מקביל ל-`[SENSITIVE]` של Vercel, אבל **לא חוסם כאן**: זהות מסד הנתונים
  ידועה מסוג האחסון, לא מהערך.
- **רישום מכשיר בפועל** — הצי ריק ולא נרשם מכשיר. שאלה נפרדת מהחיבור.
- **מקור השרת ב-`l023131500-ops/zol`** לא נקרא מחדש בצעד הזה; מה שנקרא הוא
  תצורת Railway (repo/branch/rootDirectory/volume), והיא תואמת את הידוע.

## הקואורדינטות, נעוצות

    project      776b3989-21c4-40d7-8232-893cf169ed3d
    service      93efbfc0-bb13-4ccb-af69-2807a7bd693c
    environment  04950e10-9fa7-4e7c-a7df-fa989c46696d
    source       l023131500-ops/zol @ claude/what-do-you-see-gxo5tc  (root: kiosk/server)
    volume       /app/data
    domains      kiosk.more30.com · kioskfleet.more30.com · kioskfleet-production.up.railway.app

אמת דרך `more30.com/kiosk` בלבד — NetFree עונה 418 ל-`*.up.railway.app`
מהמכונה הזו.
