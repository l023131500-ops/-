# שכפול בקלות — שכבה 3, לבנת השליחה הראשונה: כניסה לתור (0067)

**מתי:** 14/08/2026 · **מיגרציה:** `0067_the_letter_was_produced_and_nothing_could_put_it_in_the_queue.sql`
**כרטיס:** #234 נפתח (נתיב HTTP + שולח) · **קודם:** #233 נסגר ב-0064/0066

## מה היה

0064 הכרעה 5 הגדירה במפורש: «queue_id null הוא טרם נשלח, ושכבת השליחה תמלא אותו».
שכבת השליחה לא נבנתה, ולכן `bkalot_clone.documents.queue_id` נשאר null בכל מסמך שהופק
אי פעם — ואין ולו נתיב אחד שיכול למלא אותו. המסמך היה קובץ שיושב במסד בלי נמען,
בלי ערוץ ובלי תאריך.

## מה נבנה

`public.bkalot_clone_queue(jsonb)` — מכניס מסמך שהופק לתור. **מכניס ואינו שולח.**
אין בפונקציה `net.http`, אין `pg_net`, אין Resend ואין תור עבודה.

בנוסף: `public.bkalot_clone_admin_document` הורחבה בשני שדות — `queue_status` ו-`queue_mode`.
עד היום `queue_id` non-null היה שקול ל«נשלח»; מהיום הוא יכול להיות גם שורה חסומה
שלא תישלח לעולם, ובלי השדות האלה מסך הניהול היה קורא «חסום» כ«נשלח».

## הבידוד ממנוע המקור — ההכרעה המרכזית

`bkalot_auto.queue_due` ו-`queue_process_dryrun` סורקות לפי
`status='queued' and mode='test' and scheduled_at<=now() and attempts<max_attempts`,
**בלי סינון app_key**. שורה של השכפול עם `max_attempts` ברירת-מחדל הייתה נשאבת למעבד
של המקור, ושם `build_content(topic_id)` הייתה רצה על `topic_id=null` ומסמנת אותה
`failed` — המעבד של המקור בונה תוכן מחדש מנושא ואינו קורא את הגוף ששמור בשורה.

הפתרון בנתון ולא בשינוי קוד המקור: שורות השכפול נכנסות עם **`max_attempts=0`**.
זה בדיוק מה שהמשפט אומר — אין ולו ניסיון אוטומטי אחד המותר על השורה הזו.
**שום פונקציה של `bkalot_auto` לא שונתה.**

## המדידה

נתוני הבדיקה נוצרו דרך נתיב הקליטה האמיתי מעל HTTP
(`functions/v1/bkalot-clone-intake`, 200) ולא בהזרקה למסד: פניות 30/31/32,
`situation=disability`, 59 זכויות כל אחת. אחריהן `bkalot_clone_render` → מסמכים 25/26/27.

| מסלול | קלט | תוצאה |
|---|---|---|
| יעד ברשימת הבדיקה | מסמך 25, `qa.bkalot@more30.com` | `queue_id=9`, `status=queued`, `blocked=false`, 7,596 בתים |
| לחיצה שנייה | אותו מסמך 25 | `queue_id=9` שוב, `already_queued=true` — **לא נוצרה שורה שנייה** |
| יעד שאינו ברשימה | מסמך 26, `not-a-test-target@example.com` | `queue_id=10`, `status=blocked`, נוסח המקור מילה במילה: «היעד אינו ברשימת יעדי הבדיקה. לא יישלח.» |
| בלי הסכמה | מסמך 27, `consent=false` | `no_consent` — **לא נכתבה שורה בכלל**, `queue_id` נשאר null |
| בלי מזהה | `{}` | `document_id_required` |
| 25 ספרות | `9999…9` | `document_not_found` (ולא נפילת bigint) |
| מזהה שאינו קיים | `999999` | `document_not_found` |

**התוכן שנכנס לתור הוא התוכן שהופק, ולא נבנה מחדש** — נמדד ולא הונח:
`q.body = d.body_html` → true, `q.subject = d.title` → true,
`q.content_bytes = octet_length(d.body_html)` → true. בשתי השורות.

**הבידוד נמדד:** הפרדיקט המדויק של `queue_due`/`queue_process_dryrun` הורץ כקריאה
בלבד (המעבד עצמו **לא** הורץ — הרצתו הייתה משנה את שורת המקור 6 ומוסיפה שורת
`delivery_log`). התוצאה: שורה אחת בלבד — `id=6, app_key=bkalot` — ולא שורת השכפול 9,
למרות ש-9 היא `status=queued, mode=test, scheduled_at<=now()`.

**`admin_document` אחרי ההרחבה:** מסמך 25 → `queue_status=queued`;
מסמך 26 → `queue_status=blocked`; מסמך 27 → `queue_status=null, queued=false`.

**הרשאות נמדדו אחרי ולא הונחו** (פונקציה חדשה ב-public מקבלת EXECUTE ל-PUBLIC
כברירת מחדל, ומפתח ה-anon גלוי בטופס הציבורי מאז #223):
`bkalot_clone_queue` ו-`bkalot_clone_admin_document` — anon=false, authenticated=false,
service_role=true.

## מצב טסט — נמדד ולא הוצהר

`mode='test'` קשיח בקוד; **אין ארגומנט שמאפשר live**. אחרי כל שבע הקריאות:
`delivery_log=3` (ללא שינוי), אין ולו שורה אחת עם `sent_at`, אין שורה עם `mode='live'`,
ו-`dry_run_at` נשאר null. אין מייל, אין הודעה ואין מסמך שיצא החוצה.

## המקור לא נגע

8 שורות התור של `app_key='bkalot'` נשארו 8, וטביעת האצבע שלהן
(id:status:status_detail:attempts) זהה לפני ואחרי: `aa6929ee28d13b34a01b5806d2598254`.
`git status` על `apps/08-bkalut-app` ו-`apps/09-bkalot-admin` ריק. אין נגיעה ב-
`bkalut-app`/`bkalot-admin`/`zr_*`/`NEDARIM3873` ולא בסכמות `csj`/`csj_src`/`igud`.

## הבדיקה התגלגלה אחורה במלואה

בסדר הנכון (מסמכים → שורות תור → זכויות → פניות → אנשי קשר; `cases_contact_id_fkey`
הוא `ON DELETE SET NULL` והסדר ההפוך היה מייתם פניות בשקט):
3 מסמכים, 2 שורות תור, 177 `case_rights`, 3 פניות, 3 אנשי קשר.

**אחרי, זהה בדיוק לבסיס שלפני:** cases=0 · case_rights=0 · documents=0 · admin_users=1 ·
contacts=4 · outbound_queue=8 · delivery_log=3 · catalog=888 · templates=2.

## אין בצעד הזה צילום מסך

אין מסך שהשינוי משנה בו משהו: ל-`bkalot_clone_queue` אין כתובת HTTP,
`bkalot-clone-admin` נשארה v3 ו-`admin.html` לא נגעה. זה בדיוק #234.

## מה נשאר פתוח (#234)

1. **אין כתובת HTTP ואין כפתור** — נתיב `queue` ב-`bkalot-clone-admin` מאחורי שער
   הסשן, ואז «הכנס לתור» ב-`admin.html` ליד «הפק מסמך».
2. **אין שולח** — השורה נכנסת ונשארת. שולח לשכפול יסרוק לפי `app_key='bkalot-clone'`
   ויקבע `max_attempts` בעצמו.
3. `cases.status` נשאר `'new'` גם אחרי הכניסה לתור (`'sent'` יהיה שקר).
4. `documents.kind='pdf'/'audio'` → `channel_unsupported`: אין להם ערוץ בשכפול.
5. `public_visible` ו-`show_in_showcase` של #37 נשארים false.
