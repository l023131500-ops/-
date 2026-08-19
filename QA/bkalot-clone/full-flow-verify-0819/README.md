# בקלות — עותק עבודה (37): אימות זרימה מלאה מקצה-לקצה, 19/08/2026

## למה
`core.projects` #37 (`audit_gaps`, סבב 19/08 מוקדם יותר) סימן שלוש שכבות כ"לא נבדק
היום": תור העיבוד/הפקת מכתב תשובה, רשימת התבניות, ומיזוג עם `rights.catalog`
בפועל בזרימה. שום קוד לא שונה בסבב הזה — זהו סבב מדידה בלבד, שסוגר את הפער
במדויק לפי מה שנמדד ולא יותר.

## מה נמדד — HTTP אמיתי, נתיב הלקוח המלא, בלי עקיפת שער
כל קריאה רצה מול הכתובות החיות (`uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/
bkalot-clone-intake` ו-`…/bkalot-clone-admin`), עם `anon key` הציבורי בדיוק כפי
ש-`index.html`/`admin.html` שולחים, לא דרך ה-MCP וגם לא בעקיפת ה-edge function.

1. **קליטה** (`bkalot-clone-intake`, `kind=treatment`, `situation=family_4plus`,
   `email=qa.bkalot@more30.com` — יעד ברשימת הבדיקה) → `200`, `case_id=420`,
   `contact_id=425`, **`rights_linked=42`** — מוכיח בפועל שהמיזוג עם
   `rights.situation_map`→`rights.catalog` (888 שורות) עובד: 42 מתוך הזכויות
   שמופו למצב `family_4plus` נמצאו בקטלוג ונקשרו לפנייה, `rights_unknown=[]`.

2. **כניסת ניהול** (`login`, `l023131500@gmail.com` / `STD_ADMIN_PASSWORD`) → `200`,
   טוקן תקין (התאמה ל-`LOGINS.md` — המסך ממופתח על מייל ולא שם-משתמש).

3. **הפקת מסמך** (`render`, `case_id=420`, `template_key=rights_treatment_reply`
   — התבנית השנייה מתוך שתי התבניות ב-`bkalot_clone.templates`, זו שרשימת
   התבניות במסך הניהול חושפת לבחירה) → `200`, `document_id=154`,
   `html_chars=4120`, `text_chars=2771`, `placeholders_unresolved=[]`,
   `situation_label="משפחה ברוכת ילדים (4+)"` — התבנית קראה נכון גם את הנתון
   מהמצב וגם את 42 הזכויות שנקשרו בשלב 1.

4. **כניסה לתור** (`queue`, `document_id=154`) → `200`, `mode=test`,
   `status=queued`, `queue_id=37`, `to_address=qa.bkalot@more30.com`
   (מרשימת הבדיקה), `blocked=false`.

5. **עיבוד** (`dispatch`, `queue_id=37`) → `200`, `outcome=dry_run`,
   `status=skipped`, **`sent_for_real=0`**, `body_matches_document=true`.
   קריאה שנייה על אותה שורה → `ok:false`, `error=not_queued`,
   `already_processed=true` — לא נכתבה שורת יומן שנייה, בדיוק כמצופה מ-0070.

## מה זה מוכיח לגבי שלוש הטענות שהיו פתוחות
- **תור העיבוד/הפקת מכתב תשובה** — עובד קצה-לקצה, כולל שער האידמפוטנטיות.
- **רשימת התבניות** — קיימת ופעילה: שתי תבניות (`general_inquiry_reply`,
  `rights_treatment_reply`), `admin.html` חושפת אותן ב-`<select>` וה-render
  קיבל את המפתח שהתבחר; לא נבדקה כברירת מחדל (ריקה) בסבב הזה, רק בבחירה מפורשת.
- **מיזוג rights.catalog בזרימה** — אמיתי, לא מדומה: 42 זכויות אמיתיות מתוך
  888 נקשרו, הופיעו במכתב שהופק, וה-subject/body שיקפו אותן.

## מצב טסט — נמדד ולא הוצהר
`select mode, sent_at from bkalot_auto.outbound_queue where app_key='bkalot-clone'`
לפני הניקוי: שורה אחת, `mode='test'`, `sent_at=null`. `delivery_log` תיעד
`outcome='dry_run'` בלבד. **אפס שורות `mode='live'` ואפס `sent_at` לא-ריקים**
נכתבו במהלך הבדיקה כולה — אין נתיב יוצא (`net.http`/`pg_net`/Resend) בשום
פונקציה שנקראה.

## ניקוי — אין נתון בדוי שנשאר
כל השורות שנוצרו בבדיקה הזו נמחקו בסדר בטוח (FK): `delivery_log` (id=10) →
`outbound_queue` (id=37) → `bkalot_clone.documents` (id=154) →
`bkalot_clone.case_rights` (42 שורות, `case_id=420`) → `bkalot_clone.cases`
(id=420) → `bkalot_auto.contacts` (id=425, אומת קודם שאין הפניה נוספת אליו).
נמדד אחרי המחיקה: `cases_total=0`, `queue_total(app_key='bkalot-clone')=0` —
המסד חזר בדיוק למצב שלפני הבדיקה.

## קבצי גלם
`intake.json`, `render.json`, `queue.json`, `dispatch.json` (בתיקייה זו).

## תוצאה
שלושת פערי ה-`audit_gaps` שהיו "לא נבדק היום" נסגרים — כולם עובדים כפי
שתועדו ב-`BKALOT_CLONE_BUILD.md`. לא נמצא באג. לא שונה קוד. `core.projects`
עודכן בהתאם.
