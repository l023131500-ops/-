# BKALOT_METHOD — שיטת העבודה של בקלות, כפי שהיא בקוד

> **קריאה-בלבד.** נכתב 13/08/2026 מתוך קריאה של שני הריפואים המוגנים
> `l023131500-ops/bkalut-app` (08, main, 269 קבצים) ו-`l023131500-ops/bkalot-admin`
> (09, main, 6 קבצים), דרך GitHub contents API. **לא נכתב, לא נמחק ולא נפרס דבר
> אליהם.** הקבצים נמשכו לתיקייה זמנית מחוץ לריפו הזה ולא הוכנסו לעץ.
>
> זהו המסמך ש-`BKALOT_CLONE_BUILD.md` §"שיטת העבודה שצריך ללמוד ולתעד" דורש:
> איך פנייה הופכת למסמך, מאיפה נשלף נוסח הזכות, איך נבחר ערוץ השליחה, ומה
> הטריגרים. כל טענה כאן מלווה בקובץ ובשורה. מה שלא נקרא — מסומן במפורש.

---

## 0. הממצא שקובע את כל תכנון השכפול

**בקלות התפעולית אינה שולחת כלום בעצמה.** אין בה לקוח SMTP, אין קריאה ל-Resend,
ואין שיחה יוצאת מהאתר הזה. כל מסלול יוצא — פנייה, מייל תשובה, מסירת פרטי כניסה,
החלטת פרימיום — מסתיים ב**קריאת HTTP אחת** אל אותה כתובת n8n:

```
https://n8n.l023131500.work/webhook/NEDARIM3873
```

`server/webhook-bus.ts:14` (`DEFAULT_LEAD_WEBHOOK_URL`), ו-`server/routes.ts:54-56`
שמאפשר לדרוס אותה ב-`BKALUT_N8N_WEBHOOK_URL`.

הקוד עצמו אומר את זה בפירוש בשני מקומות, וזו הצהרה ולא פרשנות:

- `server/routes.ts:1495` — *"The actual email/whatsapp dispatch happens in n8n.
  We mark the delivery state…"*
- `server/general-inquiry.ts:11-13` — *"Sending is performed through the unified
  webhook bus … so we never falsely claim 'email sent' — only 'delivered to
  webhook' when the endpoint returned 2xx."*

וגם בנוסח שהמשתמש רואה: `server/routes.ts:1547` — «הועבר ל-NEDARIM3873. השליחה
בפועל תלויה באוטומציה בצד n8n.»

**המשמעות לשכפול:** מה שחסר לעותק אינו טופס ואינו מסד — אלה קיימים ומתועדים
כאן. חסר בדיוק **הצד השני של אותו webhook**: מה ש-n8n עושה אחרי ה-POST. הוא
אינו בריפו, ו-`NEDARIM3873` הוא מוגן ואסור בנגיעה. לכן שכבה 3 של העותק אינה
"שכפול קוד" אלא **בנייה מחדש של הצד שאין לו קוד לקרוא**, על `bkalot_auto`
שכבר קיים (topics, contacts, intake_log, outbound_queue, delivery_log,
test_targets) — במצב טסט, לפי `BKALOT_CLONE_BUILD.md`.

---

## 1. איך פנייה נכנסת — שלוש דלתות, מודל אחד

| דלת | קוד | מה נשמר |
|---|---|---|
| טופס השירות באתר | `client/src/pages/service-form.tsx` | `service_submissions` |
| Webhook נכנס (אתרים אחרים / קמפיינים) | `server/routes.ts:~1600-1745` | `inbound_leads` |
| חזרה מ-n8n / נדרים | `POST /api/inbound/from-n8n` (`server/routes.ts:4331`) | `inbound_leads`, `source="n8n_nedarim"` |

בנוסף קיים מסלול תזכורת ציבורי `/#/r/:topicId` שנשמר ב-`reminder_responses`
(`shared/schema.ts:426-440`) עם שלוש תשובות בלבד: `yes | not_yet | not_eligible`,
ו-`next_reminder_date` כשהתשובה `not_yet`.

### 1.1 שלושת סוגי הפנייה — וזה הצומת שמכתיב הכל

`server/routes.ts:124-131` ו-`client/src/pages/service-form.tsx:125`:

```
info      — מידע בלבד
reminder  — קבלת תזכורת לביצוע המשימה
treatment — טיפול בפועל במשימה
```

הבחירה הזו אינה תווית. היא **מכווצת את הטופס עצמו** (`service-form.tsx:278-283`):

- `treatment` בלבד → קליטה מלאה (`shouldShowFullIntake`), רשימת מסמכים
  (`shouldShowDocuments`), וקבוצת שדות הקשר הרחבה (`broadContactIds`).
- `info` / `reminder` → **פרטי קשר בלבד** (`minimalContactIds`), והכותרת עצמה
  מתחלפת ל«פרטי קשר בלבד» (`service-form.tsx:446`).
- `treatment` בלבד גורר דמי ייפוי-כוח (`requiresPoaFee`, `service-form.tsx:156`).

**זה הלב של השיטה:** ככל שהלקוח מבקש יותר, כך נדרש ממנו יותר — ולא להפך.
מי שרוצה מידע לא ממלא שאלון.

### 1.2 מה נשמר בפנייה

`shared/schema.ts:35-55` — `service_submissions`:
`client_id`, `right_id`, `topic`, `category`, `request_type`,
`potential_percent` + `potential_level` (ציון הפוטנציאל, מחושב לפני השליחה),
`answers_json`, `details_json`, `documents_json`, `additional_topics_json`,
`terms_accepted`, ואז שלושה שדות שהם כל התיעוד של המסירה:
`webhook_status` (ברירת מחדל `pending`), `webhook_response`, `webhook_sent_at`.

הלקוח עצמו הוא `clients` (`schema.ts:22-33`) — **המפתח הייחודי הוא הטלפון**
(`phone` … `.unique()`), לא המייל ולא ת"ז. פנייה חוזרת מאותו טלפון מתמזגת ללקוח
קיים; זו הכרעת זהות, ושכפול שיבחר מייל כמפתח ייצור כפילויות שהמקור לא מייצר.

---

## 2. מאיפה נשלף נוסח הזכות

מאגר הזכויות אינו בקובץ ואינו בקוד — הוא במסד, ונערך מ-09.

`bkalot-admin/README.md:16-18` ו-`bkalot-admin/config.js:3`: הכל ב-Supabase
`bieebmnmkffwbqlsfozh`, בטבלאות `zr_topics`, `zr_situations`,
`zr_situation_topics`, `zr_questions`, `zr_answer_rules`, `zr_leads`.
**זהו בדיוק ה-`zr_*` המוגן** — קריאה בלבד, ואיסור מוחלט על כתיבה.

הכתיבה מ-09 אינה ישירה: היא עוברת דרך edge function `zr-admin-api`
(`config.js:7`), והמפתח שיושב ב-`config.js` הוא `anon` לקריאה בלבד
(`README.md:47-48`). הכניסה ל-09 היא Google דרך Supabase Auth למייל המנהל
בלבד, עם גיבוי שם-משתמש/סיסמה (`README.md:22-24`).

### 2.1 נוסח אחד, תשעה שימושים — וזה החידוש האמיתי במאגר

`server/routes.ts:58-122` מגדיר `AUTOMATION_CHANNELS`: תשעה **צרכנים** של אותה
שורת זכות, שכל אחד מהם קורא שדה אחר מאותה רשומה:

| מפתח | לְמה | השדה שנקרא |
|---|---|---|
| `client_email` | מייל/הודעה כתובה ללקוח | `emailScript` |
| `voice_message` | הודעה קולית קצרה | `voiceShort` |
| `voice_podcast` | מערכת קולית / פודקאסט | `podcastScript` |
| `video_generator` | מחולל וידאו | `podcastScript` |
| `eligibility_bot` | בוט בדיקת זכאות | `eligibilityJson` |
| `intake_form` | שאלון קליטה פרטני | `intakeJson` |
| `documents_checklist` | רשימת מסמכים להגשה | `documentsJson` |
| `public_site` | פרסום לציבור | `publicSiteText` |
| `ai_agent` | סוכן AI פנימי | `aiSearch` + `aiExtra` |

**כלומר הזכות אינה טקסט אחד שמעובד לפי ערוץ — היא נכתבת מראש בתשעה נוסחים,
בעריכה אנושית ב-09.** מסמך, מייל, הקראה ובוט אינם גרסאות של אותו נוסח; הם
שדות נפרדים באותה שורה. שכפול שינסה לייצר נוסח קולי מתוך נוסח המייל
(או ב-LLM) יבנה מערכת אחרת מהמקור.

הערה שרשומה בקוד עצמו ל-`public_site`: «יש לבדוק את שדה התאמה לציבור חרדי
לפני פרסום» — קהל היעד הוא חלק מהנתון, לא מהעיצוב.

בנוסף, לזכות יכול להיות נוסח צינתוק ייעודי: `yemot_right_config`
(`schema.ts:416-423`) — `tts_text` ו-`extension3_text` פר-`right_id`, «for
info/reminder request types» לפי ההערה שם. כלומר גם ערוץ הקול נגזר מהזכות
ומסוג הבקשה, ולא מחושב בזמן ריצה.

---

## 3. איך פנייה הופכת למסמך/הודעה

התבנית היא **נתון במסד, לא קוד**. `server/general-inquiry.ts`:

- התבנית יושבת ב-`automation_configs` תחת `key="general_inquiry_reply"`
  (`general-inquiry.ts:19`), וה-`configJson` מחזיק
  `{ subject, body, channels[], defaultPublicEligibilityUrl }` (שורות 4-5).
- הרינדור הוא החלפת מצייני-מקום פשוטה: `{{fullName}}`, `{{phone}}`,
  `{{email}}`, `{{publicEligibilityUrl}}`; **מציין לא-מוכר מוחלף במחרוזת ריקה**
  ולא נשאר גלוי ללקוח (`renderInquiryReply`, שורות 99-117).
- יש נוסח נפילה מלא בקוד (`FALLBACK_TEMPLATE`, שורות 29-41) — אם השורה במסד
  חסרה או שבורה, המערכת שולחת נוסח תקין ולא נופלת ולא שולחת ריק.
- ההודעה המוגמרת נארזת ל-payload עם `templateKey`, `kind`, `channels`, `to`,
  `subject`, `body`, `vars`, `lead`, `issuedAt` (שורות 145-159) — ונשלחת
  ל-webhook. **היא לא נשלחת ללקוח מכאן.**

**מסקנה לשכפול:** "הפקת מסמך" בבקלות היא רינדור תבנית מהמסד, לא מנוע PDF.
ייצוא PPTX/PDF/CSV קיים — אבל בצד הניהול (09), על הקטלוג, ולא על הפנייה
(`bkalot-admin/README.md:3`).

---

## 4. איך נבחר ערוץ השליחה

בשלוש רמות, וכולן נתונים:

1. **בתבנית** — `channels[]` ב-`configJson` של התבנית; ברירת המחדל `["email"]`
   (`general-inquiry.ts:39`), וניתן לדרוס בקריאה (`opts.channels`, שורה 143).
2. **בתור היוצא** — `delivery_queue.channel` מוגבל ל-`email | whatsapp | voice | n8n`
   (`schema.ts:127`, ונאכף שוב ב-`routes.ts:1054`).
3. **ביעד** — `automation_configs.key` קובע לאיזו כתובת ה-POST הולך:
   `webhook_rights_lead` לפניית זכויות מול `webhook_financial_lead` לפיננסי
   (`routes.ts:1727-1728`), `webhook_email_automation` למייל
   (`general-inquiry.ts:20`). `dispatchWebhook` שולף את `endpointUrl` מהשורה
   הזו, ואם אין — נופל לכתובת ברירת המחדל (`webhook-bus.ts:60-75`).

`automation_configs` (`schema.ts:149-164`) מחזיקה `enabled`, `endpointUrl`,
`secret_ref` — **שם משתנה הסביבה, לעולם לא הסוד עצמו** (הערה בשורה 156) —
ו-`last_status` / `last_tested_at` / `last_result` לבדיקת חיבור.

תור המסירה עצמו (`delivery_queue`, `schema.ts:125-144`) מחזיק
`status` (`pending | sent | failed | skipped`), `status_detail`, `attempts`,
`endpoint_used`, `response_text`, `scheduled_at`, `sent_at`, `created_by`.
זה תור עם מצב, תזמון וניסיונות — לא רשימת "נשלח".

---

## 5. הטריגרים — מה גורם לשליחה

**אין תזמון אוטומטי בקוד שנקרא.** כל דיספאץ' יוצא נובע מאירוע:

| מקור (`webhook_log.source`) | הטריגר |
|---|---|
| `bkalut_service_form` | הגשת טופס השירות |
| `inbound_rights_lead` / `inbound_financial_lead` | webhook נכנס (`routes.ts:1730`) |
| `bkalut_n8n_inbound` | חזרה מ-n8n/נדרים (`routes.ts:4411`) |
| `credentials_delivery` | מסירת פרטי כניסה למשתמש חדש (`schema.ts:109`) |
| `premium_decision` | הכרעת בקשת פרימיום (`premium_requests`, `schema.ts:95-103`) |
| `general_inquiry_reply` | מענה לפנייה כללית (`general-inquiry.ts:162`) |
| `manual` | שליחה יזומה מהניהול |

`webhook_log` (`schema.ts:107-121`) מתעד כל ניסיון: `payload_json` (נגזר
ל-200KB), `http_status`, `response_text`, `attempts`, `last_attempt_at`,
`next_retry_at`. **הניסיון החוזר אינו אוטומטי** — הכישלון קובע
`next_retry_at` (15 דקות מהכישלון הראשון, 30 דקות מניסיון חוזר —
`webhook-bus.ts:109` ו-`:143`), אבל מי שמפעיל את `retryWebhookLog` הוא אדם
מהניהול. לא נמצא scheduler שקורא לו.

---

## 6. שתי הכרעות טכניות במקור ששכפול חייב להחליט עליהן במודע

### 6.1 המסד כפול, והבחירה בזמן ריצה
`server/storage.ts` בונה גם דרייבר SQLite מקומי (`new Database("data.db")`,
`drizzle-orm/better-sqlite3`) וגם `SupabaseStorage`, ו-`pickStorage()` בוחר
ביניהם: יש URL+key → Supabase, אין → קובץ מקומי. `shared/schema.ts` כולה
`sqliteTable`. כלומר סכמת המקור נכתבה ל-SQLite ורצה מול Postgres.
**לעותק אין את הדואליות הזו** — `bkalot_clone` היא Postgres בלבד, וזה נכון:
אבל המשמעות היא שאין להעתיק טיפוסים משם כמות שהם (תאריכים הם `text`
ISO-8601, בוליאנים הם `integer` 0/1).

### 6.2 סיסמה בהיר בטבלה
`app_users` (`schema.ts:68-69`) מחזיקה גם `password_hash` (sha256) וגם
`password_plain`, המסומן «ephemeral, cleared after first delivery» — כלומר
הסיסמה נשמרת בהיר עד שנמסרה ללקוח, כדי שאפשר יהיה למסור אותה.
**אל תשכפל את זה.** העותק צריך מסירה חד-פעמית בלי אחסון בהיר, וזה הפרש
מכוון מהמקור שראוי לרשום כאן ולא לגלות בדיעבד. (שים לב גם ש-sha256 חשוף
אינו hash סיסמאות ראוי.)

הערה נוספת: הסשן של הניהול הוא טוקן אטום ב-`admin_sessions` שנשלח בכותרת
Authorization מ-state בזיכרון — **בלי localStorage ובלי cookies**
(`schema.ts:166-168`). זה דפוס נכון ששווה להעתיק.

---

## 7. מה נקרא ומה לא

**נקרא במלואו:** `shared/schema.ts`, `server/webhook-bus.ts`,
`server/general-inquiry.ts`, `bkalot-admin/README.md`, `bkalot-admin/config.js`.
**נקרא חלקית (מדגם ממוקד):** `server/routes.ts` (214,747 בייט — נקראו אזורי
הקבועים, ה-payload המנורמל ורשימת המקורות), `server/storage.ts`,
`client/src/pages/service-form.tsx`.
**לא נקרא:** `bkalot-admin/app.js` (69,675 בייט), `server/yemot.ts`,
`server/supabase-storage.ts`, `server/price-comparison.ts` ושאר 260 הקבצים.

**מה שנשאר לא ידוע, ולא נוחש:** מה n8n עושה אחרי ה-POST. זה הפער היחיד
שחוסם שכפול נאמן של שכבה 3, והוא אינו ניתן לסגירה מקריאת הקוד — הוא מחוץ
לשני הריפואים. ראה `BKALOT_AUTOMATION_DISCOVERY.md` §3.4 ו-§8, שהגיע לאותה
מסקנה מכיוון אחר (ה-callback של בקלות לא אותר באף ריפו).

## 8. תרגום לעותק (`bkalot_clone`)

| בקלות (מוגן) | העותק |
|---|---|
| `clients` (מפתח: טלפון) | `bkalot_auto.contacts` — קיים |
| `service_submissions` / `inbound_leads` | `bkalot_clone.cases` (`topic_no`, `situation`, `source`) |
| בחירת הזכויות בפנייה | `bkalot_clone.case_rights` |
| רינדור תבנית → payload | `bkalot_clone.documents` |
| `delivery_queue` + `webhook_log` | `bkalot_auto.outbound_queue` + `delivery_log` (`mode` = test) |
| `automation_configs` | עדיין לא נבנה — זה הפריט הבא אחרי שכבה 1 |
| POST ל-NEDARIM3873 | **לא משוכפל.** שליחה נכתבת לתור ואינה יוצאת עד אישור |
| `zr_*` (קטלוג) | `rights.catalog` דרך `bkalot_clone.rights_catalog` — קריאה חיה, 888 |
