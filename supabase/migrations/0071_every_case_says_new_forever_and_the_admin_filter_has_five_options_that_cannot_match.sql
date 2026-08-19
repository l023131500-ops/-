-- 0071 — כל פנייה אומרת «חדשה» לנצח, ולמסנן הסטטוס יש חמישה ערכים שאף שורה
-- לא יכולה לשאת (§5ב)
--
-- מה היה: bkalot_clone.cases.status נולד 'new' (ברירת מחדל של הטבלה) ואין
-- ולו נתיב אחד בכל השכפול שכותב לתוכו ערך אחר. נמדד ולא הונח: אפס טריגרים
-- בסכמה bkalot_clone כולה, ואף אחת מפונקציות השכבה — intake, render, queue,
-- dispatch — אינה מעדכנת את השדה. כלומר פנייה שנקלטה אתמול, הופק לה מסמך,
-- הוכנסה לתור ועובדה בהצלחה — נראית במסך הניהול בדיוק כמו פנייה שנכנסה
-- לפני שנייה ואיש לא נגע בה.
--
-- למה זה תקלה של מוצר ולא הערה על סכמה: admin.html כבר מציג את הערך הזה
-- בשלושה מקומות — תג בכל שורה ברשימה, שדה «סטטוס» במסך הפנייה, ומסנן
-- שמציע את חמשת הערכים ש-cases_status_known מתיר (חדשה / בטיפול / נשלחה /
-- נסגרה / נדחתה). ארבעה מהחמישה אינם יכולים להחזיר ולו שורה אחת, והחמישי
-- מחזיר את הכול. מסך הניהול נבנה סביב שדה שאיש אינו כותב אליו.
--
-- מה נבנה כאן: טריגר AFTER INSERT על bkalot_clone.documents שמעביר את
-- הפנייה מ-'new' ל-'in_progress'. אין כאן פונקציה חדשה שמישהו קורא לה, אין
-- נתיב HTTP חדש ואין שינוי בקוד הלקוח.
--
-- חמש הכרעות:
--
-- (1) טריגר, ולא שורת UPDATE בתוך bkalot_clone_render. המעבר הוא תכונה של
--     הנתון — «לפנייה הזו יש מסמך» — ולא של מסלול קריאה אחד. render אינו
--     הכותב היחיד שאי־פעם יהיה לטבלה הזו (0063 בנתה את נתיב הכתיבה הראשון,
--     ויבוא/הפקה מצד הניהול יהיו הבאים), וכל כותב עתידי היה צריך לזכור.
--     שכחה כזו אין לה סימפטום: המסך ממשיך להציג «חדשה» ושום דבר לא נכשל.
--
-- (2) המסמך הוא נקודת המעבר, ולא הכניסה לתור. documents.queue_id הוא ה-FK,
--     כלומר המסמך תמיד קודם לשורת התור — ופנייה שהופק לה מסמך ולא הוכנסה
--     לתור (המצב C שנמדד בכל פעימה מאז 0067) היא בטיפול בדיוק כמו זו שכן.
--
-- (3) 'in_progress' ולא 'sent', וזו אותה הכרעה בדיוק כמו (5) של 0070: שום
--     דבר לא נשלח. 'sent' יישאר בלתי־ניתן־להשגה כל עוד אין בשכפול מסלול
--     שליחה אמיתי, וזה נכון — הערך הזה אמור להיות שקר שאי אפשר לכתוב, לא
--     ערך שממתין למישהו שיכתוב אותו בטעות.
--
-- (4) הפרדיקט הוא status='new' בלבד. 'closed' ו-'rejected' הן הכרעות של
--     אדם, ו-render עושה upsert על (case_id, kind) — אבל הפקה חוזרת של
--     מסמך שכבר קיים היא UPDATE ולא INSERT, ולכן אינה מפעילה את הטריגר
--     כלל. הפרדיקט הוא השכבה השנייה: גם אם ייווצר יום אחד מסמך שני מסוג
--     אחר לאותה פנייה, הוא לא יחזיר פנייה סגורה למצב פתוח.
--
-- (5) app_key='bkalot-clone' בפרדיקט. bkalot_clone.cases היא טבלה של
--     השכפול בלבד והבדיקה אינה יכולה לסנן ולו שורה אחת היום — היא כתובה
--     כדי שה-UPDATE יאמר של מי השורה שהוא נוגע בה, אותה עמדה בדיוק שממנה
--     נכתב (1) של 0070 על התור המשותף.
--
-- updated_at נכתב כאן בפעם הראשונה בחייה של הטבלה: אין עליה טריגר
-- updated_at, ולכן בכל שורה קיימת הוא שווה ל-created_at. נמדד ולא הונח:
-- bkalot_clone_admin_cases ממיינת ב-`order by c.created_at desc, c.id desc`
-- ולא ב-updated_at, ולכן סדר הרשימה במסך אינו זז בגלל השינוי הזה.
--
-- אינו נוגע במערכת החיה: אין כאן bkalot_auto, אין outbound_queue ואין
-- delivery_log. אין נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873
-- ולא בסכמות csj/csj_src/igud.

create or replace function bkalot_clone.case_advance_on_document()
returns trigger
language plpgsql
security definer
set search_path = bkalot_clone, pg_temp
as $$
begin
  update bkalot_clone.cases
     set status = 'in_progress',
         updated_at = now()
   where id = new.case_id
     and app_key = 'bkalot-clone'
     and status = 'new';
  return null;
end;
$$;

comment on function bkalot_clone.case_advance_on_document() is
  'פנייה שהופק לה מסמך אינה «חדשה». new → in_progress בלבד; החלטות אדם (closed/rejected) אינן נדרסות, ו-sent אינו נכתב כאן כי שום דבר לא נשלח (0071).';

drop trigger if exists documents_advance_case on bkalot_clone.documents;

create trigger documents_advance_case
  after insert on bkalot_clone.documents
  for each row
  execute function bkalot_clone.case_advance_on_document();

-- מילוי לאחור. נמדד לפני ההרצה: bkalot_clone.cases=0 ו-documents=0, ולכן
-- כאן הוא נוגע באפס שורות. הוא כתוב בכל זאת משום שמיגרציה היא גם התיאור
-- של המצב שהיא מבטיחה, ולא רק של השינוי שהיא עושה: אחריה אין במסד פנייה
-- שיש לה מסמך ועדיין כתוב עליה «חדשה».
update bkalot_clone.cases c
   set status = 'in_progress',
       updated_at = now()
 where c.app_key = 'bkalot-clone'
   and c.status = 'new'
   and exists (select 1 from bkalot_clone.documents d where d.case_id = c.id);
