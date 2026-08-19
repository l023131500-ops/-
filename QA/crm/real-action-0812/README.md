# §8ב — "פעולה אמיתית עובדת": בוצעה בפועל על 30 crm ועל 31 gesher

**12/08/2026 · דפדפן אמיתי מול more30.com · מצב טסט · לא נפרס כלום**

## הקו הפתוח שנסגר כאן

הפעימה של 10:25 מדדה **לאן נוחת הלקוח** אחרי התחברות על 21/30/31, ורשמה
במפורש בסעיף "מה לא נמדד":

> **לא בוצעה פעולה עסקית אמיתית** בתוך שתי המערכות שעברו — נמדדה
> הנחיתה, לא "פעולה אמיתית עובדת" שבסוף §8ב.

מאז הוא חזר בכל heartbeat כקו פתוח (3): "זנב §8ב — פעולה עסקית אמיתית
בתוך 30/31 לא בוצעה". כאן היא בוצעה — פעם אחת בכל אחת מהשתיים, עם
משתמש הבדיקה הרשמי של §1ב (`test@more30.com`).

**התוצאה מפוצלת: 30 עוברת מקצה לקצה. 31 נכשלת, בשקט, ועם שורש ידוע.**

---

## 30 crm — ✅ עוברת מקצה לקצה

הפעולה: **יצירת לקוח חדש** (`/crm/clients/new` → "צור לקוח").

| שלב | תוצאה |
|---|---|
| טופס | שם פרטי "בדיקת" · שם משפחה "QA 12/08" · טלפון 050-0000000 · אימייל test@more30.com · הערות "רשומת QA אוטומטית — אימות §8ב" |
| שליחה | ניווט מיידי ל-`/crm/clients/a08da34d-9ebc-4bc2-a432-c01eb982f3b3` |
| תיק הלקוח | **מספר תיק 2026-000001** נוצר אוטומטית, סטטוס "ממתין", ו-11 לשוניות פעילות (פרטים אישיים · משפחה · פיננסי · דיור וחשבונות · רכבים · זכאויות · משימות · ציר זמן · תקשורת · מסמכים · הפניות לשת״פ) |
| התמדה | `/crm/clients` אחרי ניווט מחדש: הרשומה בטבלה, והמונים עלו מ-0 ל-**סה״כ 1 · ממתינים 1 · חדשים החודש 1** |
| התפשטות | `/crm/dashboard`: "לקוחות חדשים החודש **1**", ובפיד "פעילות אחרונה" — *"לקוח חדש נוסף · בדיקת QA 12/08 · עכשיו"* |

"לקוחות פעילים 0" אינו באג — הסטטוס שנוצר הוא "ממתין", לא "פעיל".
המונים שהראו "—" בצילום `01` הם מצב טעינה לפני שהנתונים הגיעו.

📸 `01-dashboard-before.png` · `02-form-filled.png` · `03-client-created.png`
· `04-list-persisted.png` · `05-dashboard-after.png`

**מסקנה ל-30:** §8ב מסתיים בהצלחה — הלקוח נכנס למוצר, מבצע פעולה
עסקית אמיתית, והיא נשמרת ומתפשטת לכל המסכים התלויים בה.

---

## 31 gesher — ❌ נכשלת: הכספת קולטת מסמך ומאבדת אותו בשקט

הפעולה: **העלאת מסמך לתיק המסמכים המאובטח**
(`/gesher/client/documents`).

מבין שלושת מסכי הלקוח, זה היחיד שיש בו פעולה אמיתית:
- `/gesher/client/status` — קריאה בלבד (ציר התקדמות).
- `/gesher/client/consents` — **מסך "בקרוב"**, placeholder, אין בו פעולה.
  📸 `06-gesher-consents-before.png`
- `/gesher/client/documents` — העלאת קובץ. 📸 `07-gesher-documents.png`

הועלה `sample.pdf` (2188 בתים, PDF תקין) עם תיאור
"מסמך QA — אימות §8ב, 12/08/2026, מצב טסט".

**מה שהמסך מראה:** שדה התיאור מתאפס לplaceholder, ומתחת ל"מסמכים
שהועלו" נשאר *"עדיין לא הועלו מסמכים"*. **אין הודעת שגיאה. אין toast.
אפס שגיאות בקונסול.** גם אחרי רענון מלא של העמוד — עדיין ריק.
📸 `08-gesher-upload-result.png` · `09-gesher-after-reload-still-empty.png`

### אבל ההעלאה כן הצליחה — חצי ממנה

הרשת אומרת משהו אחר ממה שהמסך אומר:

| # | בקשה | תוצאה |
|---|---|---|
| 64 | `POST …supabase.co/storage/v1/object/client-documents/<uid>/df064ea8-…-sample.pdf` | **200** — הקובץ עלה לאחסון |
| 65 | `POST /gesher/_serverFn/4f67a03d…` (`appendUploadedDocument`) | **200**, גוף התשובה `ok: true` + הרשומה המלאה: `id`, `name`, `path`, `mime: application/pdf`, `size: 2188`, `status: pending_review` |
| 66 | `GET /gesher/_serverFn/560b342f…` (`getClientDashboard`), מיד אחרי | **200**, `uploadedDocuments: []` |

הפונקציה מדווחת שהיא כתבה, ובאותה שנייה הקריאה מחזירה ריק.

### השורש — ולמה זה שקט

`apps/31-hebrew-bridge-crm/src/lib/client.functions.ts:131`

```ts
const { error: upErr } = await supabase
  .from("client_profiles")
  .update({ uploaded_documents: [...current, entry] })
  .eq("id", userId);
if (upErr) throw new Error(upErr.message);
```

הכתיבה הולכת ל-`client_profiles.uploaded_documents` **בשם הלקוח**
(ה-client של הבקשה, לא `supabaseAdmin`). ועל הטבלה הזאת יש RLS, ומדיניות
ה-UPDATE היחידה שקיימת היא של אדמין:

`supabase/migrations/20260604233525_….sql`
```sql
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients read own client profile" ON public.client_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage client profiles" ON public.client_profiles
  FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) …;
```

**אין policy שמתירה ללקוח UPDATE על השורה של עצמו.** ה-GRANT ברמת
העמודה (`GRANT UPDATE (uploaded_documents) … TO authenticated`,
מיגרציה `20260605003212`) קיים ומטעה — GRANT אינו RLS. RLS מסנן את
ה-UPDATE ל-**אפס שורות**, ו-UPDATE שפגע באפס שורות הוא **הצלחה** ב-
PostgREST: `error` הוא `null`. לכן `if (upErr)` לא נורה אף פעם,
והפונקציה מחזירה `ok: true` על כתיבה שלא קרתה. זה בדיוק הדפוס שהופך
באג לשקט.

### והטבלה הנכונה כבר קיימת ולא בשימוש

מיגרציה `20260610185015` יצרה את `public.documents` —
`owner_client_id`, `storage_path`, `mime`, `size`, `status`,
`partner_visible` — ועליה מדיניות שהלקוח **כן** עובר:

```sql
CREATE POLICY "doc_all" ON public.documents FOR ALL TO authenticated
  USING (owner_client_id = auth.uid() OR private.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_client_id = auth.uid() OR private.has_role(auth.uid(),'admin'));
```

היא אפילו העבירה את הנתונים הישנים (`Backfill documents from
client_profiles.uploaded_documents jsonb (kept for one release)`).
כלומר: הסכמה עברה לטבלה חדשה, ושלוש הפונקציות ב-`client.functions.ts`
(`getClientDashboard`, `appendUploadedDocument`, `removeUploadedDocument`)
נשארו על עמודת ה-jsonb הישנה — שמאז אינה ניתנת לכתיבה בידי לקוח.

**התיקון (הצעד הבא, לא הצעד הזה):** להעביר את שלוש הפונקציות ל-
`public.documents`, ולוודא שהכשלה מדווחת — `.select()` על הכתיבה
וזריקת שגיאה כשחוזרות אפס שורות, כדי שכתיבה חסומה לא תיראה שוב
כהצלחה. נרשם כ-issue.

---

## מה לא נמדד, ונרשם ככזה

- **`public.documents` לא נקראה ישירות.** פרויקט 31
  (`ygaqqnuyfnumezxxmtbh`) אינו נגיש מכאן ב-MCP (רק
  `uhnrgujbdxhhmoxcjria`), ואין SUPABASE_ACCESS_TOKEN. השורש נשען על
  קוד המקור + המיגרציות + גופי התשובה של שלוש בקשות הרשת — לא על
  שאילתה למסד.
- **הקובץ שעלה נשאר באחסון** (`client-documents/<uid>/df064ea8-…-sample.pdf`).
  אין מסך שמציג אותו ואין דרך למחוק אותו מכאן; ה-`removeUploadedDocument`
  מסתמך על אותה רשימת jsonb ריקה. יטופל עם התיקון.
- **הרשומה שנוצרה ב-30 לא נמחקה** — היא רשומת QA מסומנת (מספר תיק
  2026-000001, בהערות "רשומת QA אוטומטית … ניתן למחוק"). המסד היה ריק
  לפניה.
- **לא נבדק מה קורה לאותו מסמך בצד האדמין** של 31.
- **21 mthbram לא נכללה** — הפעימה הקודמת קבעה שאין בה כניסת לקוח בכלל.

## מצב טסט

לא נוצר משתמש חדש. לא נשלחה שום הודעה ולא בוצע חיוב. הפעולות היחידות
הן של משתמש הבדיקה הרשמי `test@more30.com` בתוך שתי מערכות לא-מוגנות.
המערכות המוגנות (08, 09, bkalut-app, bkalot-admin, zr_*, NEDARIM3873)
אינן ברשימת היעדים, ולא נעשה שימוש בסכמות csj/csj_src/igud.
