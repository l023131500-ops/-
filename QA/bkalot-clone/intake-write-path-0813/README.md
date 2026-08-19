# שכפול בקלות · שכבה 1 — נתיב הכתיבה של הפנייה (13/08, #222)

**מה נבנה:** `public.bkalot_clone_intake(jsonb)` — פונקציה אחת שהיא כל הקליטה.
מיגרציה `supabase/migrations/0058_the_clone_had_three_tables_and_no_way_to_write_a_case_into_them.sql`.

## למה פונקציה ולמה ב-public

0057 יצר את שלוש הטבלאות עם RLS דלוק ואפס policies, והרשאות ל-`service_role`
בלבד. כלומר טבלאות שאין להן ולו נתיב כתיבה אחד. `bkalot_clone` גם אינה חשופה
ל-PostgREST (רק `public`/`graphql_public` הן), ולכן פונקציה ב-`public` היא הצורה
היחידה שאפשר לקרוא לה מ-edge function בלי חיבור DB ישיר.

`SECURITY DEFINER` + `search_path` ריק + כל שם מלא. היא עוקפת RLS בכוונה, והיא
הדבר היחיד שעושה זאת.

## הכרעות שנגזרות מ-BKALOT_METHOD.md ולא מהעדפה

1. **מפתח הזהות הוא הטלפון** (§8 — `clients.phone` unique במקור). ה-upsert נופל
   על `bkalot_auto.contacts` unique(app_key, phone) הקיים.
2. **הסוג מכווץ את הטופס** (§8, `service-form.tsx:278-283`). רק `treatment` פותח
   קליטה מלאה; `info`/`reminder` הם פרטי קשר בלבד. שדה שנשלח אליהם ואינו שייך
   להם אינו נכתב לעמודה — ומדווח חזרה ב-`dropped[]`, לא נבלע. ה-payload המלא
   נשמר ב-`cases.raw` בכל מקרה.
3. **הזכויות נקראות חי** מ-`rights.situation_map`, בסדר `main → more → health`.
   קוד שאינו קיים ב-`rights.catalog` אינו נכתב וחוזר ב-`rights_unknown[]`.

## מה נמדד — 9 דחיות

כל אחת הוחזרה כ-JSON ולא כחריגה, כדי שקורא HTTP יקבל תשובה ולא 500:

| קלט | תשובה |
|---|---|
| בלי `kind` | `kind_invalid` + `allowed[3]` |
| `kind:"urgent"` | `kind_invalid` |
| `phone:"abc"` | `phone_invalid` |
| בלי `full_name` | `full_name_required` |
| `email:"nope"` | `email_invalid` |
| `treatment` בלי מייל | `email_required_for_treatment` |
| `treatment` בלי מצב | `situation_required_for_treatment` |
| `treatment` + מצב לא קיים | `situation_unknown` + `allowed[24]` |
| `source:"sms"` | `source_invalid` + `allowed[5]` |

## מה נמדד — 3 מסלולים מוצלחים

| # | קלט | תוצאה |
|---|---|---|
| א | `info`, טלפון `050-123-4567`, ועוד `situation`+`topic_no`+`documents` | `case_id=3`, `contact_id=9`, `dropped=["situation","topic_no","documents"]`, ובשורה `situation=null topic_no=null` — ו-`raw` מחזיק את שבעת המפתחות ששלח הלקוח |
| ב | `reminder`, אותו אדם בכתיב `+972-50-123-4567` | **`contact_id=9` — אותו איש.** הנרמול 972→0 עובד; השם עודכן, המייל נוסף, `consent` עלה ל-true |
| ג | `treatment`, `situation=disability`, `source=nedarim` | `rights_linked=59`, `rights_unknown=[]`, `topic_no=7` נשמר |

**סדר הדירוג אומת ולא הונח:** ששת הראשונים ב-`case_rights` של פנייה ג הם
`B100 B111 B114 B124 B144 B195` — בדיוק `codes->'main'` של `disability`, באותו סדר.

## הרשאות

`has_function_privilege`: `anon=false`, `authenticated=false`, `service_role=true`.
פונקציה חדשה בפוסטגרס מקבלת `EXECUTE` ל-`PUBLIC` כברירת מחדל, וזו פונקציית
`SECURITY DEFINER` שעוקפת RLS ויושבת ב-`public` — בלי ה-`revoke` כל מחזיק מפתח
anon היה כותב לסכמה שכל 0057 סגר בפניו.

## מצב טסט — אומת שלא יצא כלום

הפונקציה אינה נוגעת ב-`bkalot_auto.outbound_queue` כלל, ומחזירה `queued:false`.
לפני ואחרי: `outbound_queue=8`, `delivery_log=3`.

## הבדיקה התגלגלה אחורה

לפני: cases 0 · case_rights 0 · documents 0 · contacts 4 · queue 8 · catalog 888 · situation_map 24
אחרי הניקוי: **זהה בדיוק.** לא נשארה שורת בדיקה במסד.

## מה נשבר בדרך ונתפס

`text[] || 'literal'` בפוסטגרס פותר את הליטרל כ-`text[]` ולא כ-`text`, ולכן
**כל** מסלול `info`/`reminder` שהיה מדווח `dropped` נפל ב-`22P02` לפני שנכתבה
שורה. תשע הדחיות עברו בלי לגלות את זה — הן חוזרות לפני ההשמה. רק המסלול
המוצלח הראשון חשף אותו. תוקן ל-`|| 'literal'::text`, והקובץ בריפו מחזיק את
הגרסה המתוקנת.

## מה לא נבנה כאן, ומה הפריט הבא

- **אין עדיין תעבורת HTTP.** הפונקציה היא נתיב הכתיבה; ה-edge function שעוטף
  אותה והטופס עצמו הם הפריט הבא (#223).
- `documents` לא נכתבת — היא שכבה 2/3.
- `automation_configs` עדיין לא שוכפלה (BKALOT_METHOD §8).

🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
csj/csj_src/igud. `rights.*` נקראת בלבד; `bkalot_auto.contacts` נכתבת דרך
הפונקציה בלבד, ואין עליה DDL.
