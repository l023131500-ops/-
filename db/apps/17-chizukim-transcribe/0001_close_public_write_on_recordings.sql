-- 17 · תמלול חיזוקים — סגירת הכתיבה הציבורית על `public.recordings`
--
-- ✅ הורץ ואומת בפרודקשן 19/08/2026 (core.issues #243, BLOCKED.md §0).
--    server/routes.ts כותב עם SUPABASE_SECRET_KEY (Vercel env, chizukim2-more30)
--    ו-client/src/lib/supabase.ts עורך תמלילים דרך PATCH /api/recordings/:id
--    בשרת, לא ישירות מול PostgREST. הקובץ נשאר לתיעוד/הרצה חוזרת (idempotent).
--
-- ══════════════════════════════════════════════════════════════════════════
-- מה נמדד (02/08/2026), מול הפרודקשן, עם המפתח שמופיע בקוד הצד-לקוח
-- (`sb_publishable_Bv6ysG9LfUZ2lUPgZVZO6g_l1wEZIlX` — גלוי בכל דפדפן):
--
--   DELETE /rest/v1/recordings?id=eq.<uuid>   ->  204   ✱
--   PATCH  /rest/v1/recordings?id=eq.<uuid>   ->  204   ✱
--   POST   /rest/v1/recordings                ->  400  (עבר את RLS, נפל על סכימה)
--
--   ✱ שתי הבדיקות רצו עם מסנן שמתאים ל-**אפס שורות** בכוונה. 204 פירושו
--     שהפעולה הותרה ובוצעה — עם מזהה אמיתי, השורה הייתה נמחקת.
--
-- כלומר: 1,138 ההקלטות ו-1,112 התמלילים חשופים למחיקה או לשכתוב בידי כל מי
-- שפותח את כלי הפיתוח. אין כאן "פריצה" — המפתח הציבורי פשוט מורשה לכתוב.
-- ══════════════════════════════════════════════════════════════════════════
--
-- למה שתי מדרגות ולא אחת: השלב הראשון עוצר את הנזק **מיד** ואינו שובר את
-- הקריאה. הוא כן משבית את עריכת התמלילים מהדפדפן, ולכן השלב השני מחזיר
-- אותה — דרך השרת, עם מפתח סודי שלא יוצא ללקוח.

-- ── שלב 1 · עוצר את הדימום ───────────────────────────────────────────────
--
-- ⚠️ תיקון 19/08/2026 — שלב 1 **אינו** בטוח להרצה לבד. נמדד מול המקור:
--    `apps/17-chizukim-transcribe/server/routes.ts` שורה 23 קובע
--    `SUPABASE_KEY = "sb_publishable_…"` — כלומר גם השרת עצמו כותב עם המפתח
--    **הציבורי**, לא עם service_role. מפתח publishable כפוף ל-RLS בדיוק כמו
--    anon. לכן revoke + היעדר מדיניות כתיבה יחסמו גם את השרת: יצירת הקלטה
--    ושמירת תמלול ייפלו — הפלת נתיב הליבה החי, לא רק סגירת התוקף.
--    ההנחה הישנה כאן ("service_role עוקף אותו, ולכן השרת ימשיך") נכונה רק
--    אחרי שלב 2. עד אז שלב 1 = רגרסיה חיה. ראה BLOCKED.md §0 ו-core.issues.
--
-- שער-בטיחות: ההרצה נעצרת אלא אם הרצת קודם את שלב 2 (השרת על מפתח סודי,
-- פרוס ואומת) ואז אישרת זאת במפורש:
--     set more30.chizukim_server_on_secret_key = 'yes';
do $$
begin
  if current_setting('more30.chizukim_server_on_secret_key', true) is distinct from 'yes' then
    raise exception '%',
      'עצור: השרת (server/routes.ts:23) עדיין קורא עם sb_publishable (המפתח הציבורי). '
      'הרצת שלב 1 עכשיו תחסום גם את כתיבות השרת (יצירת הקלטה, שמירת תמלול). '
      'בצע קודם את שלב 2 (השרת על SUPABASE_SECRET_KEY, פרוס ואומת), ואז: '
      'set more30.chizukim_server_on_secret_key = ''yes''; והרץ שוב.';
  end if;
end $$;

alter table public.recordings enable row level security;

-- מוחקים כל מדיניות קיימת על הטבלה, כדי שלא תישאר אחת מתירנית מתחת לחדשות.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'recordings'
  loop
    execute format('drop policy %I on public.recordings', p.policyname);
  end loop;
end $$;

-- הארכיון ציבורי לקריאה — זו כל מהות המערכת, וחיפוש עובד בלי חשבון.
create policy recordings_public_read
  on public.recordings for select
  to anon, authenticated
  using (true);

-- ואין מדיניות כתיבה. בהיעדר מדיניות, RLS אוסר — ולכן INSERT/UPDATE/DELETE
-- ייעצרו לכל מפתח שאינו עוקף RLS. `service_role` עוקף אותו מעצם הגדרתו,
-- ולכן השרת ימשיך לעבוד ברגע שיקבל מפתח סודי.

-- חגורה ושליים: גם אם תיווצר מדיניות מתירנית בטעות, בלי ההרשאה ברמת הטבלה
-- אי אפשר לכתוב.
revoke insert, update, delete on public.recordings from anon;

-- ── שלב 2 · מחזיר את העריכה, דרך השרת ────────────────────────────────────
--
-- אחרי שלב 1 העריכה מהדפדפן תיעצר, כי `client/src/lib/supabase.ts`
-- (‎updateRecording‎) שולח PATCH ישירות ל-PostgREST עם המפתח הציבורי.
-- הסדר הנכון:
--
--   1. בלוח הבקרה של csjekrvu:  Project Settings → API Keys → צור **secret key**
--      (`sb_secret_…`). זהו המפתח היחיד שאסור שיופיע בקוד הלקוח.
--   2. ב-Vercel, בפרויקט `chizukim2-more30`:
--        vercel env add SUPABASE_SECRET_KEY production
--   3. `server/routes.ts` — להחליף את `SUPABASE_KEY` הקבוע ב-
--      `process.env.SUPABASE_SECRET_KEY`. הוא כבר משמש שם בכל קריאות השרת,
--      ולכן זו שורה אחת.
--   4. להוסיף `PATCH /api/recordings/:id` שמאמת ואז כותב, ולהחליף את
--      `updateRecording` בצד הלקוח כך שיקרא לו.
--
-- שלב 2 דורש את המפתח מ-(1), ולכן הוא ממתין לך. **שלב 1 לא ממתין לכלום.**
