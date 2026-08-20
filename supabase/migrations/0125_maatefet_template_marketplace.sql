-- more30 · 39-maatefet — stage 4 continues: moderated template marketplace
-- (module 15 per its own scaffolding comment; the "תוספות מתקדמות" backlog
-- item "מרקטפלייס תבניות מבוקר").
-- ============================================================================
-- 0108's own comment already named this destination when content_items was
-- first built: "module 15 (marketplace) reads other instructors' shared
-- items only — scaffolding for later, harmless while no UI calls it." 0117
-- turned that scaffolding into a real, segment-scoped "shared content" feed
-- (maatefet_content_shared_list) but left two things it explicitly deferred:
-- a dedicated surface for content_type='reminder_template' (the one type
-- this backlog line is actually about, distinct from the general content
-- library that already ships) and any moderation lever at all — today a
-- shared item stays visible until its own author unshares it, with no way
-- for the platform to step in on something inappropriate. This migration
-- closes both, additive-only over 0117.
--
-- Copy-not-link, deliberately: maatefet_template_copy() inserts a new row
-- owned by the caller rather than referencing the source. A reminder
-- template is meant to be edited into the copying instructor's own
-- voice/wording (the whole point of "use this template" over "subscribe to
-- this template"), and a live reference would mean the original author's
-- later edits — or an admin unsharing/deleting it — silently rewrite
-- content another instructor already sent to a couple.

-- ---------- browse: reminder templates shared within my own segment ----------
create or replace function public.maatefet_template_marketplace_list()
returns table (
  id uuid,
  title text,
  body text,
  media_url text,
  created_at timestamptz,
  author_name text
)
language sql
stable
security definer
set search_path = maatefet, public
as $$
  select ci.id, ci.title, ci.body, ci.media_url, ci.created_at, ins.full_name
  from maatefet.content_items ci
  join maatefet.instructors ins on ins.id = ci.instructor_id
  where ci.is_shared = true
    and ci.content_type = 'reminder_template'
    and ci.instructor_id <> maatefet.my_instructor_id()
    and ci.segment = maatefet.my_segment()
    and maatefet.is_verified_instructor()
  order by ci.created_at desc
$$;

revoke all on function public.maatefet_template_marketplace_list() from public;
grant execute on function public.maatefet_template_marketplace_list() to authenticated;
revoke execute on function public.maatefet_template_marketplace_list() from anon;

-- ---------- fork a shared template into the caller's own library ----------
create or replace function public.maatefet_template_copy(p_content_id uuid)
returns maatefet.content_items
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_segment maatefet.segment;
  v_source maatefet.content_items;
  v_row maatefet.content_items;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can copy a template';
  end if;
  select segment into v_segment from maatefet.instructors where id = v_instructor_id;

  select * into v_source from maatefet.content_items
  where id = p_content_id
    and is_shared = true
    and content_type = 'reminder_template'
    and segment = v_segment;
  if not found then
    raise exception 'template not found, not shared, or not in your segment';
  end if;

  insert into maatefet.content_items (instructor_id, segment, title, body, content_type, is_shared, media_url)
  values (v_instructor_id, v_segment, v_source.title || ' (עותק)', v_source.body, 'reminder_template', false, v_source.media_url)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.maatefet_template_copy(uuid) from public;
grant execute on function public.maatefet_template_copy(uuid) to authenticated;
revoke execute on function public.maatefet_template_copy(uuid) from anon;

-- ---------- moderation: super-admin sees every shared item, across segments ----------
-- security invoker on purpose, same choice as maatefet_admin_analytics /
-- maatefet_directory_admin_list: content_instructor_all's own USING clause
-- already ORs in more30_is_super_admin() (and instructors_self_read does the
-- same for the joined author name), so RLS alone grants this read; the
-- explicit check below is defense-in-depth, not a substitute for it.
create or replace function public.maatefet_content_admin_shared_list()
returns table (
  id uuid,
  title text,
  content_type text,
  media_url text,
  segment text,
  created_at timestamptz,
  author_name text
)
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select ci.id, ci.title, ci.content_type, ci.media_url, ci.segment::text, ci.created_at, ins.full_name
  from maatefet.content_items ci
  join maatefet.instructors ins on ins.id = ci.instructor_id
  where ci.is_shared = true
    and public.more30_is_super_admin()
  order by ci.created_at desc
$$;

revoke all on function public.maatefet_content_admin_shared_list() from public;
grant execute on function public.maatefet_content_admin_shared_list() to authenticated;
revoke execute on function public.maatefet_content_admin_shared_list() from anon;

-- ---------- moderation: pull one item out of the marketplace ----------
-- Unshares, does not delete: the instructor who shared it keeps the item in
-- their own library (is_shared flips to false, same state as if they had
-- unshared it themselves) — moderation removes something from the community
-- feed, it does not destroy the author's work.
create or replace function public.maatefet_content_admin_unshare(p_content_id uuid)
returns maatefet.content_items
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_row maatefet.content_items;
begin
  if not public.more30_is_super_admin() then
    raise exception 'only a super-admin can moderate shared content';
  end if;

  update maatefet.content_items
  set is_shared = false
  where id = p_content_id
  returning * into v_row;

  if not found then
    raise exception 'content item not found';
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_content_admin_unshare(uuid) from public;
grant execute on function public.maatefet_content_admin_unshare(uuid) to authenticated;
revoke execute on function public.maatefet_content_admin_unshare(uuid) from anon;

-- ---------- registry note ----------
update core.projects
set note = note || E'\n\n[20/08/2026 Loop C סבב 18] תוספת מ"תוספות מתקדמות": מרקטפלייס תבניות מבוקר — מודול 15 '
  || 'לפי הערת-הסקאפולד של 0108 עצמה ("module 15 (marketplace) reads other instructors'' shared items only — '
  || 'scaffolding for later"). הפער שנשאר אחרי 0117 (עדכן את פיד "תוכן משותף" הכללי): (א) אין מסך ייעודי '
  || 'ל-reminder_template דווקא (הסוג שה"מרקטפלייס" בכתובים מתכוון אליו), (ב) שום מנגנון-בקרה — פריט משותף '
  || 'נשאר גלוי עד שהמדריך/ה עצמו/ה יבטל/ת שיתוף, בלי יכולת התערבות של הפלטפורמה. maatefet_template_marketplace_list '
  || '(SECURITY DEFINER, אותו דפוס בדיוק כמו maatefet_content_shared_list) מציג תבניות-תזכורת משותפות בתוך-מגזר '
  || 'בלבד. maatefet_template_copy מבצע "שכפול" ולא "קישור חי": מעתיק שורה חדשה לספריית המדריך/ה שלו/ה '
  || '(is_shared=false כברירת מחדל) כדי שעריכה עתידית של המקור — או ביטול-שיתוף/מחיקה — לא תשנה בשקט תוכן '
  || 'שכבר נשלח לזוג. בקרה: maatefet_content_admin_shared_list (SECURITY INVOKER, נשען על ה-OR הקיים לסופר-אדמין '
  || 'בתוך content_instructor_all/instructors_self_read — לא נדרשה הרשאת-על חדשה) מציג לסופר-אדמין את כל הפריטים '
  || 'המשותפים חוצי-מגזרים; maatefet_content_admin_unshare מסיר פריט מהמרקטפלייס (is_shared=false) בלי למחוק '
  || 'את התוכן של המדריך/ה. UI: instructor.html קיבל תת-מקטע "מרקטפלייס תבניות תזכורת" (טאב תוכן) עם כפתור '
  || '"השתמש בתבנית זו"; admin.html קיבל כרטיס "ניהול תוכן משותף" עם כפתור "הסר משיתוף" לכל פריט.'
where number = '39';
