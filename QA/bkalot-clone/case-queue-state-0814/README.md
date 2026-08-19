# מסך הפנייה הראה את המייל של איש הקשר, ולא את הכתובת שהמכתב ילך אליה (0069)

14/08/2026 · §5ב שכפול בקלות · מיגרציה בלבד — אין שינוי קוד לקוח, אין פריסת
edge function ואין פריסת פורטל. `apps/37-bkalot-clone` לא נגעה, ו-`bkalot-clone-admin`
נשארה v4.

## מה היה — נמדד לפני הכתיבה ולא הונח

`pg_proc.prosrc` של `public.bkalot_clone_admin_case` לפני המיגרציה:
`queue_id` מופיע (offset 2443), **`queue_status` = 0, `queue_mode` = 0** — כלומר
הקריאה היחידה שמסך הפנייה עושה בטעינה מחזירה את מספר שורת התור ולא את מצבה.
0067 הוסיפה את שני השדות האלה ל-`admin_document` בדיוק מפני ש-`queue_id`
non-null של שורה חסומה נקרא כמו «נשלח» — אותה מלכודת בדיוק נשארה פתוחה בקריאת
הפנייה, ובה הדרך היחידה לגלות היא ללחוץ «הצג» מסמך-מסמך.

בנוסף: 0068 הכריעה שכתובת היעד וההסכמה הן נתון של הפנייה (`cases.to_email`,
`cases.consent`) ושהתור קורא את הצילום הזה, בזמן שאיש הקשר משוכפל לפי טלפון
בלבד והמייל שלו נדרס בכל הגשה חדשה. המסך הציג עד היום את `contact.email` בלבד.
`contact_email_differs` נמדד ב-0068 ולא הוצג בשום מקום.

## מה נבנה

`create or replace` על `public.bkalot_clone_admin_case(bigint)` — קריאה בלבד,
בלי שינוי סכמה ובלי נתיב כתיבה חדש:

* `case.to_email`, `case.consent` — הכתובת וההסכמה של הפנייה עצמה.
* `case.contact_email_differs` — `null` כשאין מה להשוות, `false` כשנמדד והן
  זהות, `true` כשהמסך והתור מצביעים על שתי כתובות שונות.
* `documents[].queue_status`, `documents[].queue_mode` — מ-`LEFT JOIN` אל
  `bkalot_auto.outbound_queue`.
* `documents[].queue_missing` — `queue_id` שאין לו שורה. ה-FK הוא
  `ON DELETE SET NULL` ולכן אינו אמור לקרות, אבל 0067 כבר בנתה לו קוד שגיאה
  משלה במקום להניח, ו«בתור #21 · null» נקרא כמו תקלה של המסך ולא כמו נתון חסר.

## מה נמדד

נתוני הבדיקה נוצרו דרך נתיב הקליטה האמיתי מעל HTTP
(`functions/v1/bkalot-clone-intake`, מפתח anon מהטופס הציבורי) ולא בהזרקה למסד.
שתי הפניות הראשונות נשלחו **באותו טלפון בכוונה** — זה מה שמייצר את הדריסה של
0068 בלי לביים אותה.

| | פנייה 45 | פנייה 46 | פנייה 47 |
|---|---|---|---|
| קליטה | `contact_id` 51, 59 זכויות | `contact_id` 51, 59 זכויות | `kind=info`, בלי מייל |
| `case.to_email` | `qa.bkalot@more30.com` | `later.overwrite.0069@more30.com` | `null` |
| `contact.email` | `later.overwrite.0069@more30.com` | `later.overwrite.0069@more30.com` | — |
| `contact_email_differs` | **`true`** | `false` | **`null`** |
| שורת תור | 21, `queued` | 22, **`blocked`** | אין מסמך |
| `documents[].queue_status` | `queued` | `blocked` | `[]` |
| `documents[].queue_mode` | `test` | `test` | — |
| `queue_missing` | `false` | `false` | — |

הנקודה כולה בשורה אחת: בפנייה 45 המסך הציג `later.overwrite.0069@more30.com`
ושורת התור נוצרה אל `qa.bkalot@more30.com`. שתי כתובות שונות, ולפני הצעד הזה לא
היה במסך שום סימן לכך. בפנייה 46 שורת התור נחסמה, ו-`queue_id=22` לבדו היה
נקרא כמו מכתב שיצא.

`bkalot_clone_admin_case(99999)` → `case_not_found` (שגיאת קורא, לא נפילה).

## מה שלא נעשה ולמה

הקריאה נמדדה ברמת ה-RPC ולא מעל HTTP: נתיב ה-`case` ב-`bkalot-clone-admin` הוא
מעביר, לא בונה, והוא נמדד מעל HTTP ב-#224 ולא שונה כאן. **המדידה מעל HTTP
והעמודה במסך הן הפעימה הבאה** — היום `admin.html` אינה קוראת את השדות החדשים
בכלל, ולכן אין בצעד הזה צילום מסך: אין עדיין מסך שהשינוי משנה בו משהו.

## בטיחות — נמדד ולא הוצהר

* **הרשאות אחרי `create or replace`** (הוא אינו מאפס אותן, והמיגרציה כותבת אותן
  שוב במפורש): `anon=false`, `authenticated=false`, `service_role=true`.
* **מצב טסט:** `delivery_log=3` ללא שינוי, אפס שורות `mode=live`, אפס שורות עם
  `sent_at`. אין מייל, אין הודעה ואין מסמך שיצא החוצה.
* **בידוד ממנוע המקור:** `max_attempts=0` בשתי שורות השכפול (21, 22), והפרדיקט
  המדויק של `bkalot_auto.queue_due` מחזיר `[6]` בלבד. המעבד לא הורץ בכוונה.
* **המקור לא נגע:** 8 שורות `app_key='bkalot'` נשארו 8, טביעת אצבע
  `aa6929ee28d13b34a01b5806d2598254` זהה לפני ואחרי.
* **גלגול אחורה מלא ובסדר הנכון** (מסמכים לפני שורות התור — `documents.queue_id`
  הוא FK; פניות לפני אנשי הקשר — `cases_contact_id_fkey` הוא `ON DELETE SET NULL`):
  אחרי הניקוי `cases=0, case_rights=0, documents=0, templates=2, contacts=4,
  outbound_queue=8, delivery_log=3, catalog=888` — זהה בדיוק לבסיס שנמדד לפני.
* **מוגן:** אין נגיעה ב-08/09, ב-`bkalut-app`/`bkalot-admin`/`zr_*`/`NEDARIM3873`
  ולא בסכמות `csj`/`csj_src`/`igud`. `bkalot_auto` נקראת בלבד.

## מה שנשאר פתוח ולא נבלע

* **אין שולח** (#234 סעיף 2) — השורה נכנסת לתור ונשארת שם. זו הלבנה הבאה של §5ב.
* העמודה במסך + מדידה מעל HTTP של השדות שנוספו כאן.
* `cases.status` נשאר `new` גם אחרי הכניסה לתור.
* `documents.kind=pdf/audio` → `channel_unsupported`.
* `public_visible` ו-`show_in_showcase` של #37 נשארים `false`.
