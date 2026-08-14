# 0073 — למסך הניהול שני נוסחי שגיאה על תבנית שהוא לעולם אינו יכול לבחור (14/08/2026)

**מה נמדד:** `public.bkalot_clone_admin_case(bigint)` אחרי מיגרציה 0073 — האם
`templates` חוזר, מה יש בו, ומה קורה לשורה מנוטרלת. מיגרציה בלבד: `apps/37`
לא נגעה, `bkalot-clone-admin` נשארה **v6**, `supabase/functions` לא נגעה כלל
ואין פריסת פורטל.

**הכרטיס:** `core.issues` **#237**.
⚠️ הערת יושר: הודעת הקומיט של `2a067be` (כפתורי «שינוי סטטוס») הזכירה גם היא
`#237`, אך השורה ההיא מעולם לא נכנסה ל-`core.issues` — insert שנכשל שורף את
המזהה. המזהה 237 שייך מהיום לכרטיס הזה בלבד, וההפניה בקומיט הישן אינה מצביעה
על שום שורה.

---

## מה היה

`bkalot_clone_render` מקבל `template_key` מאז 0063 ומחזיר עליו **שני** פסקי דין
נפרדים במכוון:

| שגיאה | מתי | הנוסח שכבר קיים ב-`admin.html` |
|---|---|---|
| `template_unknown` | מפתח שאינו במסד | «התבנית שהתבקשה אינה קיימת במסד.» |
| `template_disabled` | מפתח קיים ש-`enabled=false` | «התבנית שהתבקשה מנוטרלת ואינה מפיקה.» |

שני הנוסחים תורגמו, נשמרו ונפרסו — **ואין ולו לחיצה אחת בכל המוצר שיכולה
להגיע אליהם**, כי המסך אינו שולח `template_key` לעולם. `bkalot_clone.templates`
מחזיקה שתי שורות, ואף אחת מהן לא הגיעה לדפדפן בשום נתיב.

## מה נבנה

`bkalot_clone_admin_case` מחזירה גם `templates` — `key`, `name_he`, `subject`,
`channels`, `enabled`. חמש ההכרעות כתובות בראש קובץ המיגרציה; שתיים מהן הן
העיקר:

- **מנוטרלות כלולות.** סינון ב-`where t.enabled` היה הופך תבנית מכובה לתבנית
  שאינה קיימת — בדיוק ההבחנה ששני נוסחי השגיאה של render טרחו לבנות.
- **אין כאן `is_default`.** כלל ברירת המחדל (`kind='treatment'` →
  `rights_treatment_reply`, אחרת `general_inquiry_reply`) נשאר ב-`render`
  בלבד. עותק שני שלו כאן היה מקום שני שבו מוכרעת זהות המכתב, ושני מקומות כאלה
  מסתעפים בשקט. הבורר במסך יציע «ברירת מחדל לפי סוג הפנייה» כערך ריק — כלומר
  לא ישלח `template_key` כלל, וזו התנהגות היום בדיוק.

---

## המדידה

הפנייה נוצרה דרך `bkalot_clone_intake` — נתיב הקליטה עצמו ולא הזרקה ל-`cases`.
**סטייה שנרשמת ולא נבלעת:** הקריאה הייתה ל-RPC ולא ל-edge function מעל HTTP,
כפי שנמדד בפעימות 0067–0072. השינוי כאן הוא בגוף התשובה של ה-RPC, והנתיב
`/case` מעביר את הגוף כפי שהוא — אך המדידה הזאת אינה מוכיחה את המעבר הזה,
והיא תיסגר בפעימת ה-UI שאחריה.

| # | מה נבדק | תוצאה |
|---|---|---|
| 1 | קליטה | `case_id=77`, `contact_id=83`, `rights_linked=59`, `kind=treatment` |
| 2 | `admin_case(77)` | `ok=true`, 5 מפתחות עליונים (היו 4), `rights=59`, `documents=0`, **`templates=2`** |
| 3 | תוכן `templates` | שתיהן `channels=["email"]`, `enabled=true`, עם `name_he` ו-`subject` בעברית |
| 4 | שורה מנוטרלת | `general_inquiry_reply → enabled=false`: **עדיין חוזרת**, ומופיעה **אחרונה** (מיון `enabled desc, name_he`) |
| 5 | render על המנוטרלת | `template_disabled` — ו-`documents` נשאר 0 |
| 6 | render על מפתח שאינו קיים | `template_unknown` + `allowed=["general_inquiry_reply","rights_treatment_reply"]`, `documents` נשאר 0 |
| 7 | כלל ברירת המחדל | render בלי `template_key` → `template_key=rights_treatment_reply`, `fallback=false`, 3,503 תווי טקסט, `placeholders_unresolved=[]` |

בדיקה 7 היא הבקרה שקונה את הכרעה (2): הכלל לא זז, ולא שוכפל.

## הרשאות — נמדדו ולא הונחו

`create or replace` שומר ACL, ולכן קל להניח. נמדד לפני ואחרי, זהה:
`anon=false`, `authenticated=false`, `service_role=true`. בלי זה,
`SECURITY DEFINER` כאן היה חושף כל פנייה לכל מחזיק מפתח anon.

## מצב טסט

`sent_at` באפס שורות, `mode='live'` באפס שורות, `delivery_log` נשאר 3 ו-
`outbound_queue` נשאר 8 לאורך כל הריצה. הפונקציה קוראת בלבד. אין מייל, אין
הודעה ואין מסמך שיצא החוצה.

## המקור לא נגע

8 שורות `app_key='bkalot'` נשארו 8, טביעת אצבע `da28ec6315535ec0bfbebad4d57752a7`
(`id:status:attempts`) זהה לפני ואחרי. אין נגיעה ב-08/09/`bkalut-app`/
`bkalot-admin`/`zr_*`/`NEDARIM3873` ולא בסכמות `csj`/`csj_src`/`igud`.

## גלגול לאחור

נמחקו בסדר הנכון (מסמכים → זכויות → פנייה → איש קשר): מסמך אחד, 59 שורות
`case_rights`, פנייה אחת, איש קשר אחד. השורה שנוטרלה לצורך בדיקה 4 הוחזרה
ל-`enabled=true` (עם `updated_at=updated_at` כדי לא לזייף חותמת עדכון).

אחרי: `cases=0`, `case_rights=0`, `documents=0`, `admin_users=1`,
`admin_sessions=5`, `templates=2` (שתיהן `enabled`), `catalog=888`,
`contacts=4`, `outbound_queue=8`, `delivery_log=3` — זהה בדיוק לבסיס שנמדד
לפני. הפונקציה נשארה.

---

## מה נשאר פתוח ולא נבלע

- **אין בורר תבנית ב-`admin.html`** — הרשימה חוזרת ואיש אינו קורא אותה, וזו
  הלבנה הבאה (UI + פריסת פורטל), אותו פיצול כמו 0063→#233→פריסה.
- המדידה כאן ב-RPC ולא ב-HTTP (ראו לעיל).
- `documents` אינה שומרת מאיזו תבנית הופק המסמך — הפקה חוזרת בתבנית אחרת
  דורסת (`upsert` על `case_id,kind`) ואין עמודה שאומרת מה יושב שם עכשיו.
- «מי שינה ומתי» אינו נכתב לשום מקום; `sent` בלתי-ניתן-להשגה בכוונה;
  `bkalot_clone_admin_create` (יצירת **משתמש ניהול**) עדיין אינה חשופה ב-HTTP;
  `pdf`/`audio` → `channel_unsupported`.
- `public_visible` ו-`show_in_showcase` של #37 נשארים `false`.

## שחזור

הרצה חוזרת: `supabase/migrations/0073_*.sql` היא `create or replace` ובטוחה
להרצה חוזרת. הפלט הגולמי של שבע המדידות ב-`_measurements.json`.
