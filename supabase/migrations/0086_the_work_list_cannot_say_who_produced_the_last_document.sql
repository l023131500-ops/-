-- 0086 — שכפול בקלות שכבה 3
-- רשימת העבודה אינה יודעת לומר מי הפיק את המסמך האחרון של הפנייה.
--
-- מי כתב את הקו הזה: a6e8844, בסופה, מילה במילה: «bkalot_clone_admin_cases —
-- רשימת העבודה — עדיין אינה יודעת על produced_by, ולכן מנהל שסורק את הרשימה
-- בלי לפתוח פנייה עדיין אינו רואה מי הפיק; זו הלבנה הבאה». לפניו כתבו אותו
-- 0085 בסופה ו-7d7dcf2 בסופה. כאן נלקח bkalot_clone_admin_cases ורק הוא.
--
-- מה היה: 0083 בנתה את העמודה, v8 (f1c2a18) העבירה את הזהות בשער, 0084 החזירה
-- אותה במסך המסמך, 042e60f ציירה, 7d7dcf2 פרסה, 0085 החזירה אותה בשורת המסמך
-- שבמסך הפנייה, 3da9647 ציירה ו-a6e8844 פרסה. שמונה לבנים, ובכל זאת: המסך שבו
-- מנהל מתחיל את היום — רשימת העבודה — שותק. כדי לדעת אם על פנייה כבר יצא מסמך
-- ומי כתב אותו, הוא נדרש לפתוח כל פנייה בנפרד. documents_count שכבר בשורה אומר
-- «יש מסמך» ולא «של מי», וזה בדיוק ההבדל בין רשימה שאפשר לסרוק לרשימה שאפשר
-- רק לספור.
--
-- מה נבנה כאן: שני שדות בכל שורת פנייה — last_produced_by ו-last_produced_by_name
-- — על המסמך האחרון של אותה פנייה. אין שינוי סכמה, אין כתיבה, אין נגיעה
-- ב-render, ב-set_status, ב-admin_case, ב-admin_document, ב-edge ולא ב-apps/37.
-- תוספת קריאה בלבד.
--
-- חמש הכרעות:
--
-- (1) השם הוא last_produced_by ולא produced_by, ובמכוון. הכלל של 0078 הכרעה (2)
--     — «אותם שמות בדיוק כמו במסך הפנייה, כדי ששני המסכים יאמרו את אותה עובדה
--     מאותם שדות» — נשמר כאן דווקא בכך שהוא נשבר: במסך הפנייה produced_by הוא
--     שדה של שורת מסמך ומדבר על המסמך שבשורה, וכאן השורה היא פנייה שיכולה
--     להחזיק יותר ממסמך אחד. אותו שם על שתי עובדות שונות היה הופך «מי הפיק את
--     המסמך הזה» ל«מי הפיק משהו כאן» בלי ששום קורא ירגיש.
--
-- (2) המסמך האחרון נבחר בסדר מלא — created_at desc, id desc — ולא ב-created_at
--     לבדו. created_at אינו ייחודי: שתי קריאות render באותה עסקה מקבלות את אותו
--     now() בדיוק, וזו הכרעה (3) של 0082 מילה במילה. בלי שובר שוויון limit 1 היה
--     רשאי להחזיר בכל קריאה מסמך אחר מבין שניים — כלומר שם מפיק שמתחלף מרענון
--     לרענון, בלי שגיאה ובלי שדה שנראה שגוי.
--
-- (3) LEFT JOIN LATERAL אחד, ולא שתי תת-שאילתות סקלריות. שתיים — אחת ל-produced_by
--     ואחת ל-full_name — היו שתי כתיבות של אותו סדר, וזו בדיוק התקלה ש-0082
--     הכרעה (1) נבנתה כדי למנוע: שינוי בסדר של אחת ולא של השנייה היה נותן זהות
--     ממסמך אחד ושם ממסמך אחר, כלומר מנהל שמעולם לא נגע בפנייה מיוחס לה בשמו.
--     שורה אחת מה-lateral פירושה ששני השדות מגיעים מאותו מסמך מעצם הבנייה.
--
-- (4) שני ה-null אינם מפוענחים בשדה נגזר שלישי, ואינם צריכים להיות: פנייה בלי
--     מסמך כלל ופנייה שמסמכה הופק בצורת v7 מחזירות שתיהן null/null, ו-
--     documents_count — שכבר יושב בשורה מיום שנבנתה — מפריד ביניהן (0 מול 1+).
--     זו הכרעה (4) של 0084 ו-0085 בלי סטייה, ומאותו טעם: שדה נגזר הוא שם חדש
--     למה שכבר ביד הלקוח. אין כאן last_produced_at: אין ב-documents עמודה כזו,
--     ו-created_at של המסמך אינו נמסר בשורת הרשימה גם היום.
--
-- (5) לא נוסף מפתח קלט. אין סינון «מה שאני הפקתי», אין מיון לפי מפיק, ואין שינוי
--     ב-status/kind/q/decided/sort. שאילתת ה-count זהה בייט-בייט, השערים זהים,
--     סדר הרשימה זהה — הפעימה ניתנת לביטול בלי לגעת בדבר.
--
-- נמדד ולא הונח: bkalot_clone.documents נושאת documents_case_kind_uniq על
-- (case_id, kind), והאילוץ documents_kind_known מתיר שלושה סוגים —
-- email, pdf, audio. כלומר הטבלה מתירה שלושה מסמכים לפנייה כבר היום, ורק שתי
-- התבניות החיות (general_inquiry_reply, rights_treatment_reply, שתיהן
-- channels={email}) הן שגורמות לכך שדרך המוצר עצמו יש לפנייה לכל היותר מסמך
-- אחד — ולכן «האחרון» נראה היום כמו «היחיד». ההכרעות (2) ו-(3) אינן מיותרות
-- מפני כך: הן נמדדו בזריעת מסמך pdf מאוחר בשנייה ומסמך audio באותה חותמת
-- בדיוק, שני מצבים שהסכמה מתירה בלי שינוי אחד.
--
-- ההרשאות אינן ניתנות מחדש בכוונה: create or replace שומר ACL, והפונקציה היא
-- SECURITY DEFINER — grant execute ל-anon כאן היה חושף את כל פניות האנשים
-- האמיתיים לכל מחזיק מפתח anon. הבסיס שנמדד לפני: anon=false,
-- authenticated=false, service_role=true.
--
-- 🚫 מצב טסט: פונקציית קריאה בלבד — אין בה UPDATE, אין INSERT, אין נגיעה
--    ב-outbound_queue, ב-delivery_log ולא בשום ערוץ שליחה, ולא יוצאת ממנה ולו
--    הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

create or replace function public.bkalot_clone_admin_cases(p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit    int  := 50;
  v_offset   int  := 0;
  v_status   text;
  v_kind     text;
  v_q        text;
  v_decided  text;
  v_sort     text;
  v_total    bigint;
  v_rows     jsonb;
  c_statuses text[] := array['new','in_progress','sent','closed','rejected'];
  c_kinds    text[] := array['info','reminder','treatment'];
  c_decided  text[] := array['yes','no'];
  c_sorts    text[] := array['created_at','decided_at'];
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    p := '{}'::jsonb;
  end if;

  if (p->>'limit') ~ '^[0-9]+$' then
    v_limit := least(greatest((p->>'limit')::int, 1), 200);
  end if;
  if (p->>'offset') ~ '^[0-9]+$' then
    v_offset := (p->>'offset')::int;
  end if;

  v_status  := nullif(p->>'status', '');
  v_kind    := nullif(p->>'kind', '');
  v_q       := nullif(btrim(coalesce(p->>'q', '')), '');
  -- ראה הכרעות (2) ו-(3) של 0081: ריק = בלי סינון, וכל ערך אחר נופל במפורש למטה.
  v_decided := nullif(p->>'decided', '');
  -- ראה הכרעה (4) של 0082: ריק = סדר ברירת המחדל, וכל ערך שאינו מוכר נופל במפורש.
  v_sort    := nullif(p->>'sort', '');

  if v_status is not null and not (v_status = any(c_statuses)) then
    return jsonb_build_object('ok', false, 'error', 'status_unknown',
                              'allowed', to_jsonb(c_statuses));
  end if;
  if v_kind is not null and not (v_kind = any(c_kinds)) then
    return jsonb_build_object('ok', false, 'error', 'kind_unknown',
                              'allowed', to_jsonb(c_kinds));
  end if;
  if v_decided is not null and not (v_decided = any(c_decided)) then
    return jsonb_build_object('ok', false, 'error', 'decided_unknown',
                              'allowed', to_jsonb(c_decided));
  end if;
  if v_sort is not null and not (v_sort = any(c_sorts)) then
    return jsonb_build_object('ok', false, 'error', 'sort_unknown',
                              'allowed', to_jsonb(c_sorts));
  end if;

  -- ראה הכרעה (5): שאילתת ה-count לא נגעה. «מי הפיק» אינו סינון — הוא מתווסף
  -- לשורה שכבר נמנתה, ואינו רשאי לשנות את הקבוצה הנמנית ולו בשורה אחת.
  select count(*) into v_total
    from bkalot_clone.cases c
    left join bkalot_auto.contacts ct on ct.id = c.contact_id
   where (v_status is null or c.status = v_status)
     and (v_kind   is null or c.kind   = v_kind)
     and (v_decided is null
          or (v_decided = 'no'  and c.decided_at is null)
          or (v_decided = 'yes' and c.decided_at is not null))
     and (v_q is null
          or c.id::text = v_q
          or ct.full_name ilike '%' || v_q || '%'
          or ct.phone     ilike '%' || v_q || '%'
          or ct.email     ilike '%' || v_q || '%');

  -- ראה הכרעות (1), (2) ו-(3) של 0082: ord_at הוא מפתח המיון עצמו, ולכן חיתוך
  -- העמוד (ה-order by הפנימי) ומסירתו (ה-order by שבתוך jsonb_agg) קוראים מאותו
  -- ביטוי אחד ואינם יכולים להיפרד.
  select coalesce(jsonb_agg(s.j order by s.ord_at desc nulls last, s.ord_id desc),
                  '[]'::jsonb)
    into v_rows
    from (
      select case when v_sort = 'decided_at' then c.decided_at
                  else c.created_at end as ord_at,
             c.id                       as ord_id,
             jsonb_build_object(
               'id',         c.id,
               'created_at', c.created_at,
               'kind',       c.kind,
               'status',     c.status,
               'source',     c.source,
               'situation',  c.situation,
               'topic_no',   c.topic_no,
               'note',       c.note,
               -- ראה הכרעות (1), (2) ו-(4) של 0078: אותם שלושה שמות כמו ב-0077,
               -- כדי ששורה ברשימה ומסך הפנייה יאמרו את אותה עובדה מאותם שדות.
               -- שם ריק כשהזהות מלאה פירושו שהחשבון שהכריע אינו קיים עוד.
               'decided_by',      c.decided_by,
               'decided_at',      c.decided_at,
               'decided_by_name', au.full_name,
               'contact',    case when ct.id is null then null
                                  else jsonb_build_object(
                                         'id',        ct.id,
                                         'full_name', ct.full_name,
                                         'phone',     ct.phone,
                                         'email',     ct.email,
                                         'consent',   ct.consent) end,
               'rights_count',    (select count(*) from bkalot_clone.case_rights r
                                    where r.case_id = c.id),
               'chosen_count',    (select count(*) from bkalot_clone.case_rights r
                                    where r.case_id = c.id and r.chosen),
               'documents_count', (select count(*) from bkalot_clone.documents d
                                    where d.case_id = c.id),
               -- ראה הכרעות (1)–(4): last_ ולא produced_by סתם — השורה היא פנייה
               -- ולא מסמך, ושני השדות מדברים על המסמך האחרון שלה. pau ולא au:
               -- au הוא מי שהכריע על הפנייה, וזה אדם אחר. שם ריק כשהזהות מלאה
               -- פירושו שהחשבון שהפיק אינו קיים עוד; שניהם null פירושו או שאין
               -- מסמך כלל או הפקה בלי זהות בשער (מצב v7), ו-documents_count
               -- שלמעלה מפריד בין השניים.
               'last_produced_by',      ld.produced_by,
               'last_produced_by_name', pau.full_name) as j
        from bkalot_clone.cases c
        left join bkalot_auto.contacts ct on ct.id = c.contact_id
        left join bkalot_clone.admin_users au on au.id = c.decided_by
        -- ראה הכרעות (2) ו-(3): שורה אחת בסדר מלא, ומשם שני השדות — ולא שתי
        -- תת-שאילתות שהיו רשאיות להצביע על שני מסמכים שונים.
        left join lateral (
          select d.produced_by
            from bkalot_clone.documents d
           where d.case_id = c.id
           order by d.created_at desc, d.id desc
           limit 1
        ) ld on true
        left join bkalot_clone.admin_users pau on pau.id = ld.produced_by
       where (v_status is null or c.status = v_status)
         and (v_kind   is null or c.kind   = v_kind)
         and (v_decided is null
              or (v_decided = 'no'  and c.decided_at is null)
              or (v_decided = 'yes' and c.decided_at is not null))
         and (v_q is null
              or c.id::text = v_q
              or ct.full_name ilike '%' || v_q || '%'
              or ct.phone     ilike '%' || v_q || '%'
              or ct.email     ilike '%' || v_q || '%')
       order by case when v_sort = 'decided_at' then c.decided_at
                     else c.created_at end desc nulls last,
                c.id desc
       limit v_limit offset v_offset
    ) s;

  return jsonb_build_object(
    'ok',     true,
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset,
    'cases',  v_rows);
end;
$function$;

-- מה שאין כאן ואינו נשכח, ומוצהר כדי שלא ייקרא כהשלמה: אין מי שמציג את שני
-- השדות — apps/37-bkalot-clone/admin.html מצייר את שורת הרשימה בלי «הופק על
-- ידי»; זו הלבנה הבאה (UI), ואחריה פריסת פורטל, אותו פיצול כמו
-- 0085 → 3da9647 → a6e8844. אין סינון ואין מיון לפי מפיק (הכרעה 5). אין
-- היסטוריית מפיקים: הפקה חוזרת דורסת גוף ומפיק יחד (הכרעה 5 של 0083), ולכן גם
-- השורה אומרת את ההפקה האחרונה בלבד. אין last_produced_at (הכרעה 4).
