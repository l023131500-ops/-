# מפתחות חסרים — מצב מאומת, 26/07/2026

לכל שורה: **מה** · **למה** · **איפה משיגים** · **איפה מדביקים**. אין כאן ערכי סוד —
רק שמות ומיקומים. המקור הרץ: `core.missing_tokens` (Supabase uhnrgujb).

> **איך נבדק:** לכל פריסה מקבילה תחת `more30.com/<נושא>` נקראה רשימת משתני הסביבה
> בפרודקשן דרך ה-CLI, והנקודות קצה נבדקו חיות דרך more30.com. מה שכתוב כאן הוא מה
> שבאמת חסר — לא מה שהיה חסר פעם.

---

## 🔴 שלוש פריסות שאין להן **אף** משתנה סביבה

אלה היחידות שחסימה אמיתית מונעת מהן לעבוד. הפריסה עצמה קיימת, בנויה ומחזירה 200 —
רק ה-env ריק.

### 02 · tamlul → `tamlul-more30`
מסלולי ה-API נפרסו וקיימים (GET מחזיר 405, כלומר המסלול שם), אבל `/api/jobs`
מחזיר **500** כי אין לו כלום.

| משתנה | למה | להשיג |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת bieebmnm ללקוח | Supabase bieebmnm → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon ללקוח (ציבורי) | אותו מקום |
| `SUPABASE_SERVICE_ROLE_KEY` | פעולות שרת · **סוד** | אותו מקום → `service_role` |
| `OPENAI_API_KEY` | מנוע התמלול | קיים אצלך במערכת החיה igud-transcribe |
| `GOOGLE_CLIENT_ID` / `_SECRET` | התחברות Google (לא חוסם) | https://console.cloud.google.com/apis/credentials |

**להדביק:** Vercel → `tamlul-more30` → Settings → Environment Variables (Production).
אחרי ההזנה צריך **redeploy** — `NEXT_PUBLIC_*` נצרבים בזמן build.

### 03 · modaot → `modaot-more30`
⚠️ **כאן חסר יותר ממפתח.** בפריסה המקבילה **כל** מסלולי ה-API מחזירים 404
(`/api/templates`, `/api/projects`, `/api/notifications/unread-count`) למרות ש-40
מסלולים קיימים במקור — הפריסה מכילה 4 lambdas בלבד, כלומר עץ הקבצים שנשלח היה חלקי.
**קודם צריך פריסה מחדש, ורק אחריה המפתחות יעזרו.** ראה ההצעה המפורטת ב-
`core.projects` (03 → `fixed_notes`) — היא נוגעת בסליקה ולכן לא בוצעה.

| משתנה | למה |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | הלקוח |
| `SUPABASE_SERVICE_ROLE_KEY` | פעולות שרת · **סוד** · ⚠️ ראה אזהרת הסליקה |
| `OPENAI_API_KEY` | יצירת תוכן מודעות |

### 30 · crm → `crm-more30`
המסכים עולים (SSR מלא בעברית), אבל `/api/public/*` (n8n, ניתוח תלוש) אינרטיים.

| משתנה | למה | הערה |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | של פרויקט `jhbeelzv` | **לא הצלחתי לשלוף** — הפרויקט אינו בחשבון ה-Supabase שלי |

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
