-- more30 · 39-maatefet — public-schema API surface + close a real anon PII gap
-- ============================================================================
-- Discovered while wiring the first real UI: this project's PostgREST only
-- exposes schemas `public, graphql_public, nadlan, chatzor` (verified live via
-- `Accept-Profile: maatefet` -> PGRST106 "Invalid schema: maatefet"). Every
-- table/RPC 0108+0109 built in the bare `maatefet` schema is therefore
-- unreachable from any browser today, exactly like #34-kesef's schema before
-- it (see NEEDS_USER.md §3). The Data API "exposed schemas" list was also
-- updated additively via the Management API (public,graphql_public,nadlan,
-- chatzor,kesef,maatefet — every existing entry preserved, none dropped) and
-- a `NOTIFY pgrst, 'reload config'` was sent, but PostgREST's live process did
-- not pick it up without a project restart (same as kesef) — restarting would
-- interrupt 32-nadlan-berega/16-chatzor-connect traffic for zero benefit today,
-- so, same call as the kesef round, restart is deliberately NOT forced. The
-- config is saved and will take effect on the project's next natural restart.
--
-- Not waiting on that restart: this migration follows the exact convention
-- 36-nadlan-pro already proved out (public.np_*) — thin wrapper functions
-- defined in `public` (already exposed, live right now) that call through to
-- the real `maatefet` tables/functions. Once the schema-exposure config does
-- take effect, these wrappers keep working unchanged (defense in depth, not
-- a thing to unwind).
--
-- Second, independent finding while writing the anon "peek an invite by code"
-- wrapper: 0108's `invites_anon_lookup_by_code` RLS policy only restricts
-- *which rows* are visible to anon (status='pending' and not expired) — it
-- does not require the query to filter by code. Row Level Security cannot
-- express "only if you supplied the exact code"; that was always going to
-- require an application-layer chokepoint. Left as a bare grant, any anon
-- caller could have run `select * from maatefet.invites` and enumerated every
-- pending couple's name/phone/email with no code at all — inert only because
-- the schema was unreachable. Fixed here at the root: the anon grant + policy
-- are removed entirely, and the only anon path is a SECURITY DEFINER RPC that
-- takes one exact code, returns four non-sensitive display fields, and never
-- lists.

-- ---------- close the anon enumeration gap ----------
drop policy if exists invites_anon_lookup_by_code on maatefet.invites;
revoke select on maatefet.invites from anon;

create or replace function public.maatefet_invite_peek(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = maatefet, public
as $$
  select jsonb_build_object(
    'couple_name', i.couple_name,
    'segment', i.segment::text,
    'instructor_name', ins.full_name,
    'expires_at', i.expires_at
  )
  from maatefet.invites i
  join maatefet.instructors ins on ins.id = i.instructor_id
  where i.code = p_code
    and i.status = 'pending'
    and i.expires_at > now()
  limit 1
$$;

revoke all on function public.maatefet_invite_peek(text) from public;
grant execute on function public.maatefet_invite_peek(text) to anon, authenticated;

-- ---------- my own state (instructor row and/or client row, if any) ----------
create or replace function public.maatefet_me()
returns jsonb
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select jsonb_build_object(
    'instructor', (select to_jsonb(i) from maatefet.instructors i where i.auth_user_id = auth.uid()),
    'client', (select to_jsonb(c) from maatefet.clients c where c.auth_user_id = auth.uid()),
    'is_super_admin', public.more30_is_super_admin()
  )
$$;

revoke all on function public.maatefet_me() from public;
grant execute on function public.maatefet_me() to authenticated;

-- ---------- instructor signup (creates the 'pending' row; RLS still gates it) ----------
create or replace function public.maatefet_instructor_signup(
  p_full_name text,
  p_segment text,
  p_phone text default null,
  p_email text default null
)
returns maatefet.instructors
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_row maatefet.instructors;
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'full name is required';
  end if;
  if p_segment not in ('chatan', 'kallah') then
    raise exception 'segment must be chatan or kallah';
  end if;

  insert into maatefet.instructors (auth_user_id, full_name, segment, phone, email)
  values (auth.uid(), btrim(p_full_name), p_segment::maatefet.segment, p_phone, p_email)
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'this account already has an instructor profile';
end;
$$;

revoke all on function public.maatefet_instructor_signup(text, text, text, text) from public;
grant execute on function public.maatefet_instructor_signup(text, text, text, text) to authenticated;

-- ---------- invites: list (own, or all for a super-admin) + create ----------
create or replace function public.maatefet_invites_list()
returns setof maatefet.invites
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.invites order by created_at desc
$$;

revoke all on function public.maatefet_invites_list() from public;
grant execute on function public.maatefet_invites_list() to authenticated;

create or replace function public.maatefet_invite_create(
  p_couple_name text default null,
  p_phone text default null,
  p_email text default null
)
returns maatefet.invites
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_segment maatefet.segment;
  v_row maatefet.invites;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can create an invite';
  end if;

  select segment into v_segment from maatefet.instructors where id = v_instructor_id;

  insert into maatefet.invites (instructor_id, segment, couple_name, phone, email)
  values (v_instructor_id, v_segment, p_couple_name, p_phone, p_email)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.maatefet_invite_create(text, text, text) from public;
grant execute on function public.maatefet_invite_create(text, text, text) to authenticated;

create or replace function public.maatefet_invite_revoke(p_id uuid)
returns maatefet.invites
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.invites
  set status = 'revoked'
  where id = p_id and status = 'pending'
  returning *
$$;

revoke all on function public.maatefet_invite_revoke(uuid) from public;
grant execute on function public.maatefet_invite_revoke(uuid) to authenticated;

-- ---------- redeem an invite (client join) — thin pass-through to 0109 ----------
create or replace function public.maatefet_redeem_invite(
  p_code text,
  p_full_name text default null,
  p_partner_name text default null,
  p_phone text default null,
  p_email text default null
)
returns maatefet.clients
language sql
security invoker
set search_path = maatefet, public
as $$
  select maatefet.redeem_invite(p_code, p_full_name, p_partner_name, p_phone, p_email)
$$;

revoke all on function public.maatefet_redeem_invite(text, text, text, text, text) from public;
grant execute on function public.maatefet_redeem_invite(text, text, text, text, text) to authenticated;

-- ---------- clients: the first real CRM screen ----------
create or replace function public.maatefet_clients_list()
returns setof maatefet.clients
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.clients order by created_at desc
$$;

revoke all on function public.maatefet_clients_list() from public;
grant execute on function public.maatefet_clients_list() to authenticated;

create or replace function public.maatefet_client_update(
  p_id uuid,
  p_partner_name text default null,
  p_phone text default null,
  p_email text default null,
  p_wedding_date date default null,
  p_notes text default null
)
returns maatefet.clients
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.clients
  set partner_name = coalesce(p_partner_name, partner_name),
      phone = coalesce(p_phone, phone),
      email = coalesce(p_email, email),
      wedding_date = coalesce(p_wedding_date, wedding_date),
      notes = coalesce(p_notes, notes)
  where id = p_id
  returning *
$$;

revoke all on function public.maatefet_client_update(uuid, text, text, text, date, text) from public;
grant execute on function public.maatefet_client_update(uuid, text, text, text, date, text) to authenticated;

-- ---------- content library (module: "סטודיו תוכן ומיתוג אישי", minimal) ----------
create or replace function public.maatefet_content_list()
returns setof maatefet.content_items
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.content_items order by created_at desc
$$;

revoke all on function public.maatefet_content_list() from public;
grant execute on function public.maatefet_content_list() to authenticated;

create or replace function public.maatefet_content_save(
  p_id uuid default null,
  p_title text default null,
  p_body text default null,
  p_content_type text default 'note',
  p_is_shared boolean default false
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

  if p_id is null then
    insert into maatefet.content_items (instructor_id, segment, title, body, content_type, is_shared)
    select v_instructor_id, i.segment, btrim(p_title), p_body, coalesce(p_content_type, 'note'), coalesce(p_is_shared, false)
    from maatefet.instructors i where i.id = v_instructor_id
    returning * into v_row;
  else
    update maatefet.content_items
    set title = btrim(p_title), body = p_body,
        content_type = coalesce(p_content_type, content_type),
        is_shared = coalesce(p_is_shared, is_shared)
    where id = p_id and instructor_id = v_instructor_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_content_save(uuid, text, text, text, boolean) from public;
grant execute on function public.maatefet_content_save(uuid, text, text, text, boolean) to authenticated;

-- ---------- super-admin panel: list instructors + verify/suspend ----------
create or replace function public.maatefet_admin_instructors_list()
returns setof maatefet.instructors
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.instructors
  order by (status = 'pending') desc, created_at desc
$$;

revoke all on function public.maatefet_admin_instructors_list() from public;
grant execute on function public.maatefet_admin_instructors_list() to authenticated;

create or replace function public.maatefet_verify_instructor(p_instructor_id uuid, p_approve boolean)
returns maatefet.instructors
language sql
security invoker
set search_path = maatefet, public
as $$
  select maatefet.verify_instructor(p_instructor_id, p_approve)
$$;

revoke all on function public.maatefet_verify_instructor(uuid, boolean) from public;
grant execute on function public.maatefet_verify_instructor(uuid, boolean) to authenticated;

-- ---------- registry note ----------
update core.projects
set note = 'שלב 0: סכימת maatefet חיה + RLS מדורג + invite-only (instructors/invites/clients/content_items). '
  || '[20/08/2026 סבב 4] נבנה ה-UI האמיתי הראשון (/maatefet: index/instructor/join/admin) ונחשף API ציבורי — '
  || 'התגלה שסכימת maatefet (כמו kesef לפני כן) לא הייתה ברשימת ה-exposed schemas של ה-Data API, כך שה-RPCs '
  || 'מסבב 3 לא היו נגישים משום דפדפן. הוספתי maatefet ל-exposed schemas דרך ה-Management API (איחוד עם הרשימה '
  || 'הקיימת, שום ערך לא נמחק) אך לא הפעלתי מחדש את הפרויקט (אותה החלטה כמו kesef — יחול ברסטארט הטבעי הבא). '
  || 'במקום לחכות לזה, נבנתה שכבת public.maatefet_* (עטיפות דקות סביב maatefet.*, כמו np_* ב-36) שעובדת כבר עכשיו. '
  || 'תוך כדי כך נמצא ותוקן פער אבטחה אמיתי: מדיניות ה-RLS לאנון על invites הייתה מאפשרת מיצוי (enumeration) של '
  || 'כל ההזמנות הממתינות (שם/טלפון/אימייל של הזוג) בלי לדעת קוד כלל — הוסרה לגמרי, הוחלפה ב-RPC יחיד '
  || '(maatefet_invite_peek) שמחזיר 4 שדות תצוגה בלבד לפי קוד מדויק. ה-UI: הרשמת מדריך/ה → ממתין לאימות → '
  || 'פאנל סופר-אדמין לאימות → יצירת הזמנה → מימוש הזמנה ע"י הלקוח/ה → מסך CRM (רשימת לקוחות + עריכת פרטים) → '
  || 'ספריית תוכן בסיסית. נותר לשלב 0: 2FA (Auth MFA), הצפנת-שדה לתוכן רגיש — עדיין עבודת שכבת-אפליקציה עתידית, '
  || 'מתועדות ב-MAATEFET_BUILD.md, לא הומצאו כאן.'
where number = '39';
