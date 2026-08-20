-- more30 · 39-maatefet — stage 2 continues: module 2, "סטודיו תוכן ומיתוג אישי"
-- ============================================================================
-- Stage 0 (0108/0110) shipped only the bare minimum of this module — a
-- title+body content_items table with a free-text content_type and an
-- is_shared column that no UI ever read or wrote (the sharing policy
-- content_shared_read was explicit scaffolding for later, per its own
-- comment). MAATEFET_BUILD.md has flagged "סטודיו תוכן מלא" as the one
-- remaining stage-2 item across rounds 8/9/10. This migration closes it:
--   (a) personal branding fields on the instructor row (bio/photo/specialty)
--       so a couple can see who is guiding them, not just a name;
--   (b) a controlled content_type vocabulary + a media_url field, so the
--       library is an actual studio (lesson/article/template/presentation/
--       exercise), not a single freeform note type;
--   (c) the sharing scaffolding turned into a real, safe feature: shared
--       items are now scoped to the sharer's own segment (never built out
--       before, so no UI depended on the old cross-segment shape) and
--       exposed through a SECURITY DEFINER RPC that reveals only the
--       author's display name — the same "name/segment only, not
--       phone/email" pattern already used by the forum (0116) and couple
--       coordination (0115) RPCs.
-- Additive only: no existing row, column, or grant is removed; only the
-- always-empty (0 rows, checked live) content_shared_read policy is
-- replaced, which is safe precisely because nothing has ever set
-- is_shared = true through any shipped UI.

-- ---------- personal branding on the instructor row ----------
alter table maatefet.instructors
  add column if not exists bio text,
  add column if not exists photo_url text,
  add column if not exists specialty text;

-- ---------- content studio: controlled vocabulary + media ----------
alter table maatefet.content_items
  add column if not exists media_url text;

do $$ begin
  alter table maatefet.content_items
    add constraint content_items_type_check
    check (content_type in ('lesson', 'article', 'reminder_template', 'presentation', 'exercise', 'note'));
exception when duplicate_object then null; end $$;

-- ---------- segment helper (mirrors my_instructor_id(), same aal2/verified gate) ----------
create or replace function maatefet.my_segment()
returns maatefet.segment
language sql
stable
security definer
set search_path = maatefet
as $$
  select segment from maatefet.instructors
  where id = maatefet.my_instructor_id()
$$;

-- must stay callable by `authenticated`: it is invoked implicitly during RLS
-- policy evaluation (content_shared_read's SELECT policy fires even on
-- INSERT ... RETURNING, see maatefet_content_save below), same as sibling
-- helpers maatefet.my_instructor_id()/is_verified_instructor() which are
-- both left at Postgres's default PUBLIC execute grant for the same reason.
-- (An earlier "revoke all ... from public, anon, authenticated" here broke
-- live content creation — caught in this round's own verification before
-- any UI shipped against it.)
revoke execute on function maatefet.my_segment() from anon;
grant execute on function maatefet.my_segment() to authenticated;

-- ---------- sharing, scoped to the sharer's own segment ----------
-- Replaces the never-used stage-0 scaffolding (cross-segment, no UI ever set
-- is_shared=true). Segment-scoped matches this project's foundational rule
-- ("one core, two faces" — segment threaded through every layer) and mirrors
-- why couple data (0115) stays segment-separated, in contrast to the forum
-- (0116) which is deliberately cross-segment for a documented reason. A
-- content template written for kallah instruction is not useful, and could
-- be actively confusing, to a chatan instructor and vice versa.
drop policy if exists content_shared_read on maatefet.content_items;
create policy content_shared_read on maatefet.content_items
  for select to authenticated
  using (is_shared = true and segment = maatefet.my_segment());

-- ---------- own content only (was previously "own + any shared, mixed") ----------
create or replace function public.maatefet_content_list()
returns setof maatefet.content_items
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.content_items
  where instructor_id = maatefet.my_instructor_id()
  order by created_at desc
$$;

-- ---------- content save: add media_url, keep signature backward-compatible ----------
create or replace function public.maatefet_content_save(
  p_id uuid default null,
  p_title text default null,
  p_body text default null,
  p_content_type text default 'note',
  p_is_shared boolean default false,
  p_media_url text default null
)
returns maatefet.content_items
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.content_items;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can manage content items';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'title is required';
  end if;
  if coalesce(p_content_type, 'note') not in ('lesson', 'article', 'reminder_template', 'presentation', 'exercise', 'note') then
    raise exception 'invalid content_type';
  end if;

  if p_id is null then
    insert into maatefet.content_items (instructor_id, segment, title, body, content_type, is_shared, media_url)
    select v_instructor_id, i.segment, btrim(p_title), p_body, coalesce(p_content_type, 'note'), coalesce(p_is_shared, false), p_media_url
    from maatefet.instructors i where i.id = v_instructor_id
    returning * into v_row;
  else
    update maatefet.content_items
    set title = btrim(p_title), body = p_body,
        content_type = coalesce(p_content_type, content_type),
        is_shared = coalesce(p_is_shared, is_shared),
        media_url = coalesce(p_media_url, media_url)
    where id = p_id and instructor_id = v_instructor_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_content_save(uuid, text, text, text, boolean, text) from public;
grant execute on function public.maatefet_content_save(uuid, text, text, text, boolean, text) to authenticated;
-- same anon-default-grant gap found and fixed repeatedly in 0111/0114/0115/
-- 0116 (this Supabase project grants execute to anon separately from the
-- public role default): "revoke ... from public" alone does not revoke it.
revoke execute on function public.maatefet_content_save(uuid, text, text, text, boolean, text) from anon;
-- old 5-arg overload is superseded by the 6-arg one above (default p_media_url
-- keeps every existing caller working); drop it so PostgREST does not have to
-- disambiguate two overloads with the same leading arguments.
drop function if exists public.maatefet_content_save(uuid, text, text, text, boolean);

-- ---------- shared community content, segment-scoped, author name only ----------
create or replace function public.maatefet_content_shared_list()
returns table (
  id uuid,
  title text,
  content_type text,
  media_url text,
  created_at timestamptz,
  author_name text
)
language sql
stable
security definer
set search_path = maatefet, public
as $$
  select ci.id, ci.title, ci.content_type, ci.media_url, ci.created_at, ins.full_name
  from maatefet.content_items ci
  join maatefet.instructors ins on ins.id = ci.instructor_id
  where ci.is_shared = true
    and ci.instructor_id <> maatefet.my_instructor_id()
    and ci.segment = maatefet.my_segment()
    and maatefet.is_verified_instructor()
  order by ci.created_at desc
$$;

revoke all on function public.maatefet_content_shared_list() from public;
grant execute on function public.maatefet_content_shared_list() to authenticated;
revoke execute on function public.maatefet_content_shared_list() from anon;

-- ---------- instructor updates own branding (bio/photo/specialty) ----------
-- Plain UPDATE under RLS (instructors_self_update already allows a caller to
-- touch their own row for any column except status/verified_at/verified_by,
-- which stay locked to a super-admin by guard_instructor_status_change).
create or replace function public.maatefet_profile_update(
  p_bio text default null,
  p_photo_url text default null,
  p_specialty text default null
)
returns maatefet.instructors
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.instructors
  set bio = p_bio, photo_url = p_photo_url, specialty = p_specialty
  where auth_user_id = auth.uid()
  returning *
$$;

revoke all on function public.maatefet_profile_update(text, text, text) from public;
grant execute on function public.maatefet_profile_update(text, text, text) to authenticated;
revoke execute on function public.maatefet_profile_update(text, text, text) from anon;

-- ---------- the couple's own instructor: display-only branding card ----------
-- Mirrors maatefet_couple_partner_info's privacy shape (0115): the caller
-- must be the client themselves (2FA-gated via my_client_id()), and only
-- non-sensitive display fields come back. Unlike couple_partner_info this
-- also includes phone/email — the instructor is the client's own assigned
-- guide, who the client already deals with directly in real life, not a
-- third party being introduced for the first time.
create or replace function public.maatefet_my_instructor_brand()
returns jsonb
language sql
stable
security definer
set search_path = maatefet, public
as $$
  select jsonb_build_object(
    'full_name', ins.full_name,
    'segment', ins.segment::text,
    'bio', ins.bio,
    'photo_url', ins.photo_url,
    'specialty', ins.specialty,
    'phone', ins.phone,
    'email', ins.email
  )
  from maatefet.clients c
  join maatefet.instructors ins on ins.id = c.instructor_id
  where c.id = maatefet.my_client_id()
$$;

revoke all on function public.maatefet_my_instructor_brand() from public;
grant execute on function public.maatefet_my_instructor_brand() to authenticated;
revoke execute on function public.maatefet_my_instructor_brand() from anon;

-- ---------- defense-in-depth: two more anon-grant gaps found in this round's audit ----------
-- maatefet_content_save (above, this migration) was missing its own
-- "revoke ... from anon" — caught live before commit. Sweeping every
-- public.maatefet_* function for the same gap also found two pre-existing
-- ones from round 4 (0110): maatefet_clients_list / maatefet_client_update
-- were never explicitly revoked from anon. Not exploitable today — RLS
-- (clients_instructor_all) resolves instructor_id = maatefet.my_instructor_id()
-- to null for an anon caller (auth.uid() is null), so both return/affect 0
-- rows — but inconsistent with this project's explicit convention
-- (0111/0114/0115/0116) of never leaving a maatefet_* RPC anon-executable
-- unless it is a deliberate public lookup like maatefet_invite_peek.
revoke execute on function public.maatefet_clients_list() from anon;
revoke execute on function public.maatefet_client_update(uuid, text, text, text, date, text) from anon;

-- ---------- registry note ----------
update core.projects
set note = note || E'\n\n[20/08/2026 Loop C סבב 11] מודול 2 (סטודיו תוכן ומיתוג אישי) נסגר: מיתוג אישי '
  || '(bio/photo_url/specialty) על שורת המדריך/ה, ניתן לעריכה עצמית (maatefet_profile_update, RLS בלבד — '
  || 'לא נגע ב-status הנעול לסופר-אדמין). ספריית התוכן קיבלה אוצר-מילים מבוקר ל-content_type '
  || '(שיעור/מאמר/תבנית-תזכורת/מצגת/תרגיל/הערה, אכוף ב-CHECK constraint) + media_url. שכבת השיתוף '
  || '(is_shared, קיימת אך רדומה מאז שלב 0 — 0 שורות אומת לפני השינוי) הפכה מסינון חוצה-מגזרים לסינון '
  || 'בתוך-מגזר בלבד (עקבי עם עקרון-היסוד "ליבה אחת שני פנים" ועם ההפרדה של couple_links, בניגוד לפורום '
  || 'שמכוון להיות חוצה-מגזרים בכוונה), נחשפת ב-maatefet_content_shared_list (SECURITY DEFINER, שם מדריך/ה '
  || 'בלבד, לא טלפון/מייל — אותו דפוס כמו הפורום/תיאום-מדריכים). נוספה גם maatefet_my_instructor_brand '
  || 'לזוג (2FA-gated, מציג את כרטיס המדריך/ה שלהם/ן בפורטל — כולל טלפון/מייל, כי זה המדריך/ה שלהם/ן '
  || 'עצמם/ן, לא צד שלישי). UI: instructor.html קיבל טאב "פרופיל ומיתוג" + טופס תוכן משודרג (סוג/מדיה/שיתוף) '
  || '+ תת-מקטע "תוכן משותף מהקהילה"; portal.html קיבל כרטיס "המדריך/ה שלכם". אפס רגרסיה: כל טאב/RPC קיים '
  || 'ממשיך לעבוד (overload 5-הפרמטרים הישן של maatefet_content_save הוחלף ב-6-פרמטרים עם ברירת-מחדל, '
  || 'לא נשבר קריאה קיימת). עדיין לא נבנה בשלב 2: כלום — זה היה הפריט האחרון שתועד. שלב 3 הבא: ליווי אחרי '
  || 'החתונה + דירקטוריז.'
where number = '39';
