# 31 gesher — הפעולה העסקית היחידה של השותף נכתבה לעמודה שאסור לו לכתוב (#179), ומה שנמצא מתחתיה (#180)

**מתי:** 12/08/2026 · **מערכת:** 31 hebrew-bridge-crm (`gesher-more30`, `/gesher` על more30.com)
**קדימות:** §1ג / §8ב · **משתמש:** `test@more30.com` (משתמש הבדיקה הרשמי של §1ב)

---

## הקו הפתוח שממנו התחלנו

מה-heartbeat של 12:04, קו פתוח (1): `/partner/feedbacks` — מסך "בקרוב" אחרון באזור השותפים,
"ועליו יושב `partner_feedback_notes` שכבר קיים בטבלה".

בדרך לבנות אותו נקראה סכימת הטבלה, ושם התברר ש-`partner_feedback_notes` איננה סתם עמודה
שקיימת: היא **העמודה היחידה** ב-`partner_assignments` ש-`authenticated` רשאי לכתוב אליה.
מיגרציה `20260605003212`:

```sql
-- 5. partner_assignments — partners may only update partner_feedback_notes
REVOKE UPDATE ON public.partner_assignments FROM authenticated;
GRANT UPDATE (partner_feedback_notes)
  ON public.partner_assignments TO authenticated;
```

אף מיגרציה מאוחרת יותר אינה מחזירה את `treatment_status` (נסרקו כל 16 המיגרציות).
והמסך שנפרס שעה קודם לכן, `/gesher/partner/clients`, מציע לשותף פעולה עסקית אחת בדיוק —
תפריט "סטטוס טיפול" — וכותב אותה דרך הקליינט של הקורא:

```ts
const { error } = await supabase                       // ← הקורא, לא service_role
  .from("partner_assignments")
  .update({ treatment_status: data.status })
```

Postgres בודק הרשאת־עמודה **לפני** RLS, ולכן זה לא תלוי בכלל בשאלה איזו שורה נבחרה.

## המדידה (`probe-column-grant.mjs`, קריאה בלבד)

מול הייצור של gesher, מחובר כ-`test@more30.com`, עם `id` שאינו מתאים לאף שורה —
בדיקת ההרשאה עדיין נורית, ושום דבר לא משתנה:

```
treatment_status         HTTP 403  DENIED  {"code":"42501", ...
                                  "message":"permission denied for table partner_assignments"}
partner_feedback_notes   HTTP 204  allowed  (empty body)
```

זו לא תיאוריה מהמיגרציות: זה מה שהייצור עונה. כל שותף שהיה נוגע בתפריט הזה היה מקבל
`permission denied for table partner_assignments` ב-toast.

**להשוואה:** אותה מלכודת בדיוק נזהרו ממנה בטבלת `tasks` — מיגרציה `20260610113503` עשתה
`REVOKE UPDATE` ואז `GRANT UPDATE (status, priority, updated_at)`, ו-`updateTaskStatus` /
`updateTaskPriority` כותבים בדיוק את העמודות האלה. לוח המשימות של השותף תקין.
ב-`partner_assignments` פשוט לא החזירו את ה-GRANT.

## התיקון

ה-REVOKE הזה מכוון — הוא מונע משותף להזיז את השורה שלו בעצמו במשפך, ולשכתב `partner_id`
מעבר ל-policy שהוא `USING`-only. לכן **לא** הוחזר GRANT. במקום זה: בדיקת הבעלות נשארת אצל
הקורא (policy "Partners read own assignments" מצמצם, ולכן שורה זרה ושורה לא-קיימת שתיהן
עונות `Forbidden`), והמעבר הלגיטימי היחיד מתבצע כ-`service_role`, על עמודה אחת, אחרי הבדיקה.

## אימות

- `npx tsc --noEmit` — 0. אומת שהוא באמת בדק: `--listFiles` = 1175 קבצים, ובהם
  `src/lib/partner.functions.ts` (ה-tsconfig בשורש הריפו הוא `"files": []` ולא בודק כלום).
- `npm run build` — 0, נבנה ב-17.61s. ה-chunk הבנוי `partner.functions-ClxU32zg.mjs` נושא
  `await import("./client.server-...")` ואז `supabaseAdmin...update({treatment_status})`.
- נפרס לייצור מהמקור (לא `--prebuilt`, כדי ש-`vercel.json` ייצא):
  `dpl_7rE8idUbbyMaAZQukAD8ER8QTKt8`, production, READY.
- `verify-production.mjs` — קורא ל-server function האמיתי על more30.com אחרי הפריסה.
  ה-RPC אינו JSON רגיל: הקליינט מקודד seroval (ראה `E1`/`X0`/`Z0` ב-bundle), ופייטלואד
  רגיל חוזר כ-`Seroval Error (step: 3)`; הסקריפט משתמש באותו serializer שהאפליקציה מגיעה איתו.
  התוצאה: **HTTP 200, `Forbidden`** — ההנדלר רץ בייצור, שער הבעלות מחזיק, ואין 42501.

## מה לא אומת, ונרשם ככזה

הכתיבה עצמה (`service_role` על שורה אמיתית) **לא הורצה**. אין כאן חשבון שותף ואין
שיוך אמיתי — אותו חסם שנרשם ב-11:49 וב-12:04. יצירת שיוך גם אינה אפשרית מכאן: ל-
`partner_assignments` אין policy ל-INSERT מלבד "Admins manage assignments".

---

## ומה שנמצא מתחת לזה — #180, חמור יותר

התיקון מעביר את הכתיבה ל-`supabaseAdmin`. לפני שסומכים על זה, נשאלה השאלה אם
`supabaseAdmin` בכלל עובד בייצור של gesher. **הוא לא.**

1. ה-bundle **הבנוי** (`client.server-D5ro3rAQ.mjs`) קורא `process.env.SUPABASE_SERVICE_ROLE_KEY`
   בזמן ריצה — הערך אינו מוטמע בבנייה — וזורק אם הוא חסר.
2. `npx vercel env ls` על `gesher-more30` מחזיר **בדיוק שני משתנים**, בשלושת ה-scopes:

```
 name                        environments
 SUPABASE_URL                Production, Preview, Development
 SUPABASE_PUBLISHABLE_KEY    Production, Preview, Development
```

אין `SUPABASE_SERVICE_ROLE_KEY`. לכן כל גישה ראשונה ל-`supabaseAdmin` בייצור זורקת
`Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY`.

מה שזה מפיל, לפי 40 אתרי הקריאה של `supabaseAdmin` במקור: כל פאנל האדמין
(`admin.functions`, `categories`, `topics`, `professionals`, `custom-fields`, `webhooks`,
`communication`), טופס הלידים הציבורי `/api/public/leads/submit`, `listMyClients` ברגע
שלשותף יש שיוך אחד, `getClientDashboard` ללקוח שיש לו שותף משויך, ומחיקת קובץ מהאחסון.

**גם זה לא נמדד בזמן ריצה, ונרשם ככזה.** אין נתיב בייצור שמגיע ל-`supabaseAdmin` בלי
לכתוב: שני הנתיבים הקריאים מותנים בשיוך, ול-`test@more30.com` אין שורה ב-`partner_assignments`
(`probe-assignments.mjs` → `200 []`), וכל השאר כותבים — `/api/public/leads/submit` היה יוצר
ליד אמיתי ומכניס `new_lead` ל-`outbox_queue`, ולכן לא הורץ (מצב טסט). הראיה הסטטית משני
המקורות הבלתי-תלויים למעלה מספיקה, והמדידה בזמן ריצה מחכה למשתמש.

**חסום על המשתמש:** להוסיף `SUPABASE_SERVICE_ROLE_KEY` ל-`gesher-more30` (Production +
Preview + Development) מתוך Supabase `ygaqqnuyfnumezxxmtbh` → Settings → API. המפתח אינו
נגיש מכאן.

## מצב טסט

לא נוצר משתמש, לא נשלחה הודעה, לא בוצע חיוב, ולא נכתבה אף שורה לאף טבלה של 31 —
שתי בדיקות ה-PATCH כוונו ל-`id` שאינו קיים. המערכות המוגנות (08, 09, `bkalut-app`,
`bkalot-admin`, `zr_*`, `NEDARIM3873`) לא נגעו; לא נעשה שימוש בסכמות `csj`/`csj_src`/`igud`.

## קבצים

| קובץ | מה הוא |
|---|---|
| `probe-column-grant.mjs` | מודד את הרשאת העמודה מול הייצור. חוזר להרצה, לא כותב כלום. |
| `verify-production.mjs` | קורא ל-server function בייצור אחרי הפריסה (payload בקידוד seroval). |
| `probe-assignments.mjs` | מראה של-`test@more30.com` אין שיוך — ולכן אין נתיב קריא ל-`supabaseAdmin`. |
