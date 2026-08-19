-- 0067 — bkalot_clone שכבה 3, לבנת השליחה הראשונה: כניסה לתור (§5ב)
--
-- מה היה: 0063 מפיקה מסמך, 0064 קוראת את גופו בחזרה, ו-0066 סגרה את הנוסח.
-- documents.queue_id קיים מאז 0057 ו-0064 הגדיר אותו במפורש כ«ההבדל בין מסמך
-- שהופק למסמך שנשלח — queue_id null הוא טרם נשלח, ושכבת השליחה תמלא אותו»
-- (0064 הכרעה 5). שכבת השליחה לא נבנתה, ולכן העמודה נשארה null בכל מסמך שהופק
-- אי פעם, ואין ולו נתיב אחד שיכול למלא אותה. זו הפונקציה החסרה.
--
-- הצעד הזה מכניס לתור ואינו שולח. אין בו מייל, אין webhook ואין קריאה יוצאת
-- אחת. מה שהוא קונה הוא שהמסמך מפסיק להיות קובץ שיושב במסד ומקבל שורה עם נמען,
-- ערוץ, מצב ותאריך — כלומר רשומת כוונה שאפשר לבקר אותה לפני שיש מי ששולח.
--
-- ההכרעות:
--
-- (1) התור הוא bkalot_auto.outbound_queue הקיים ולא טבלה חדשה בסכמת השכפול.
--     BKALOT_CLONE_BUILD אומר «מנוע השליחה יכול לשבת על bkalot_auto שכבר קיים
--     — הרחב אותו, אל תמחק», ושתי סיבות מדודות מחזקות: רשימת ההיתר
--     bkalot_auto.test_targets היא מנגנון הבטיחות היחיד שכבר קיים ונבדק, ו-
--     bkalot_clone.documents.queue_id הוא כבר FK אל הטבלה הזו (0057). טבלה
--     שנייה הייתה מחייבת רשימת היתר שנייה — כלומר שני מקומות שבהם אפשר לטעות
--     ולשלוח לאדם אמיתי.
--
-- (2) הבידוד ממנוע המקור נעשה בנתון ולא בשינוי קוד שלו. bkalot_auto.queue_due
--     ו-queue_process_dryrun סורקות לפי status='queued' and mode='test' and
--     scheduled_at<=now() and attempts<max_attempts — בלי סינון app_key.
--     כלומר שורה של השכפול עם max_attempts ברירת-מחדל (3) הייתה נשאבת למעבד
--     של המקור, ושם build_content(topic_id) הייתה רצה על topic_id=null ומסמנת
--     אותה failed — המעבד של המקור בונה תוכן מחדש מנושא ואינו קורא את הגוף
--     ששמור בשורה. השכפול נכנס לכן עם max_attempts=0, וזה בדיוק מה שהמשפט
--     הזה אומר: אין ולו ניסיון אוטומטי אחד המותר על השורה הזו. שום פונקציה של
--     המקור לא נגעה, ומנוע המקור ממשיך לראות בדיוק את מה שראה קודם.
--     כשייבנה שולח לשכפול — הוא יסרוק לפי app_key='bkalot-clone' ויקבע
--     max_attempts בעצמו.
--
-- (3) mode='test' קשיח בקוד, ואין ארגומנט שמאפשר live. זה החוזר של המקור
--     (queue_enqueue_internal פותחת בזריקת 42501 על live), וכאן הוא חזק יותר:
--     אין ערך קלט שמגיע ל-mode בכלל, ולכן אין גם את הזריקה. שליחה אמיתית
--     תדרוש מיגרציה, לא פרמטר.
--
-- (4) שלושת השומרים של המקור נשמרים כלשונם, כי הם השיטה ולא קישוט:
--     הסכמה (consent) — נמען שלא נתן הסכמה אינו נכנס לתור כלל ולא נכתבת שורה;
--     כתובת — אין כתובת לערוץ, אין שורה;
--     רשימת ההיתר — יעד שאינו ב-test_targets נכנס כ-'blocked' עם בדיוק הנוסח
--     של המקור («היעד אינו ברשימת יעדי הבדיקה. לא יישלח.»), ולא נחסם בשקט.
--     ההבדל בין «לא נכתבה שורה» ל«נכתבה שורה חסומה» הוא הבדל מכוון: השני הוא
--     עקבה — «התכוונו לשלוח לכתובת הזו ולא שלחנו» — והוא מה שמאפשר לבקר בדיעבד
--     למי כמעט יצא מכתב.
--
-- (5) subject ו-body נלקחים מהמסמך שהופק ולא נבנים מחדש. זה ההבדל המהותי בין
--     השכפול למקור: במקור התוכן נבנה בזמן העיבוד מ-topics, וכאן הוא כבר קיים
--     ונקרא בעיני המנהל דרך «הצג» (0064). תור ששומר גוף אחר ממה שהמנהל אישר
--     הוא בדיוק סוג הפער שאין לו סימפטום. content_bytes נכתב כאן ולא בזמן
--     העיבוד, מאותה סיבה — התוכן ידוע עכשיו.
--
-- (6) אידמפוטנטי לפי documents.queue_id. לחיצה שנייה על אותו מסמך מחזירה את
--     שורת התור הקיימת עם already_queued=true ואינה יוצרת שנייה. בלי זה שתי
--     לחיצות היו שני מכתבים לאותו אדם, וזו הטעות שהכי קל לעשות במסך ניהול.
--
-- (7) 0064 מורחבת בשני שדות: queue_status ו-queue_mode. עד היום queue_id null
--     היה שקול ל«טרם נשלח» ו-non-null ל«נשלח», ומהיום non-null יכול להיות גם
--     שורה חסומה שלא תישלח לעולם. בלי השדות האלה מסך הניהול היה קורא «חסום»
--     כ«נשלח» — כלומר הרחבת הכתיבה כאן הייתה שוברת קריאה שכבר נמדדה. אותו
--     חסר, לכן אותו צעד.
--
-- 🚫 אין מסלול יוצא: אין net.http, אין pg_net, אין Resend ואין תור עבודה.
--    השורה נכנסת ל-outbound_queue ונשארת שם. אין מייל ואין הודעה שיצאו.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud. שום פונקציה של bkalot_auto לא שונתה — ראה הכרעה (2).

create or replace function public.bkalot_clone_queue(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_raw       text;
  v_doc_id    bigint;
  v_doc       bkalot_clone.documents%rowtype;
  v_case      bkalot_clone.cases%rowtype;
  v_contact   bkalot_auto.contacts%rowtype;
  v_channel   text;
  v_to        text;
  v_body      text;
  v_bytes     integer;
  v_allowed   boolean;
  v_status    text;
  v_detail    text;
  v_queue_id  bigint;
  v_existing  jsonb;
begin
  -- ── הקלט: אותה בדיקה בדיוק כמו 0064 ─────────────────────────────────────
  v_raw := nullif(btrim(coalesce(p->>'document_id', p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'document_id_required');
  end if;
  -- ספרות בלבד עדיין יכולות לחרוג מ-bigint (0064 הכרעה 3).
  if length(v_raw) > 18 then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_raw);
  end if;
  v_doc_id := v_raw::bigint;

  select * into v_doc from bkalot_clone.documents d where d.id = v_doc_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_doc_id);
  end if;

  -- ── כבר בתור: מחזירים את הקיימת, לא יוצרים שנייה (הכרעה 6) ──────────────
  if v_doc.queue_id is not null then
    select jsonb_build_object(
             'ok',            true,
             'already_queued', true,
             'queue_id',      q.id,
             'status',        q.status,
             'blocked',       (q.status = 'blocked'),
             'mode',          q.mode,
             'to_address',    q.to_address,
             'subject',       q.subject,
             'content_bytes', q.content_bytes,
             'message',       'המסמך כבר בתור. לא נוצרה שורה שנייה.')
      into v_existing
      from bkalot_auto.outbound_queue q
     where q.id = v_doc.queue_id;
    -- FK הוא ON DELETE SET NULL, ולכן queue_id שאין לו שורה אינו אמור לקרות;
    -- אם קרה — אומרים אותו ולא מתקנים בשקט.
    if v_existing is null then
      return jsonb_build_object('ok', false, 'error', 'queue_row_missing',
                                'queue_id', v_doc.queue_id, 'document_id', v_doc_id);
    end if;
    return v_existing;
  end if;

  -- ── הערוץ נגזר מסוג המסמך ──────────────────────────────────────────────
  -- pdf/audio קיימים ב-documents_kind_known ואין להם עדיין ערוץ בשכפול.
  if v_doc.kind <> 'email' then
    return jsonb_build_object('ok', false, 'error', 'channel_unsupported',
                              'document_kind', v_doc.kind);
  end if;
  v_channel := 'email';

  v_body := coalesce(nullif(btrim(coalesce(v_doc.body_html, '')), ''),
                     nullif(btrim(coalesce(v_doc.body_text, '')), ''));
  if v_body is null then
    return jsonb_build_object('ok', false, 'error', 'document_empty',
                              'document_id', v_doc_id);
  end if;
  -- הגוף שנכנס לתור הוא הגוף שהופק, כמות שהוא (הכרעה 5).
  v_body  := coalesce(v_doc.body_html, v_doc.body_text);
  v_bytes := octet_length(v_body);

  select * into v_case from bkalot_clone.cases c where c.id = v_doc.case_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'case_not_found',
                              'case_id', v_doc.case_id);
  end if;
  if v_case.contact_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_contact', 'case_id', v_case.id);
  end if;

  select * into v_contact from bkalot_auto.contacts ct where ct.id = v_case.contact_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_contact', 'case_id', v_case.id);
  end if;

  -- ── שומר 1: הסכמה. אין הסכמה — אין שורה (הכרעה 4) ───────────────────────
  if not v_contact.consent then
    return jsonb_build_object('ok', false, 'error', 'no_consent',
                              'case_id', v_case.id,
                              'message', 'הנמען לא נתן הסכמה. לא נכנס לתור.');
  end if;

  -- ── שומר 2: כתובת ───────────────────────────────────────────────────────
  v_to := nullif(btrim(coalesce(v_contact.email, '')), '');
  if v_to is null then
    return jsonb_build_object('ok', false, 'error', 'no_address',
                              'channel', v_channel,
                              'message', 'אין כתובת לערוץ הזה אצל הנמען.');
  end if;

  -- ── שומר 3: רשימת יעדי הבדיקה, בנוסח של המקור ───────────────────────────
  select exists (
    select 1 from bkalot_auto.test_targets tt
     where tt.value = v_to and tt.kind = 'email'
  ) into v_allowed;

  if v_allowed then
    v_status := 'queued';
    v_detail := null;
  else
    v_status := 'blocked';
    v_detail := 'היעד אינו ברשימת יעדי הבדיקה. לא יישלח.';
  end if;

  insert into bkalot_auto.outbound_queue
    (app_key, contact_id, topic_id, channel, to_address, subject, body,
     mode, status, status_detail, max_attempts, content_bytes)
  values
    ('bkalot-clone', v_contact.id, null, v_channel, v_to,
     v_doc.title, v_body,
     'test', v_status, v_detail,
     -- max_attempts=0: אין ניסיון אוטומטי מותר. זה מה שמוציא את השורה
     -- מהסריקה של מנוע המקור בלי לגעת בו (הכרעה 2).
     0, v_bytes)
  returning id into v_queue_id;

  update bkalot_clone.documents
     set queue_id = v_queue_id
   where id = v_doc_id;

  return jsonb_build_object(
    'ok',            true,
    'already_queued', false,
    'queue_id',      v_queue_id,
    'document_id',   v_doc_id,
    'case_id',       v_case.id,
    'status',        v_status,
    'blocked',       (v_status = 'blocked'),
    'mode',          'test',
    'channel',       v_channel,
    'to_address',    v_to,
    'subject',       v_doc.title,
    'content_bytes', v_bytes,
    'message', case when v_status = 'blocked'
                    then 'נרשם בתור כ-blocked: היעד אינו יעד בדיקה מאושר. לא יישלח.'
                    else 'נכנס לתור במצב בדיקה. אין שולח — לא נשלח דבר.' end);
end;
$fn$;

comment on function public.bkalot_clone_queue(jsonb) is
  'שכבה 3 של שכפול בקלות: מכניס מסמך שהופק לתור השליחה (bkalot_auto.outbound_queue) '
  'במצב טסט בלבד. אינו שולח — אין בו שום מסלול יוצא. השער יושב ב-bkalot-clone-admin.';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- פונקציה חדשה ב-public מקבלת EXECUTE ל-PUBLIC כברירת מחדל, ומפתח ה-anon יושב
-- גלוי בקוד המקור של הטופס הציבורי מאז #223. בלי ה-revoke הזה כל מחזיק מפתח
-- anon יכול היה להכניס מסמכים לתור — כלומר לכתוב לתוך מנגנון השליחה.
revoke all on function public.bkalot_clone_queue(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_queue(jsonb) to service_role;


-- ── 0064 מורחבת: queue_status + queue_mode (הכרעה 7) ─────────────────────────
-- הגוף זהה ל-0064 פרט ל-left join ולשני השדות. queued נשאר כפי שהיה — «יש שורת
-- תור» — ומה שנוסף הוא ההבחנה בין שורה שממתינה לשורה שחסומה.
create or replace function public.bkalot_clone_admin_document(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_raw text;
  v_id  bigint;
  v_out jsonb;
begin
  v_raw := nullif(btrim(coalesce(p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'document_id_required');
  end if;
  if length(v_raw) > 18 then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_raw);
  end if;
  v_id := v_raw::bigint;

  select jsonb_build_object(
           'id',           d.id,
           'case_id',      d.case_id,
           'kind',         d.kind,
           'title',        d.title,
           'body_html',    d.body_html,
           'body_text',    d.body_text,
           'html_chars',   coalesce(length(d.body_html), 0),
           'text_chars',   coalesce(length(d.body_text), 0),
           'storage_path', d.storage_path,
           'queue_id',     d.queue_id,
           'queued',       (d.queue_id is not null),
           'queue_status', q.status,
           'queue_mode',   q.mode,
           'created_at',   d.created_at)
    into v_out
    from bkalot_clone.documents d
    left join bkalot_auto.outbound_queue q on q.id = d.queue_id
   where d.id = v_id;

  if v_out is null then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_id);
  end if;

  return jsonb_build_object('ok', true, 'document', v_out);
end;
$fn$;

comment on function public.bkalot_clone_admin_document(jsonb) is
  'שכבה 3 של שכפול בקלות: גוף מסמך בודד (HTML+טקסט) לפי מזהה, כולל מצב שורת התור. '
  'קריאה בלבד, אין בה בדיקת זהות — service_role בלבד, השער יושב ב-bkalot-clone-admin.';

revoke all on function public.bkalot_clone_admin_document(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_admin_document(jsonb) to service_role;
