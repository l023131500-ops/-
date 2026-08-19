-- 0062 — bkalot_clone: זהות הניהול הראשונה (core.issues #225)
--
-- מה היה: #224 נסגר עם more30.com/bkalot-studio/admin חי ונמדד מדפדפן — מסך
-- כניסה עובד, שער עובד, רשימת פניות עובדת. ו-bkalot_clone.admin_users החזיקה
-- אפס שורות: משתמש הבדיקה נמחק בכוונה בסוף כל פעימה. כלומר כל ניסיון כניסה
-- החזיר invalid_credentials, וזה נראה בדיוק כמו סיסמה שגויה — מסך חי שאיש
-- אינו יכול להיכנס אליו, ואין ולו סימפטום אחד שמבחין בין השניים.
--
-- #225 רשם את זה כ«דורש הכרעת משתמש: איזה מייל, ואיך הסיסמה נמסרת». ההכרעה
-- כבר קיימת ולא נדרשה שוב — more30-priority.md §1ב קובע אותה לכל המערכות:
-- חשבון-על אחד (l023131500@gmail.com), וסיסמת פאנלים אחת מ-core.secrets
-- (STD_ADMIN_USER/STD_ADMIN_PASSWORD, scope=all). LOGINS.md כבר מחזיק את שתיהן.
--
-- שלוש הכרעות שנגזרות מהמדידה ולא מהעדפה:
--
-- (א) המייל הוא l023131500@gmail.com ולא STD_ADMIN_USER. הכניסה כאן ממופתחת
--     על מייל (0061), ו-bkalot_clone_admin_create דוחה כל מחרוזת שאינה מייל —
--     'admin' נופל על email_invalid. §1ב נותן בדיוק זהות אחת שהיא מייל, וזו.
--
-- (ב) הסיסמה נקראת חי מ-core.secrets ואינה מופיעה בקובץ הזה. מיגרציה יושבת
--     בגיט לנצח; סיסמה שנכתבת לתוכה נשארת בהיסטוריה גם אחרי שהוחלפה. מכאן גם
--     ה-raise: סוד חסר או קצר מ-10 עוצר את המיגרציה במקום ליצור מנהל עם סיסמה
--     ריקה — משתמש ניהול חלש הוא בדיוק סוג הכשל שנראה כמו הצלחה.
--
-- (ג) seed ולא insert חד-פעמי. §1ב מחייב במפורש upsert בכל עלייה (הדפוס
--     שנקבע לקיוסק), ויש לו סיבה מדודה כאן: 0061 נועל מנהל אחרי 5 כשלונות
--     ל-15 דקות. בלי מסלול איפוס, מי שנעל את עצמו ממתין — או שנפתחת מיגרציה
--     נוספת רק כדי לאפס מונה. הפונקציה מרעננת hash, מפעילה מחדש, ומאפסת
--     נעילה ומונה — ולכן קריאה אחת מחזירה את הכניסה למצב שב-core.secrets.
--
-- ה-revoke אינו פורמליות: פונקציית SECURITY DEFINER חדשה ב-public מקבלת
-- EXECUTE ל-PUBLIC כברירת מחדל, ומחזיק מפתח ה-anon — שיושב בקוד המקור של
-- הטופס הציבורי מאז #223 — היה יכול לאפס את סיסמת המנהל בקריאה אחת. אותה
-- מלכודת בדיוק שנמדדה ב-0058, 0060 ו-0061.
--
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud. אין DDL על שום טבלה קיימת. מצב טסט: אין נגיעה
--    ב-bkalot_auto.outbound_queue, אין שליחה ואין מייל.

create or replace function public.bkalot_clone_admin_seed()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := 'l023131500@gmail.com';   -- §1ב, חשבון-העל היחיד
  v_name  text := 'מנהל־על';
  v_pw    text;
  v_id    bigint;
  v_new   boolean;
begin
  select s.value into v_pw
  from core.secrets s
  where s.name = 'STD_ADMIN_PASSWORD' and s.is_active
  order by s.updated_at desc
  limit 1;

  -- עוצר, ולא יוצר מנהל שאפשר לנחש: ראה (ב) למעלה.
  if v_pw is null then
    raise exception 'STD_ADMIN_PASSWORD missing from core.secrets — refusing to seed an admin';
  end if;
  if length(v_pw) < 10 then
    raise exception 'STD_ADMIN_PASSWORD is shorter than 10 chars — refusing to seed an admin';
  end if;

  select u.id into v_id from bkalot_clone.admin_users u where u.email = v_email;
  v_new := v_id is null;

  if v_new then
    insert into bkalot_clone.admin_users (email, full_name, password_hash)
    values (v_email, v_name, extensions.crypt(v_pw, extensions.gen_salt('bf', 12)))
    returning id into v_id;
  else
    update bkalot_clone.admin_users u
       set password_hash   = extensions.crypt(v_pw, extensions.gen_salt('bf', 12)),
           is_active       = true,
           failed_attempts = 0,
           locked_until    = null
     where u.id = v_id;
  end if;

  -- הסיסמה עצמה אינה חוזרת בתשובה: היא כבר ב-core.secrets, ומי שקורא לפונקציה
  -- הזו מגיע משם ממילא. החזרתה כאן הייתה מייצרת עותק בהיר בכל לוג של קריאה.
  return jsonb_build_object(
    'ok', true,
    'created', v_new,
    'admin', jsonb_build_object('id', v_id, 'email', v_email, 'full_name', v_name),
    'password_source', 'core.secrets.STD_ADMIN_PASSWORD');
end;
$$;

comment on function public.bkalot_clone_admin_seed() is
  'bkalot_clone: יוצר/מרענן את זהות הניהול מ-core.secrets.STD_ADMIN_PASSWORD (#225). '
  'idempotent — מאפס גם נעילה ומונה כשלונות. service_role בלבד; ראה 0062.';

revoke all on function public.bkalot_clone_admin_seed() from public, anon, authenticated;
grant execute on function public.bkalot_clone_admin_seed() to service_role;

select public.bkalot_clone_admin_seed();
