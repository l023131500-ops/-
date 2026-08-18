# 28 kupot-health-funds — switch-lead flow, verified live (19/08/2026)

## למה נבדק
`core.projects` (number=28) הכריז audit_gaps #1: "hf_switch_leads=0 — טופס המעבר
לא הביא ליד אחד; צריך לוודא שהוא באמת נשמר ומגיע למישהו." זה קרא כחשד לבאג
בזרימה קריטית (טופס → DB), אז נבדק לפני שנפתח כל עבודת תיקון.

## מה נמדד
1. קריאת קוד: `server/routes.ts` (`POST /api/switch-lead`) → `server/supabase.ts`
   (`insertLeadToSupabase`) כותב ל-`${SUPABASE_URL}/rest/v1/hf_switch_leads` עם
   `Content-Profile: kupot|<SUPABASE_SCHEMA>`. `core.projects.supabase_schema`
   ל-28 = `public`, ו-Vercel project `kupot-more30` (הפרויקט שמשרת
   `more30.com/kupot`) מגדיר `SUPABASE_SCHEMA` כ-env — לא ברירת המחדל `kupot`.
2. `select count(*) from public.hf_switch_leads` **לפני** הבדיקה: **1** (לא 0
   כפי שה-audit הישן טען — כבר היה שם ליד-QA ישן מ-18/08, `id=2`,
   `full_name="בדיקת מערכת - אל תיצור קשר QA"`).
3. שליחת POST אמיתי ל-`https://more30.com/kupot/api/switch-lead` (נתוני QA
   מסומנים בבירור: `topic="QA_TEST_DELETE_ME"`, `phone="0500000000"`) →
   **HTTP 201**, `{"ok":true,"id":null}` (id=null צפוי — `useSupabaseStore()`
   אמת ב-Vercel, אז השורה המקומית לא נוצרת, רק ה-Supabase remote).
4. `select ... from public.hf_switch_leads` אחרי הבדיקה: השורה החדשה (`id=3`)
   נמצאת שם עם כל השדות תואמים.
5. ניקוי: `delete ... where id in (2,3)` — שתי שורות ה-QA הוסרו, הטבלה חזרה
   למצב האמיתי (0 לידים אמיתיים).

## מסקנה
**הזרימה עובדת מקצה לקצה, לא שבורה.** ה-audit_gaps הישן היה מבוסס על ספירה
שכבר לא נכונה (או שנמדדה לפני שה-`SUPABASE_SCHEMA` env הוגדר נכון). הפער
האמיתי הוא **שיווקי, לא טכני**: הטופס עובד אבל אין תעבורה אמיתית אליו עדיין —
0 לידים אמיתיים, לא 0 בגלל באג. `core.projects.audit_gaps` עודכן כדי שהסבב
הבא לא יפתח שוב עבודת תיקון על זרימה שכבר עובדת.

שום קוד לא שונה. שום מסך/פיצ'ר לא נגע. תיקון תיעוד + ניקוי נתוני QA בלבד.
