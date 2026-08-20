-- more30 · 39-maatefet — stage 2 begins: instructor↔instructor couple coordination
-- ============================================================================
-- MAATEFET_BUILD.md module 6 ("תיאום מדריך↔מדריכה") + roadmap stage 2 opener.
-- Stage 1 (couple portal + calendar/reminders/attendance) closed in 0114.
--
-- The gap: `maatefet.clients` already carries a free-text `partner_name`
-- (0108), but nothing connects the kallah's own client row (owned by her
-- instructor) to the chatan's own client row (owned by his, usually
-- different, instructor) as data — so the two instructors guiding the same
-- couple have no way to find each other inside the system at all, and every
-- module built on top of a real link (shared scheduling, after-wedding
-- follow-up handoff) has nothing to attach to. This migration adds exactly
-- that link, invite-code-shaped like everything else in this schema:
--
-- - `maatefet.clients` gets `link_code`/`link_code_expires_at` — an
--   instructor generates a short-lived code for one of their own clients
--   (RLS-scoped update, same as any other client edit) and shares it with
--   the other instructor out of band (phone/WhatsApp), exactly like an
--   invite code is shared with a couple today.
-- - `maatefet.couple_links` is the resulting one-row-per-couple bond
--   (`kallah_client_id` unique, `chatan_client_id` unique — a client can
--   only ever be linked once), guarded by a segment-check trigger
--   (`guard_couple_link_segments`, defense in depth — the redeem RPC below
--   already checks this, same "trigger backstops the RPC" shape as
--   `guard_client_belongs_to_instructor` in 0114) so a link can never end up
--   kallah-kallah or chatan-chatan even from a future bug or a direct
--   service-role write.
-- - Three new `public.maatefet_*` RPCs, same thin-wrapper convention as
--   0110/0114 (schema `maatefet` still not in the Data API's exposed-schemas
--   list): `_client_link_code_generate` (security invoker — RLS already
--   scopes it to the caller's own client, same as `maatefet_client_update`),
--   `_couple_link_redeem` (security definer — has to see across the
--   instructor boundary to find the partner's row by code, atomic against
--   double-redeem via the table's own unique constraints, same shape as
--   `maatefet.redeem_invite` from 0109), and `_couple_partner_info`
--   (security definer — read-only, returns the linked partner's basic
--   details *and their instructor's contact info* for coordination, nothing
--   more: no notes, no phone/email of the couple itself beyond what the
--   requesting side's own instructor already has). `_couple_link_remove`
--   lets either side's instructor undo a mistaken link. Every function gets
--   the explicit `revoke ... from anon` 0111/0114 already established this
--   project needs (`revoke all ... from public` alone does not cover it
--   here) — verified live below, not assumed.

-- ---------- clients: short-lived link code (mirrors invites.code) ----------
alter table maatefet.clients add column if not exists link_code text;
alter table maatefet.clients add column if not exists link_code_expires_at timestamptz;
create unique index if not exists idx_maatefet_clients_link_code
  on maatefet.clients(link_code) where link_code is not null;

-- ---------- couple_links: the kallah-client ↔ chatan-client bond ----------
create table maatefet.couple_links (
  id uuid primary key default gen_random_uuid(),
  kallah_client_id uuid not null references maatefet.clients(id) on delete cascade,
  chatan_client_id uuid not null references maatefet.clients(id) on delete cascade,
  linked_by_instructor_id uuid not null references maatefet.instructors(id),
  created_at timestamptz not null default now(),
  unique (kallah_client_id),
  unique (chatan_client_id)
);
create index idx_maatefet_couple_links_kallah on maatefet.couple_links(kallah_client_id);
create index idx_maatefet_couple_links_chatan on maatefet.couple_links(chatan_client_id);
alter table maatefet.couple_links enable row level security;
grant select on maatefet.couple_links to authenticated;
grant all on maatefet.couple_links to service_role;

-- select-only for authenticated: every mutation goes through the SECURITY
-- DEFINER RPCs below, never a raw insert/update/delete, so a redeem always
-- goes through the code-matching + segment + already-linked checks.
create policy couple_links_instructor_read on maatefet.couple_links
  for select to authenticated
  using (
    exists (
      select 1 from maatefet.clients c
      where c.id = kallah_client_id and c.instructor_id = maatefet.my_instructor_id()
    )
    or exists (
      select 1 from maatefet.clients c
      where c.id = chatan_client_id and c.instructor_id = maatefet.my_instructor_id()
    )
    or public.more30_is_super_admin()
  );

create or replace function maatefet.guard_couple_link_segments()
returns trigger
language plpgsql
security definer
set search_path = maatefet
as $$
declare
  v_kallah_segment maatefet.segment;
  v_chatan_segment maatefet.segment;
begin
  select segment into v_kallah_segment from maatefet.clients where id = new.kallah_client_id;
  select segment into v_chatan_segment from maatefet.clients where id = new.chatan_client_id;
  if v_kallah_segment is distinct from 'kallah' or v_chatan_segment is distinct from 'chatan' then
    raise exception 'couple_links.kallah_client_id must be a kallah-segment client and chatan_client_id a chatan-segment client';
  end if;
  return new;
end;
$$;

create trigger trg_maatefet_couple_links_guard_segments
  before insert or update on maatefet.couple_links
  for each row execute function maatefet.guard_couple_link_segments();

-- ============================================================================
-- public.maatefet_* wrappers
-- ============================================================================

create or replace function public.maatefet_client_link_code_generate(p_client_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.clients;
  v_code text;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can generate a coordination code';
  end if;

  if exists (
    select 1 from maatefet.couple_links
    where kallah_client_id = p_client_id or chatan_client_id = p_client_id
  ) then
    raise exception 'this client is already linked to a partner';
  end if;

  v_code := upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 10));

  update maatefet.clients
  set link_code = v_code, link_code_expires_at = now() + interval '14 days'
  where id = p_client_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'client not found';
  end if;

  return jsonb_build_object('code', v_row.link_code, 'expires_at', v_row.link_code_expires_at);
end;
$$;

revoke all on function public.maatefet_client_link_code_generate(uuid) from public;
revoke all on function public.maatefet_client_link_code_generate(uuid) from anon;
grant execute on function public.maatefet_client_link_code_generate(uuid) to authenticated;

create or replace function public.maatefet_couple_link_redeem(p_client_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_me maatefet.clients;
  v_partner maatefet.clients;
  v_kallah_id uuid;
  v_chatan_id uuid;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can link a couple';
  end if;

  select * into v_me from maatefet.clients where id = p_client_id and instructor_id = v_instructor_id;
  if v_me.id is null then
    raise exception 'client not found';
  end if;

  if exists (
    select 1 from maatefet.couple_links
    where kallah_client_id = v_me.id or chatan_client_id = v_me.id
  ) then
    raise exception 'this client is already linked to a partner';
  end if;

  select * into v_partner from maatefet.clients
    where link_code = upper(btrim(p_code)) and link_code_expires_at > now()
    for update;

  if v_partner.id is null then
    raise exception 'link code is invalid or expired';
  end if;

  if v_partner.id = v_me.id then
    raise exception 'cannot link a client to themselves';
  end if;

  if v_partner.segment = v_me.segment then
    raise exception 'a couple link requires one chatan-segment client and one kallah-segment client';
  end if;

  if exists (
    select 1 from maatefet.couple_links
    where kallah_client_id = v_partner.id or chatan_client_id = v_partner.id
  ) then
    raise exception 'the partner is already linked to someone else';
  end if;

  if v_me.segment = 'kallah' then
    v_kallah_id := v_me.id; v_chatan_id := v_partner.id;
  else
    v_kallah_id := v_partner.id; v_chatan_id := v_me.id;
  end if;

  begin
    insert into maatefet.couple_links (kallah_client_id, chatan_client_id, linked_by_instructor_id)
    values (v_kallah_id, v_chatan_id, v_instructor_id);
  exception when unique_violation then
    raise exception 'one of the two clients was just linked to another partner — try again';
  end;

  update maatefet.clients set link_code = null, link_code_expires_at = null
    where id in (v_me.id, v_partner.id);

  return jsonb_build_object(
    'linked', true,
    'partner_client_id', v_partner.id,
    'partner_full_name', v_partner.full_name
  );
end;
$$;

revoke all on function public.maatefet_couple_link_redeem(uuid, text) from public;
revoke all on function public.maatefet_couple_link_redeem(uuid, text) from anon;
grant execute on function public.maatefet_couple_link_redeem(uuid, text) to authenticated;

create or replace function public.maatefet_couple_partner_info(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_client maatefet.clients;
  v_link maatefet.couple_links;
  v_partner_id uuid;
  v_partner maatefet.clients;
  v_partner_instructor maatefet.instructors;
begin
  select * into v_client from maatefet.clients where id = p_client_id;
  if v_client.id is null then
    raise exception 'client not found';
  end if;

  -- coalesce every comparison to false: my_instructor_id()/my_client_id() are
  -- NULL for most callers (any instructor has no client row, any client who
  -- hasn't passed 2FA has no client id), and `false or null` is NULL, not
  -- false — `if not (null) then` never fires in plpgsql, silently skipping
  -- the raise below for exactly the unauthorized case this exists to block.
  -- Caught live in this round's own verification (an unrelated verified
  -- instructor successfully read another instructor's client coordination
  -- info before this fix), not shipped.
  if not (
    coalesce(v_client.instructor_id = maatefet.my_instructor_id(), false)
    or coalesce(v_client.id = maatefet.my_client_id(), false)
    or public.more30_is_super_admin()
  ) then
    raise exception 'not authorized to view this client''s coordination info';
  end if;

  select * into v_link from maatefet.couple_links
    where kallah_client_id = p_client_id or chatan_client_id = p_client_id;

  if v_link.id is null then
    return jsonb_build_object('linked', false);
  end if;

  v_partner_id := case when v_link.kallah_client_id = p_client_id
    then v_link.chatan_client_id else v_link.kallah_client_id end;
  select * into v_partner from maatefet.clients where id = v_partner_id;
  select * into v_partner_instructor from maatefet.instructors where id = v_partner.instructor_id;

  return jsonb_build_object(
    'linked', true,
    'linked_at', v_link.created_at,
    'partner_client', jsonb_build_object(
      'full_name', v_partner.full_name, 'segment', v_partner.segment, 'wedding_date', v_partner.wedding_date
    ),
    'partner_instructor', jsonb_build_object(
      'full_name', v_partner_instructor.full_name, 'segment', v_partner_instructor.segment,
      'phone', v_partner_instructor.phone, 'email', v_partner_instructor.email
    )
  );
end;
$$;

revoke all on function public.maatefet_couple_partner_info(uuid) from public;
revoke all on function public.maatefet_couple_partner_info(uuid) from anon;
grant execute on function public.maatefet_couple_partner_info(uuid) to authenticated;

create or replace function public.maatefet_couple_link_remove(p_client_id uuid)
returns boolean
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_deleted boolean;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can remove a couple link';
  end if;

  if not exists (select 1 from maatefet.clients where id = p_client_id and instructor_id = v_instructor_id) then
    raise exception 'client not found';
  end if;

  with deleted as (
    delete from maatefet.couple_links
    where kallah_client_id = p_client_id or chatan_client_id = p_client_id
    returning 1
  )
  select exists(select 1 from deleted) into v_deleted;

  return v_deleted;
end;
$$;

revoke all on function public.maatefet_couple_link_remove(uuid) from public;
revoke all on function public.maatefet_couple_link_remove(uuid) from anon;
grant execute on function public.maatefet_couple_link_remove(uuid) to authenticated;

-- ---------- registry note ----------
update core.projects
set stage = 'wip',
    note = 'שלב 0+1 סגורים (CRM + ספריית תוכן + פאנל סופר-אדמין + 2FA + הצפנת-שדה + פורטל זוג + יומן/תזכורות/אישורי הגעה). '
  || '[20/08/2026 סבב 8] שלב 2 התחיל: מודול 6 — תיאום מדריך↔מדריכה. עד כה לא הייתה שום דרך לחבר את שורת ה-client '
  || 'של הכלה (אצל המדריכה שלה) לשורת ה-client של החתן (אצל המדריך שלו, בדרך כלל אדם אחר לגמרי במערכת) — '
  || 'partner_name היה טקסט חופשי בלבד. נוסף maatefet.couple_links (kallah_client_id/chatan_client_id, שניהם unique — '
  || 'לקוח יכול להיות מקושר פעם אחת בלבד), מאובטח באותו דפוס קוד-הזמנה כמו invites: מדריך/ה מייצר/ת קוד זמני '
  || '(maatefet_client_link_code_generate, 14 יום תוקף) לזוג שלו/ה, משתף/ת עם המדריך/ה השני/ה מחוץ למערכת, שמזין/ה '
  || 'אותו (maatefet_couple_link_redeem — SECURITY DEFINER, אטומי מול מרוץ-כפילות דרך unique constraint + טיפול ב-exception, '
  || 'בודק מגזרים מנוגדים וחוסם קישור-עצמי). טריגר guard_couple_link_segments חוסם הגנת-עומק נגד קישור לא-תקין ברמת ה-DB '
  || 'גם אם ה-RPC יעקף. maatefet_couple_partner_info חושף למדריך/ה (או לזוג עצמו, 2FA-gated) רק את מה שנדרש לתיאום: '
  || 'שם/מגזר/תאריך-חתונה של הצד השני ופרטי-קשר של המדריך/ה השני/ה — לא הערות ליווי, לא טלפון/מייל של הזוג עצמו. '
  || 'maatefet_couple_link_remove מתקן קישור שגוי. כל 4 הפונקציות החדשות קיבלו revoke מ-anon מפורש (אותו תקדים 0111/0114). '
  || 'UI: instructor.html קיבל כפתור "תיאום מדריך/ה" לכל זוג בטבלת הלקוחות. עדיין לא נבנה: מיתוג נפרד למגזר חתנים, '
  || 'פורום מקצועי, סטודיו תוכן מלא — שאר שלב 2. מפרט מלא: MAATEFET_BUILD.md.'
where number = '39';
