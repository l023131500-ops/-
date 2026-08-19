# 0068 — כתובת הנמען וההסכמה שייכות לפנייה, לא לאיש הקשר (#235)

**14/08 · מיגרציה בלבד.** אין שינוי קוד לקוח, אין פריסת edge function ואין
פריסת פורטל. `apps/37-bkalot-clone` לא נגעה, `bkalot-clone-admin` נשארה v4.

## הקו שנלקח

הפעימה הקודמת (55efb75) הותירה שני קווים פתוחים: #234 סעיף 2 (אין שולח) ו-#235.
נלקח #235 — והוא נלקח **לפני** השולח בכוונה, כי הכרטיס עצמו ניסח את זה:
«זו החלטה שצריכה להיקבע במפורש לפני שנבנה שולח: הכתובת היא של איש הקשר או של
הפנייה». שולח שייבנה מעל ההכרעה הלא-נכונה שולח מכתב לכתובת של אדם אחר.

## מה היה

`bkalot_clone_intake` מאתר איש קשר לפי `(app_key, phone)` בלבד, ובעדכון:

```
email   = coalesce(excluded.email, contacts.email)   -- המייל נדרס
consent = contacts.consent or excluded.consent       -- ההסכמה דביקה-אמת
```

`bkalot_clone_queue` (0067) קרא את `v_contact.email` בזמן ההכנסה לתור. כלומר
המכתב יוצא לכתובת שהייתה באיש הקשר **ברגע הלחיצה**, ולא לזו שנמסרה בפנייה.

## ההכרעה

כתובת היעד וההסכמה הן נתון של **הפנייה** — מה שהאדם כתב וסימן באותה הגשה —
ונשמרות עליה ברגע הקליטה (`cases.to_email`, `cases.consent`). התור קורא את
הצילום. איש הקשר נשאר מפתח זהות לפי טלפון ואינו מקור לכתובת.

ההסכמה נבדקת **פעמיים**: על הפנייה (הסכים בהגשה הזו) ועל איש הקשר (לא סומן
מאז כמי שאין לפנות אליו). היום השני לעולם אינו false כשהראשון true, כי ה-upsert
הוא OR — אבל זה בדיוק מה שהופך «בטל הסכמה» עתידי לנתיב שיש לו משמעות במקום דגל
שאיש אינו קורא. שני המסלולים מחזירים `no_consent` ונבדלים ב-`consent_source`,
כי «לא הסכים» ו«ביקש שלא לפנות אליו» הם שני דברים שונים בעיני מי שיבדוק בדיעבד.

## המדידה

הקליטה רצה דרך נתיב ה-HTTP האמיתי (`intake.mjs`, אותו endpoint ומפתח anon
שהטופס הציבורי משתמש בהם) ולא בהזרקה למסד. render ו-queue נקראו כ-RPC — שניהם
service_role בלבד, ונתיב ה-HTTP שלהם כבר נמדד ב-98749fd ולא נגע כאן.

ארבע פניות, כולן treatment/disability, 59 זכויות כל אחת:

| פנייה | טלפון | מייל בפנייה | הסכמה | איש קשר |
|---|---|---|---|---|
| 41 | 0500000235 | qa.bkalot@more30.com | true | 47 |
| 42 | 0500000235 | later.overwrite.0814@more30.com | true | 47 (אותו אחד) |
| 43 | 0500000236 | qa.bkalot@more30.com | **false** | 49 |
| 44 | 0500000237 | qa.bkalot@more30.com | true | 50 |

הדריסה שוחזרה חיה: פניות 41 ו-42 חזרו שתיהן עם `contact_id=47`, ואחרי 42
`contacts.email` של 47 הוא `later.overwrite.0814@more30.com` — בזמן ש-
`cases.to_email` של 41 נשאר `qa.bkalot@more30.com`.

**A · doc 36 (פנייה 41)** → `queued`, `to_address=qa.bkalot@more30.com`,
`address_source=case`, `contact_email_differs=true`. זה הצעד עצמו.

**הנגד-עובדה, נמדדה ולא נגזרה בראש:** הכתובת ש-0067 היה קורא לפנייה 41 היא
`later.overwrite.0814@more30.com`, והיא **אינה** ברשימת יעדי הבדיקה
(`test_targets` מחזיקה שורה אחת בלבד — `qa.bkalot@more30.com`). כלומר לפני
הצעד הזה המכתב של פנייה 41 היה נכנס לתור עם הכתובת של פנייה 42 ונחסם. מה
שהציל אותו הוא רשימת ההיתר, לא נכונות הכתובת — וברגע שיהיה שולח ומצב live,
רשימת ההיתר לא תציל דבר.

**B · doc 38 (פנייה 42)** → `blocked`, `to_address=later.overwrite.0814@more30.com`,
`contact_email_differs=false`. כל פנייה נושאת את הכתובת שלה, גם כשהן חולקות
איש קשר.

**C · doc 40 (פנייה 43)** → `no_consent`, `consent_source=case`, ולא נכתבה שורת
תור בכלל. `contacts.consent` של 49 הוא false גם הוא — הפנייה היחידה על הטלפון
הזה, ולכן ה-OR לא הספיק להדליק אותו.

**D · doc 42 (פנייה 44)** — שומר ההשתקה נדרך במפורש: `contacts.consent` של 50
הועבר ל-false ידנית (נתון בדיקה של השכפול, `app_key='bkalot-clone'`), והקריאה
חזרה `no_consent` עם `consent_source=contact`. אחרי החזרת ההסכמה: `queued`,
שורת תור 20. לחיצה שנייה: אותה 20 ו«כבר היה בתור — לא נוצרה שורה שנייה».

## הבידוד ממנוע המקור — נמדד אחרי הכתיבה

שלוש שורות השכפול נכנסו עם `max_attempts=0`, והפרדיקט המדויק של
`bkalot_auto.queue_due` / `queue_process_dryrun`
(`status='queued' and mode='test' and scheduled_at<=now() and attempts<max_attempts`)
מחזיר `[6]` בלבד — שורת המקור — ולא את 18 ואת 20. המעבד לא הורץ בכוונה:
הרצתו הייתה מעבדת את שורה 6 של המקור ומוסיפה שורת delivery_log.

## מצב טסט — נמדד ולא הוצהר

`mode='test'` קשיח, אין ארגומנט שמאפשר live. אחרי כל הקריאות:
`delivery_log=3` ללא שינוי, `live_rows=0`, `sent_rows=0`. אין בפונקציה שום
מסלול יוצא. **אין מייל, אין הודעה ואין מסמך שיצא החוצה.**

## המקור לא נגע

8 שורות `app_key='bkalot'` נשארו 8, וטביעת האצבע זהה לפני ואחרי —
`aa6929ee28d13b34a01b5806d2598254`. `git status` על `apps/08-bkalut-app` ועל
`apps/09-bkalot-admin` ריק. אין נגיעה ב-`bkalut-app`/`bkalot-admin`/`zr_*`/
`NEDARIM3873` ולא בסכמות `csj`/`csj_src`/`igud`.

## הרשאות — נמדדו אחרי create or replace

`bkalot_clone_queue` ו-`bkalot_clone_intake`: `anon=false`,
`authenticated=false`, `service_role=true`.

## ההתגלגלות אחורה

בסדר הנכון — מסמכים לפני שורות התור (`documents.queue_id` הוא FK), והפניות
לפני אנשי הקשר (`cases_contact_id_fkey` הוא ON DELETE SET NULL). אחרי:
`cases=0, case_rights=0, documents=0, templates=2, contacts=4,
outbound_queue=8, delivery_log=3, catalog=888` — זהה בדיוק לבסיס שנמדד לפני.

## אין צילום מסך בצעד הזה

אין מסך שהשינוי משנה בו משהו: `admin.html` לא נגעה, ה-edge function לא נגע,
והשדות החדשים (`address_source`, `contact_email_differs`) עדיין אינם מוצגים.

## הבקרה על הצילום ההיסטורי

`cases` הייתה ריקה בזמן המיגרציה (נמדד: `cases=0` לפני), ולכן ה-backfill
מ-`raw` נגע ב-0 שורות. פנייה עתידית שאין ב-raw שלה מייל תישאר `to_email=null`
ותיחסם ב-`no_address` — וזה הנכון: אין לנו את הכתובת שנמסרה, ואיש הקשר אינו
תחליף לה.

## מה נשאר פתוח ולא נבלע

- **#234 סעיף 2 — אין שולח.** השורה נכנסת לתור ונשארת שם. הלבנה הבאה של §5ב.
- `bkalot_clone_admin_case` מחזירה מטא-דאטה בלי `queue_id` (0060), ולכן מסך
  הפנייה אינו יודע אילו מסמכים כבר בתור לפני לחיצה.
- `cases.status` נשאר `new` גם אחרי הכניסה לתור.
- `documents.kind='pdf'/'audio'` → `channel_unsupported`.
- `contact_email_differs` נמדד ואינו מוצג במסך הניהול — מנהל שרואה שתי פניות
  מאותו אדם אינו יודע שהכתובות שלהן שונות.
- `public_visible` ו-`show_in_showcase` של #37 נשארים false.
