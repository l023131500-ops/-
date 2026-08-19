# QA — bkalot_clone, הלבנה הראשונה (13/08/2026)

מקור ההוראה: `BKALOT_CLONE_BUILD.md` §"מבנה העותק" · `more30-priority.md` §5ב.

## מה היה לפני

`core.projects` #37 `bkalot-clone` הייתה רשומה מאז שהמפרט אושר — `stage=idea`,
`path=bkalot-studio`, `is_protected=false` — אבל `supabase_schema` שלה היה `NULL`.
כלומר פרויקט רשום שאין לו מקום אחד לכתוב אליו פנייה.

## מדידה לפני הכתיבה (נתוני אמת, לא הנחות)

| מה | כמה |
|---|---|
| `rights.catalog` | 888 |
| `rights.situation_map` | 24 |
| `rights.reference` | 104 |
| `bkalot_auto.topics` | 1 |
| `bkalot_auto.contacts` | 4 |
| `bkalot_auto.intake_log` | 10 |
| `bkalot_auto.outbound_queue` | 8 |
| `bkalot_auto.delivery_log` | 3 |
| `bkalot_auto.test_targets` | 1 |

מנוע השליחה שהמפרט הניח שקיים — קיים, ואינו שלד: יש בו שורות אמת, ו-`outbound_queue.mode`
מוגדר `default 'test'` ברמת הסכמה. לכן שכבה 3 אינה נבנית מחדש (המפרט: "הרחב אותו, אל תמחק").

## שתי הכרעות שהמפרט השאיר פתוחות — שתיהן הוכרעו במדידה

**(1) להעתיק את מאגר הזכויות או לקרוא ממנו חי?** — חי.
`information_schema.role_table_grants` על `rights.*` החזיר **אפס שורות** ל-anon/authenticated/service_role;
כל מה שמוגש היום עובר דרך ארבעה views ב-`public` (`rights_catalog`, `rights_public`,
`rights_situation_map`, `rights_meta_public`). העתקה של 888 שורות הייתה יוצרת מקור אמת שני
שנשאר מאחור בכל ייבוא — ו-`rights.source_raw` + `rights.catalog.imported_at` מעידים שהקטלוג
אכן מיובא מחדש כמכלול.

**(2) FK מ-`case_rights` ל-`rights.catalog(code)`?** — לא.
מאותה סיבה בדיוק: FK מהשכפול היה הופך אותו לגורם שחוסם ייבוא מחדש של מאגר הזכויות.
`right_code` נשמר כטקסט, והתקינות נבדקת ב-join.

## מה נוצר

`bkalot_clone` — שלוש טבלאות ו-view אחד:

- `cases` — הפנייה (שכבה 1). מצביעה אל `bkalot_auto.contacts` במקום לשכפל שם/טלפון/מייל,
  מחזיקה `topic_no` (מודל "מספר נושא", BKALOT_AUTOMATION_BUILD §6) ו-`situation`
  (מפתח מ-`rights.situation_map`). `source` מוגבל ל-`form/yemot/nedarim/ai/admin` —
  בדיוק ארבעת ערוצי הכניסה שהמפרט מנה, ועוד ידני.
- `case_rights` — הזכויות שהותאמו לפנייה.
- `documents` — המסמך/המייל/ההקלטה שהופקו, עם `queue_id` אל `bkalot_auto.outbound_queue`.
  `NULL` = הופק ולא נשלח.
- `rights_catalog` (view) — קריאה חיה מ-`rights.catalog`.

## אימות

- הסכמה, שלוש הטבלאות וה-view קיימים; RLS **דלוק** על שלוש הטבלאות ו-**אפס policies** —
  כלומר anon/authenticated חסומים גם אם תינתן להם הרשאה בעתיד בטעות.
- הרשאות: `service_role` בלבד. anon/authenticated — אפס שורות ב-`role_table_grants`.
- `select count(*) from bkalot_clone.rights_catalog` → **888**, זהה למקור. 888/888 עם `cat` לא ריק.
- **מסלול מלא בבדיקה שמתגלגלת אחורה** (`DO $$ … raise exception`, כדי שלא תישאר שורת בדיקה
  אחת במסד): פנייה → שלוש שורות `case_rights` → מסמך → join אל `rights_catalog` החזיר
  **joined=3**; ניסיון להכניס `source='sms'` נדחה ע"י ה-check (`REJECTED`); `docs=1`.
  אחרי הבדיקה: `cases=0`, `case_rights=0`, `documents=0`.
- שום נתון קיים לא זז: `rights.catalog=888`, `outbound_queue=8`, `contacts=4` — לפני ואחרי.

## מה נמצא תוך כדי ותוקן באותו צעד

`grant … on all tables in schema` תופס גם את ה-view, ו-view של טבלה אחת בלי חישוב הוא
**auto-updatable** בפוסטגרס. כלומר ההרשאה הגורפת פתחה ל-`service_role` נתיב **כתיבה** אל
`rights.catalog` דרך view שרץ כבעליו. נמדד אחרי המתן (`INSERT,UPDATE,DELETE` הופיעו על
`rights_catalog`) ונסגר: `revoke insert, update, delete on bkalot_clone.rights_catalog`.
אחרי — `SELECT` בלבד.

הערה על ה-view: הוא חייב להישאר SECURITY DEFINER (ברירת המחדל) ולא `security_invoker=on`,
כי ל-`service_role` אין הרשאת SELECT על `rights.catalog` עצמה — `invoker` היה מחזיר
"permission denied" לכל קורא.

## גבול המוגן

הקובץ יוצר סכמה חדשה בלבד. אין כתיבה ל-08/09/`bkalut-app`/`bkalot-admin`/`zr_*`/`NEDARIM3873`,
ולא נגענו ב-`csj`/`csj_src`/`igud`. העדכון היחיד לטבלה קיימת הוא שורת `core.projects` של
#37 עצמו (`supabase_schema`, `stage`).

## מה נשאר (הלבנה הבאה)

1. `BKALOT_METHOD.md` — תיעוד השיטה. מקור 08/09 **אינו** מקומי: `apps/08-bkalut-app`
   ו-`apps/09-bkalot-admin` מכילים `app.json` בלבד (`"source": "not-vendored"`),
   והריפואים הם `l023131500-ops/bkalut-app` ו-`l023131500-ops/bkalot-admin` — קריאה
   דרך GitHub API, קריאה-בלבד.
2. שכבה 1 בפועל: טופס הקליטה ונתיב כתיבה (edge function על service_role — הסכמה
   אינה חשופה ל-PostgREST ואין לה policies, ולכן זה הנתיב היחיד).
3. שכבה 2: ממשק ניהול + כניסה.
