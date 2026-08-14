-- 0070 — השורה נכנסה לתור ולא היה מי שמעבד אותה (#234 סעיף 2)
--
-- מה היה: 0067 בנתה את bkalot_clone_queue, ו-0068/0069 הכריעו מאיפה נלקחת
-- כתובת היעד. השורה נכנסת ל-bkalot_auto.outbound_queue עם max_attempts=0
-- ונשארת שם לנצח: המעבד של המקור (bkalot_auto.queue_process_dryrun) סורק
-- attempts < max_attempts ולכן לעולם אינו רואה אותה — וזה מכוון (0067
-- הכרעה 2), כי אותו מעבד בונה תוכן מחדש מ-topic_id ושורת שכפול נושאת
-- topic_id=null. כלומר לשכפול אין ולו מעבד אחד, ו«בתור» הוא הבטחה שאיש
-- אינו עומד מאחוריה. זה בדיוק מה ש-0069 ניסח במסך: «בתור — טרם נשלח».
--
-- מה נבנה כאן: public.bkalot_clone_dispatch(jsonb) — המעבד של השכפול,
-- שורה אחת בקריאה. הוא אינו שולח. אין בו net.http, אין pg_net, אין Resend
-- ואין קריאה יוצאת אחת. שליחה אמיתית תדרוש מיגרציה, לא פרמטר.
--
-- שבע הכרעות, וכל אחת נגזרת ממה שכבר נמדד ולא מהעתקה של המקור:
--
-- (1) app_key='bkalot-clone' הוא תנאי כניסה ולא הערה. הפונקציה מקבלת
--     queue_id, ו-outbound_queue משותפת לשכפול ולמקור. בלי הבדיקה הזו
--     מזהה שגוי במסך ניהול של השכפול היה מעדכן שורה של המערכת החיה.
--     ההגנה היא בפרדיקט ולא באמון בקורא.
--
-- (2) mode='test' נבדק על השורה ואינו ארגומנט. אין בפונקציה ולו נתיב אחד
--     שמקבל mode מבחוץ — אותה הכרעה כמו ב-0067, ומאותה סיבה: שכפול של
--     כלל בטיחות במקום שני הוא מקום שיכול להסתעף בשקט, וההסתעפות הזו היא
--     מייל שיוצא לאדם אמיתי.
--
-- (3) רשימת יעדי הבדיקה נבדקת שוב ברגע העיבוד, בדיוק כמו במקור. השורה
--     נכנסה לתור בעבר והרשימה יכלה להשתנות מאז. אישור בזמן ההכנסה אינו
--     אישור בזמן השליחה.
--
-- (4) התוכן נקרא מהשורה ואינו נבנה מחדש — וזה ההבדל המהותי מהמעבד של
--     המקור. הגוף שהמנהל אישר במסך הוא הגוף שמעובד. build_content(topic_id)
--     על topic_id=null הייתה מסמנת את השורה failed, ובניית תוכן מחדש
--     ברגע העיבוד היא בדיוק סוג הפער שאין לו סימפטום.
--
-- (5) המצב הסופי הוא 'skipped' ולא 'sent'. שום דבר לא נשלח, ו'sent' הוא
--     שקר שנשמר במסד. sent_at נשאר null בכוונה: אפס שורות עם sent_at הוא
--     המדידה שכל פעימה כאן מריצה כדי להוכיח שמצב טסט נשמר, וכתיבה לתוכו
--     הייתה הורסת את המדד עצמו. dry_run_at הוא השדה שנכתב.
--
-- (6) עיבוד שני של אותה שורה אינו כותב שורת delivery_log שנייה. שתי
--     לחיצות במסך ניהול הן לחיצה אחת בעיני יומן המסירה — אחרת היומן סופר
--     ניסיונות של המשתמש ולא אירועי מסירה. אותה הכרעה כמו already_queued
--     ב-0067.
--
-- (7) attempts עולה גם במסלול החסום וגם במסלול שעבר, בנוסח של המקור.
--     max_attempts=0 נשאר 0 — השורה אינה חוזרת לשום סריקה אוטומטית.

create or replace function public.bkalot_clone_dispatch(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, bkalot_clone, bkalot_auto, pg_temp
as $$
declare
  v_raw       text;
  v_queue_id  bigint;
  v_q         bkalot_auto.outbound_queue%rowtype;
  v_doc       bkalot_clone.documents%rowtype;
  v_allowed   boolean;
  v_bytes     integer;
  v_body_matches boolean;
begin
  -- ── הקלט: אותה בדיקה בדיוק כמו 0064/0067 ────────────────────────────────
  v_raw := nullif(btrim(coalesce(p->>'queue_id', p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'queue_id_required');
  end if;
  -- ספרות בלבד עדיין יכולות לחרוג מ-bigint (0064 הכרעה 3).
  if length(v_raw) > 18 then
    return jsonb_build_object('ok', false, 'error', 'queue_row_not_found', 'id', v_raw);
  end if;
  v_queue_id := v_raw::bigint;

  select * into v_q from bkalot_auto.outbound_queue q where q.id = v_queue_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'queue_row_not_found', 'id', v_queue_id);
  end if;

  -- ── שומר 1: השורה היא של השכפול ולא של המערכת החיה (הכרעה 1) ────────────
  if v_q.app_key is distinct from 'bkalot-clone' then
    return jsonb_build_object('ok', false, 'error', 'not_a_clone_row',
                              'queue_id', v_queue_id, 'app_key', v_q.app_key,
                              'message', 'השורה אינה של השכפול. המעבד הזה אינו נוגע בשורות של מערכת אחרת.');
  end if;

  -- ── שומר 2: מצב טסט בלבד (הכרעה 2) ──────────────────────────────────────
  if v_q.mode is distinct from 'test' then
    return jsonb_build_object('ok', false, 'error', 'live_not_supported',
                              'queue_id', v_queue_id, 'mode', v_q.mode,
                              'message', 'אין בשכפול מסלול שליחה אמיתי. שורה שאינה במצב בדיקה אינה מעובדת.');
  end if;

  -- ── שומר 3: רק שורה שממתינה. חסומה, שנכשלה או שעובדה כבר — לא ──────────
  if v_q.status is distinct from 'queued' then
    return jsonb_build_object('ok', false, 'error', 'not_queued',
                              'queue_id', v_queue_id,
                              'status', v_q.status,
                              'status_detail', v_q.status_detail,
                              'dry_run_at', v_q.dry_run_at,
                              'already_processed', (v_q.dry_run_at is not null),
                              'message', case
                                when v_q.dry_run_at is not null
                                  then 'השורה כבר עובדה. לא נכתבה שורת יומן שנייה.'
                                when v_q.status = 'blocked'
                                  then 'השורה חסומה ולא תעובד.'
                                else 'השורה אינה ממתינה בתור.' end);
  end if;

  -- ── שומר 4: היעד ברשימת הבדיקה ברגע העיבוד, לא רק בזמן ההכנסה (הכרעה 3) ─
  select exists (
    select 1 from bkalot_auto.test_targets tt
     where tt.value = v_q.to_address
       and tt.kind = case when v_q.channel = 'email' then 'email' else 'phone' end
  ) into v_allowed;

  if not v_allowed then
    update bkalot_auto.outbound_queue
       set status        = 'blocked',
           attempts      = attempts + 1,
           status_detail = 'היעד הוסר מרשימת הבדיקה לפני העיבוד.'
     where id = v_queue_id;

    insert into bkalot_auto.delivery_log
      (queue_id, app_key, channel, to_address, mode, outcome, detail)
    values
      (v_queue_id, v_q.app_key, v_q.channel, v_q.to_address, v_q.mode, 'blocked',
       'היעד אינו יעד בדיקה בזמן העיבוד');

    return jsonb_build_object('ok', false, 'error', 'target_not_allowed',
                              'queue_id', v_queue_id,
                              'status', 'blocked',
                              'to_address', v_q.to_address,
                              'message', 'היעד אינו ברשימת יעדי הבדיקה ברגע העיבוד. לא נשלח דבר.');
  end if;

  -- ── התוכן נקרא מהשורה ואינו נבנה מחדש (הכרעה 4) ─────────────────────────
  if nullif(btrim(coalesce(v_q.body, '')), '') is null then
    update bkalot_auto.outbound_queue
       set status        = 'failed',
           attempts      = attempts + 1,
           status_detail = 'הגוף בשורת התור ריק. אין מה לשלוח.'
     where id = v_queue_id;

    insert into bkalot_auto.delivery_log
      (queue_id, app_key, channel, to_address, mode, outcome, detail)
    values
      (v_queue_id, v_q.app_key, v_q.channel, v_q.to_address, v_q.mode, 'failed',
       'גוף ריק בשורת התור');

    return jsonb_build_object('ok', false, 'error', 'queue_body_empty',
                              'queue_id', v_queue_id, 'status', 'failed');
  end if;

  v_bytes := octet_length(v_q.body);

  -- המסמך שממנו נולדה השורה. render עושה upsert על (case_id, kind), ולכן
  -- הפקה חוזרת אחרי ההכנסה לתור משאירה את השורה עם הגוף הישן. זה נמדד
  -- ומדווח ואינו חוסם: מה שהמנהל אישר הוא מה שמעובד (הכרעה 4), אבל ההפרש
  -- לא נשאר שקט.
  select * into v_doc from bkalot_clone.documents d where d.queue_id = v_queue_id limit 1;
  v_body_matches := case
    when not found then null
    else (coalesce(v_doc.body_html, v_doc.body_text) is not distinct from v_q.body)
  end;

  -- ── הצלחה: התוכן אומת, היעד מאושר, שום דבר לא נשלח (הכרעה 5) ────────────
  update bkalot_auto.outbound_queue
     set status        = 'skipped',
         attempts      = attempts + 1,
         dry_run_at    = now(),
         content_bytes = v_bytes,
         status_detail = 'עובד במצב בדיקה: התוכן אומת והיעד מאושר. לא נשלח — שליחה אמיתית טעונה אישור.',
         response      = jsonb_build_object(
                           'subject',       v_q.subject,
                           'content_bytes', v_bytes,
                           'document_id',   v_doc.id,
                           'processor',     'bkalot_clone_dispatch')
   where id = v_queue_id;

  insert into bkalot_auto.delivery_log
    (queue_id, app_key, channel, to_address, mode, outcome, detail)
  values
    (v_queue_id, v_q.app_key, v_q.channel, v_q.to_address, v_q.mode, 'dry_run',
     'תוכן אומת (' || v_bytes || ' בתים), לא נשלח');

  return jsonb_build_object(
    'ok',             true,
    'sent_for_real',  0,               -- תמיד. אין כאן מסלול שליחה.
    'queue_id',       v_queue_id,
    'document_id',    v_doc.id,
    'status',         'skipped',
    'mode',           'test',
    'channel',        v_q.channel,
    'to_address',     v_q.to_address,
    'subject',        v_q.subject,
    'content_bytes',  v_bytes,
    'body_matches_document', v_body_matches,
    'outcome',        'dry_run',
    'message',        'עובד במצב בדיקה. התוכן אומת והיעד מאושר. לא נשלחה שום הודעה.');
end;
$$;

-- פונקציה חדשה ב-public מקבלת EXECUTE ל-PUBLIC כברירת מחדל, ומפתח ה-anon
-- גלוי בטופס הציבורי מאז #223. נכתב במפורש ונמדד אחרי.
revoke all on function public.bkalot_clone_dispatch(jsonb) from public;
revoke all on function public.bkalot_clone_dispatch(jsonb) from anon;
revoke all on function public.bkalot_clone_dispatch(jsonb) from authenticated;
grant execute on function public.bkalot_clone_dispatch(jsonb) to service_role;

comment on function public.bkalot_clone_dispatch(jsonb) is
  'מעבד שורת תור של השכפול במצב בדיקה: מאמת יעד ותוכן, מסמן skipped וכותב delivery_log. אינו שולח דבר. #234 סעיף 2.';
