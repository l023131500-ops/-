# מפתחות חסרים — מצב מאומת, 26/07/2026

לכל שורה: **מה** · **למה** · **איפה משיגים** · **איפה מדביקים**. אין כאן ערכי סוד —
רק שמות ומיקומים. המקור הרץ: `core.missing_tokens` (Supabase uhnrgujb).

> **איך נבדק:** לכל פריסה מקבילה תחת `more30.com/<נושא>` נקראה רשימת משתני הסביבה
> בפרודקשן דרך ה-CLI, והנקודות קצה נבדקו חיות דרך more30.com. מה שכתוב כאן הוא מה
> שבאמת חסר — לא מה שהיה חסר פעם.

---

## ✅ מה הושלם ב-27/07 בלי PAT

המפתחות נשלפו מקבצי `.env.local` של העותקים המקומיים ב-`apps/` — לא מ-Management API
(אין PAT; ראה למטה). כל מפתח **נבדק לפני ההזנה**.

| מערכת | הוזן ל | משתנים |
|---|---|---|
| 02 tamlul | `tamlul-more30` | `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `OPENAI_API_KEY` |
| 03 modaot | `modaot-more30` | אותם שלושה |

`tamlul-more30` גם **נפרס מחדש** בהצלחה. `modaot-more30` לא — ראה למטה.

> **איך בודקים תקפות של מפתח Supabase (חשוב):** לא מול `/rest/v1/` — השורש מחזיר
> 401 גם למפתח תקף. לשאול טבלה שבוודאות לא קיימת:
> `404`/`PGRST205` = המפתח **תקף**, `401` = המפתח **פסול**.
> בבדיקה הזו כל 12 המערכות עם מפתח מוטמע נמצאו **תקפות** — אין רגרסיה בשום מערכת חיה.

---

## 🔴 מה שנשאר חסום

### 02 · tamlul → `tamlul-more30` — **מפתח אחד בדיוק**
הכול מוזן ופרוס; `/tamlul` ו-`/tamlul/login` = 200. נשאר רק:

| משתנה | למה | להשיג |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `/tamlul/api/jobs` נופל עם `Error: supabaseKey is required` (מלוג הריצה) | Supabase **bieebmnm** → Settings → API → `service_role` |

⚠️ **העותק המקומי של המפתח הזה בוטל.** ה-`sb_secret_Srmojy…` שמופיע ב-
`apps/01,02,03,18/.env.local` מחזיר 401, בעוד ה-anon של אותו פרויקט תקף — כלומר הוא
סובב. צריך להנפיק/להעתיק מפתח **חדש** מהדשבורד.

| `GOOGLE_CLIENT_ID` / `_SECRET` | התחברות Google (לא חוסם) | https://console.cloud.google.com/apis/credentials |
|---|---|---|

### 03 · modaot → `modaot-more30` — **צריך החלטה שלך, לא רק מפתח**
המשתנים הוזנו, אבל **לא פרסתי מחדש במכוון.** בפריסה הנוכחית כל מסלולי ה-API
מחזירים 404 (4 lambdas מתוך 40 מסלולים) — פריסה מחדש תתקן את זה, אבל:

`vercel.json` של 03 מגדיר **שני crons** — `jobs/worker` **כל דקה** ו-`jobs/cleanup`
יומי. פריסה מחדש מפעילה אותם גם בעותק המקביל, ואם יוזן גם `service_role` — שני
עותקים יעבדו במקביל על אותן עסקאות סליקה.

**ההמלצה שלי:** לפרוס מחדש עם ה-crons מנוטרלים ובלי `service_role`. אז המסכים
הציבוריים והקריאה יעבדו, והכתיבה/סליקה נשארות רק במערכת החיה.

### 30 · crm → `crm-more30`
| משתנה | הערה |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` של `jhbeelzv` | לא קיים באף עותק מקומי (`apps/30/.env` = anon בלבד) ולא בחשבון שלי |

### 22 · zchuyot
| משתנה | הערה |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` של `trerolyv` | לא קיים באף עותק (`apps/22/.env.local` = OPENAI בלבד). הסוכן עצמו עובד — זה חוסם רק כתיבה/אדמין |

---

## למה לא דרך Management API
אין PAT בסביבה הזו: אין `SUPABASE_ACCESS_TOKEN`, ה-Supabase CLI לא מותקן, אין
תיקיית הגדרות שלו, ואין מחרוזת `sbp_` בשום קובץ. חיבור ה-Supabase שלי הוא MCP דרך
החשבון, והוא חושף **פרויקט אחד** — `uhnrgujb`. `bieebmnm`, `trerolyv`, `jhbeelzv`
ו-`csjekrvu` שייכים לחשבון/ארגון אחר. גם `vercel env pull` מהפרויקטים החיים לא עוזר:
הערכים מוגדרים Sensitive וחוזרים כ-`[REDACTED]`.

---

## 🟡 מפתחות שצריך להנפיק מחדש (נחשפו)

| # | משתנה | למה נחשף | פעולה |
|---|---|---|---|
| 27 | `YEMOT_API_KEY` | היה כתוב בערך מלא בתוך `.env.example` של המערכת | להנפיק חדש ב-call2all, ולא להחזיר לקובץ example |
| 27 | `ELEVENLABS_API_KEY` | אותו קובץ | להנפיק חדש ב-elevenlabs.io |
| 06 | סיסמת האדמין של `/briut/admin.html` | מוגשת בטקסט גלוי ב-`admin.js` הציבורי | לשנות, ורצוי לעבור ל-Supabase Auth |

---

## 🔴 תיקון הרשאות (לא מפתח) — 06 briut

`anon` יכול **לקרוא** את `public.kupot_leads` (נבדק חי, מחזיר 200). הטבלה ריקה כרגע,
כלומר עדיין לא דלף דבר — אבל כל ליד עתידי (שם, טלפון, מייל) יהיה קריא לכל מי
שמחזיק את ה-anon key, שמופיע בקוד העמוד. הפרויקט `csjekrvu` אינו בחשבון ה-MCP שלי
ולכן לא יכולתי לתקן.

```sql
-- Supabase csjekrvu → SQL Editor
revoke select on public.kupot_leads from anon;
-- ולוודא שנשארת מדיניות INSERT ל-anon, אחרת טופס הפנייה יישבר:
--   select policyname, cmd from pg_policies where tablename = 'kupot_leads';
```

---

## 🟢 מה שכבר מוזן ואומת — אין מה לעשות

| # | פרויקט Vercel | מוזן |
|---|---|---|
| 17 | `chizukim2-more30` | `OPENAI_API_KEY`, `APP_BASE_PATH`, `VITE_API_BASE` |
| 18 | `orech-more30` | `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_*` |
| 22 | `zchuyot-more30` | `ANTHROPIC_API_KEY`, `AI_MODEL`, `RIGHTS_SUPABASE_*` |
| 28 | `kupot-more30` | `ADMIN_TOKEN`, `ANTHROPIC_*`, `SUPABASE_*`, `API_PATH_PREFIX` |
| 26 | `studio-more30` | `ANTHROPIC` + `GEMINI` + `RECRAFT` + `SUPABASE_*` |
| 27 | `mechiron-more30` | `SUPABASE_URL` + `SUPABASE_ANON_KEY` |
| 32 | `nadlan-more30` | 10 משתנים כולל `DATAGOV_SCHOOLS_RESOURCE` (אומת: 3,329 רשומות) |
| 33 | `more30-portal` | `ANTHROPIC_API_KEY`, `AI_MODEL`, `SUPABASE_*` |

`briut-more30`, `torah-more30` ושאר האתרים הסטטיים אינם צריכים env — הם מדברים
ישירות עם Supabase דרך anon שמוטמע בבאנדל, וזה המצב הנכון עבורם.

---

## 🔧 פעולה אחת שלך שאינה מפתח — התחברות לניהול

Supabase `uhnrgujb` → Authentication → URL Configuration → Redirect URLs →
להוסיף `https://more30.com/**`. בלי זה קישור ההתחברות לניהול (`more30.com/nihul`)
חוזר ל-Site URL שנטפרי חוסמת, הסשן נוצר במקום שלא נגיש, וכפתור "שלח לניתוח AI"
מחזיר 401.

---

## היכן מדביקים — לפי סוג שירות
- **Vercel:** Project → Settings → Environment Variables → Production (ואז redeploy)
- **Supabase Edge Functions:** Project → Edge Functions → Secrets
- **Supabase service_role:** Project → Settings → API → `service_role` — **סוד**, רק ב-env

> ערכי סוד לא נמצאים בגיט ולא יימצאו בו. הזנה ידנית לכל שירות בלבד.
