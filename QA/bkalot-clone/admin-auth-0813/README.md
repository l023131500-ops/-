# שכפול בקלות שכבה 2 — הכניסה לניהול (13/08/2026, migration 0061)

הלבנה הקודמת (0060) בנתה את נתיב הקריאה: `bkalot_clone_admin_cases` ו-`_case`
מחזירות כל פנייה שנקלטה — שם, טלפון ומייל של מי שהשאיר פרטים — **בלי שום בדיקת
זהות**. המיגרציה עצמה, ה-README שלה והכרטיס רשמו שהכניסה לניהול חייבת לנחות
**לפני** שיש להן כתובת HTTP. זו הלבנה הזו, ובכוונה בסדר הזה.

## מה נבנה

| מה | תפקיד |
|---|---|
| `bkalot_clone.admin_users` | משתמשי ניהול; `password_hash` bcrypt work-factor 12 |
| `bkalot_clone.admin_sessions` | סשנים; נשמר **sha256 של הטוקן**, לא הטוקן |
| `public.bkalot_clone_admin_create(jsonb)` | יצירת מנהל |
| `public.bkalot_clone_admin_login(jsonb)` | אימות → טוקן אטום + `expires_at` |
| `public.bkalot_clone_admin_session(text)` | **השער** — מה שחייב לרוץ לפני 0060 |
| `public.bkalot_clone_admin_logout(text)` | ביטול סשן, אידמפוטנטי |

## שתי סטיות מכוונות מהמקור

שתיהן רשומות ב-`BKALOT_METHOD §6.2` כ«אל תשכפל», ונרשמות כאן כדי שלא ייקראו
בעתיד כפער בשכפול:

1. המקור מחזיק ב-`app_users` גם `password_hash` (sha256) וגם `password_plain`
   («ephemeral, cleared after first delivery»). כאן אין עמודה שמחזיקה סיסמה
   קריאה בשום שלב, וה-hash הוא bcrypt ולא sha256. נמדד: `$2a$12$`, 60 תווים,
   ואינו מכיל את הסיסמה.
2. המקור מחזיק ב-`admin_sessions` את הטוקן עצמו. כאן נשמר sha256 שלו בלבד
   (64 תווים hex), ולכן קריאת הטבלה — גיבוי, דאמפ או באג קריאה — אינה מניבה
   טוקן שאפשר להתחבר איתו. נמדד: `token_hash` שווה ל-`sha256(token)` ואינו
   מכיל אף מחרוזת מהטוקן.

**מה שכן הועתק מהמקור:** טוקן אטום בכותרת `Authorization` מ-state בזיכרון, בלי
`localStorage` ובלי cookies (`schema.ts:166-168`).

## ההכרעה שנמדדה ולא הונחה — ספירת מיילים

מייל שאינו רשום וסיסמה שגויה מחזירים את אותה שגיאה בדיוק, אבל שוויון נוסח
בלבד אינו שווה כלום: מסלול «אין משתמש» שחוזר מיד היה מסגיר בזמן התשובה אילו
מיילים רשומים כמנהלים — ומדידה כזו נעשית מדפדפן. לכן מורץ `crypt` מדומה באותו
work factor. **נמדד ב-`clock_timestamp`, לא הונח:**

| מסלול | זמן |
|---|---|
| מייל שאינו קיים | 298ms |
| מייל קיים, סיסמה שגויה | 297ms |

הפרש של מילישנייה אחת. בלי ה-`crypt` המדומה ההפרש היה בסדר גודל של ~300ms.

מאותה סיבה `account_locked` מוחזר **רק אחרי** שהסיסמה אומתה כנכונה: מי שהגיע
לשם כבר מחזיק את הסיסמה, ולכן הוא אינו לומד דבר. נעילה שהייתה מוחזרת לפני
בדיקת הסיסמה הייתה מסגירה בעצמה שהמייל קיים — בדיוק מה שהמדידה למעלה מונעת.

והטוקן הוא 32 בייט מ-`gen_random_bytes` (base64url, 43 תווים) ולא
`md5(random())` — `random()` הוא PRNG שאינו קריפטוגרפי.

## מה שנמדד — 25 בדיקות

| בדיקה | תוצאה |
|---|---|
| `create`: מייל פסול / שם ריק / סיסמה קצרה | `email_invalid` / `full_name_required` / `password_too_short` (min 10) |
| `create`: קלט סקלרי / `null` | `payload_invalid` — לא חריגה |
| `create`: `"  QA-Admin@More30.COM "` | נשמר `qa-admin@more30.com` (trim+lower) |
| `create`: אותו מייל באותיות גדולות | `email_taken` |
| שם בעברית | `מנהל בדיקה` — נכתב ונקרא בלי כפל-קידוד |
| `password_hash` | `$2a$12$`, 60 תווים, אינו מכיל את הסיסמה |
| `login`: מייל שאינו קיים | `invalid_credentials` · 298ms |
| `login`: סיסמה שגויה | `invalid_credentials` · 297ms · `failed_attempts` 0→1 |
| `login`: סיסמה ריקה | `credentials_required` |
| 5 כשלונות | `locked_until` = now+15m |
| סיסמה **נכונה** בזמן נעילה | `account_locked` + `locked_until` |
| `login` מוצלח (מייל עם רווחים ואותיות גדולות) | `ok:true` + token + `expires_at` (+12h) |
| אחרי הצלחה | `failed_attempts`→0, `locked_until`→null, `last_login_at` נכתב |
| `user_agent`/`ip` | נשמרו: `QA/0813 \| 127.0.0.1` |
| `session`: טוקן תקף | `ok:true` + `session_id` + `admin` |
| `session`: תו אחד שונה בטוקן | `invalid_session` |
| `session`: ריק / `null` | `token_required` |
| **השער מורכב:** session תקף → `admin_cases` | `admin=qa-admin@more30.com`, `total=0` |
| מנהל שהושבת — סשן קיים | `invalid_session` **מיד** (לא ממתין לפקיעה) |
| מנהל שהושבת — כניסה חדשה | `account_disabled` |
| הפעלה מחדש | אותו סשן חזר לעבוד (`session_id=1`) |
| סשן שפג (`expires_at` בעבר) | `invalid_session` |
| `logout` | `ok:true, revoked:1` |
| `logout` שוב / טוקן שאינו קיים | `ok:true, revoked:0` — אידמפוטנטי |
| `session` אחרי `logout` | `invalid_session` |
| מחיקת מנהל | שני הסשנים נמחקו ב-CASCADE; הטוקן → `invalid_session` |

## הרשאות — נמדדו אחרי, לא הונחו

`has_function_privilege` על ארבע הפונקציות: `anon=false`, `authenticated=false`,
`service_role=true`. זו אותה מלכודת שנמדדה ב-0058 וב-0060 — פונקציה חדשה
ב-`public` מקבלת `EXECUTE` ל-`PUBLIC` כברירת מחדל, ובלי ה-`revoke` המפורש
**מחזיק מפתח ה-anon — שיושב בקוד המקור של הטופס הציבורי מאז #223 — היה יכול
ליצור לעצמו משתמש ניהול בקריאה אחת.**

`role_table_grants` על שתי הטבלאות: **אפס שורות** לכל תפקיד פרט לבעלים
(`postgres`) — כולל `service_role`. RLS דלוק, אפס policies. כלומר גם התפקיד
שיושב ב-edge function אינו יכול לקרוא `password_hash` ישירות; הפונקציות רצות
כבעליהן ואינן זקוקות להרשאת טבלה.

## מצב טסט וגלגול אחורה

התור לא זז: `outbound_queue=8`, `delivery_log=3`, `rights.catalog=888` — לפני
ואחרי. אין שליחה, אין מייל ואין הודעה. הבדיקה התגלגלה אחורה במלואה: משתמש
הבדיקה נמחק, שני הסשנים ירדו איתו ב-CASCADE, והמצב זהה לבסיס —
`admin_users=0 · admin_sessions=0 · cases=0 · case_rights=0 · documents=0 ·
contacts=4`.

## ⚠️ מה שהשלב הזה **אינו**

- **אין ולו כתובת HTTP אחת.** אין edge function ואין מסך. השער קיים ואינו
  מחובר לכלום — וזה הסדר הנכון: 0060 קיבל את השומר שלו לפני שקיבל דלת.
- **אין משתמש ניהול במסד.** משתמש הבדיקה נמחק בכוונה, וסיסמה אינה נכתבת לריפו.
  יצירת המנהל האמיתי היא קריאה אחת ל-`bkalot_clone_admin_create` בלבנה הבאה,
  עם מסירה חד-פעמית ובלי אחסון בהיר — הסטייה מ-`password_plain` שהמקור עושה.
- `public_visible`/`show_in_showcase` של #37 נשארים `false`.

🚫 לא נגענו ב-08/09/`bkalut-app`/`bkalot-admin`/`zr_*`/`NEDARIM3873` ולא
ב-`csj`/`csj_src`/`igud`. אין DDL על שום טבלה קיימת — שתי טבלאות חדשות בסכמת
השכפול וארבע פונקציות.
