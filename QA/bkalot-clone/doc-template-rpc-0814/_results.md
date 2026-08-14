# 0075 — שורת המסמך אומרת סוף-סוף איזה מכתב יושב בה (§5ב, RPC)

**מיגרציה:** `supabase/migrations/0075_the_screen_shows_a_document_number_and_cannot_say_which_letter_is_in_it.sql`
**נמדד:** 14/08/2026, 03:39–03:41 UTC, פרויקט `uhnrgujbdxhhmoxcjria`

## הקו שנלקח

הקו הפתוח שנוסח ב-3f96141 מילה במילה: «השדות אינם מגיעים למסך —
`bkalot_clone_admin_case` מונה את עמודות המסמך אחת-אחת ולכן עמודה חדשה אינה מופיעה
בתשובה מאליה, והמנהל עדיין רואה «מסמך #72» בלי לדעת איזה מכתב יושב בו; זו הלבנה
הבאה (RPC ואז UI ואז פריסה)». נלקח כפי שנוסח ולא הורחב: **מיגרציה בלבד** —
`apps/37-bkalot-clone` לא נגעה, `bkalot-clone-admin` נשארה v6, `supabase/functions`
לא נגעה ואין פריסת פורטל.

## מה נבנה

שתי פונקציות מחזירות את שלוש העמודות של 0074 ולצידן שני שדות נגזרים:
`template_key`, `template_name_he`, `template_fallback`, `updated_at`, `overwritten`.

| פונקציה | היכן |
|---|---|
| `bkalot_clone_admin_case(bigint)` | בלוק `documents` |
| `bkalot_clone_admin_document(jsonb)` | גוף המסמך |

הכרעה (4) — גם `admin_document` ולא רק `admin_case`: זו הפונקציה שמחזירה את גוף
המכתב, כלומר המסך היחיד שבו המנהל קורא את מה שייצא. לתקן אחת מהן היה משאיר את
הנתון נגיש ברשימה וחסר בדיוק במקום שבו קוראים את המכתב.

## הבסיס לפני

`cases=0, case_rights=0, documents=0, contacts=4, admin_users=1, admin_sessions=5,
templates=2 (שתיהן enabled), catalog=888, outbound_queue=8, delivery_log=3`,
טביעת אצבע התור `da28ec6315535ec0bfbebad4d57752a7`.

## המדידה שקונה את הפעימה

נמדד על פניות שנוצרו דרך `bkalot_clone_intake` — נתיב הקליטה עצמו ולא הזרקה
ל-`cases`: **#84** (treatment, single_parent, 42 זכויות) ו-**#85** (info) שהיא הבקרה
שלא נגעו בה כלל ונשארה בלי שורת מסמך.

הפקה ראשונה בלי מפתח, ואז הפקה שנייה עם מפתח מפורש — שתי טרנזקציות נפרדות:

| | הפקה ראשונה (בלי מפתח) | הפקה שנייה (`general_inquiry_reply`) |
|---|---|---|
| `id` | 75 | **75** — אותו מסמך, upsert על (case_id,kind) |
| `template_key` | `rights_treatment_reply` | `general_inquiry_reply` |
| `template_name_he` | מענה לפניית טיפול — רשימת הזכויות | **מענה לפנייה כללית** |
| `template_fallback` | false | false |
| `created_at` | 03:39:12.549537 | 03:39:12.549537 — **קפוא** |
| `updated_at` | 03:39:12.549537 | 03:39:28.104807 |
| `overwritten` | **false** | **true** |
| תווי טקסט | 2,508 | 240 |

הדלתא: **15.555 שניות**. 240 תווים ולא 2,508 — מכתב אחר ולא תווית אחרת. עד היום
המסך היה מציג את שתי השורות האלה זהות לחלוטין: «מסמך #75», אותה חותמת, ותו לא.

## שלוש בקרות, וכל אחת קונה הכרעה

**(1) מפתח שאין לו שורה → `template_name_he` הוא null, והמפתח נשאר.**
`template_key` הוחלף ל-`deleted_letter_0075` (0 שורות ב-`templates`):
`template_name_he=null`, המפתח חוזר כפי שהוא. 0074 הכריעה ש-`template_key` הוא text
ואינו FK — מפתח בלי שורה הוא מצב חוקי, ולא שחיתות נתונים. ה-LEFT JOIN אומר «המפתח
הזה כבר אינו מצביע על שורה» במקום להשמיט את המסמך או להיכשל.

**(2) `template_fallback` חוזר כ-null ולא כ-false.** השורה הועמדה בצורת מסמך
מלפני-0074 (`template_fallback=null, updated_at=null`): `jsonb_typeof` על שלושת
השדות = `null`, ו-`j ? 'template_name_he'` ו-`j ? 'template_fallback'` = true —
כלומר **null אמיתי ב-JSON והמפתח קיים**, ולא שדה חסר. `coalesce(...,false)` היה
כותב על כל מסמך ישן «הופק מתבנית אמיתית», בדיוק הקביעה חסרת-המקור שהכרעה (5) של
0074 סירבה לכתוב למסד. זו גם התשובה לקו שנשאר פתוח ב-3f96141 («`template_key is
null` לא נמדד בפועל») — בהסתייגות: הצורה הועמדה בעדכון ישיר, ולא נצפתה על שורה
שנוצרה לפני 0074, כי אין ולו שורה כזו במסד.

**(3) הדגל אומר מה שהשם אינו יכול לומר.** `rights_treatment_reply` נוטרלה, ואז
הפקה בלי מפתח: `template_key=rights_treatment_reply`, `template_name_he=מענה
לפניית טיפול — רשימת הזכויות`, `template_fallback=true`, **96 תווים ולא 2,508**.
השורה נושאת שם מכתב אמיתי, והגוף אינו בא ממנו — שקר שצורתו בדיוק כצורת האמת, ורק
`template_fallback` מבדיל. הכרעה (1) של המיגרציה הזו (השם מהשרת) הייתה מסוכנת
בלעדיו. התבנית הוחזרה ל-`enabled=true` עם `updated_at=updated_at` בשני הכיוונים.

**(4) `overwritten` נגזר בשרת** — `(updated_at is distinct from created_at)`, השוואת
`timestamptz` ולא השוואת שתי מחרוזות שהלקוח מקבל אחרי סריאליזציה; null כש-`updated_at`
הוא null (נמדד בבקרה 2).

## הרשאות — נמדדו ולא הונחו

`create or replace` שומר ACL ולכן קל להניח. שתי הפונקציות, לפני ואחרי:
`anon=false, authenticated=false, service_role=true`. בלי זה SECURITY DEFINER כאן
היה חושף כל פנייה וכל גוף מכתב לכל מחזיק מפתח anon.

## מצב טסט — נמדד ולא הוצהר

`outbound_queue=8`, `delivery_log=3`, אפס מסמכים עם `queue_id`, אפס פניות ב-`sent`,
אפס שורות עם `sent_at`, אפס שורות `mode=live`. שתי הפונקציות קוראות בלבד — אין בהן
`net.http`, אין `pg_net` ואין ולו קריאה יוצאת אחת. אין מייל, אין הודעה ואין מסמך
שיצא החוצה.

## המקור לא נגע

8 שורות `app_key=bkalot` נשארו 8, טביעת אצבע `da28ec6315535ec0bfbebad4d57752a7`
(id:status:attempts) זהה לפני ואחרי.

## התגלגלות אחורה

מסמך אחד, 42 `case_rights`, 2 פניות, 2 אנשי קשר. אחרי: `cases=0, case_rights=0,
documents=0, contacts=4, admin_users=1, admin_sessions=5, templates=2 (שתיהן
enabled), catalog=888, outbound_queue=8, delivery_log=3` — **זהה בדיוק לבסיס**.
שתי הפונקציות נשארו.

## סטייה שנרשמת ולא נבלעת

המדידה רצה ב-RPC ולא ב-edge function מעל HTTP, כמו ב-0073. השינוי הוא בגוף התשובה
של ה-RPC ונתיב `/case` מעביר את הגוף כפי שהוא, אך המדידה הזאת אינה מוכיחה את המעבר —
הוא ייסגר בפעימת ה-UI שאחריה, שבה ממילא נמדד הדפדפן מול הכתובת החיה.

## מה שנשאר פתוח ולא נבלע

- **אין מי שקורא את השדות.** `admin.html` מציג «מסמך #75» ואת `created_at` בלבד;
  חמשת השדות חוזרים ואיש אינו קורא אותם. זו הלבנה הבאה (UI ואז פריסת פורטל), אותו
  פיצול כמו 0073 → 978ab68 → fb607a0.
- `template_key is null` נמדד בצורתו בלבד (עדכון ישיר), לא על שורה אמיתית מלפני 0074.
- «מי הפיק» אינו נכתב לשום מקום, וגם לא «מי שינה ומתי».
- `sent` בלתי-ניתן-להשגה בכוונה; `bkalot_clone_admin_create` אינה חשופה ב-HTTP;
  pdf/audio → `channel_unsupported`.
- `public_visible` ו-`show_in_showcase` של #37 נשארים false.
