-- more30 · 39-maatefet — couple-facing lesson sharing (אזור אישי: "צפייה
-- חוזרת בשיעורים" + "מסמכים" from the advanced-additions list, and the
-- couple-facing half of module 2 the spec's module 3 implies).
-- ============================================================================
-- The gap this closes: content sharing has existed since 0108/0117, but both
-- of its forms are instructor→instructor (is_shared + content_shared_read is
-- community sharing scoped to the sharer's segment; the 0125 marketplace is
-- a copy between instructors). A couple has never been able to see any
-- content item at all: content_shared_read calls maatefet.my_segment(),
-- which is instructor-only (that is exactly why 0119 had to add
-- my_effective_segment()), so for a couple session the policy is never true.
-- 0122 documented the visible symptom as a deliberate trade-off ("a couple
-- session reading a linked non-shared content_items row ... is correctly
-- filtered out") — right call there, because a curriculum link is not a
-- grant. This migration adds the grant: an explicit per-couple assignment
-- made by the couple's own instructor. The SECURITY DEFINER read below is
-- not the bypass 0122 declined to build — the assignment row *is* the
-- authorization, created intentionally, revocable, and scoped to one couple.
--
-- Reuses every proven pattern in this schema:
-- - Same (instructor_id, client_id) shape as appointments/reminders/
--   followups/wedding_tasks/study_items — reuses
--   guard_client_belongs_to_instructor() (0114) unchanged.
-- - New guard trigger (content item must belong to the assigning
--   instructor) follows guard_couple_link_segments (0115): defense in depth
--   at the DB level even if every RPC is bypassed.
-- - Couple read is a narrow SECURITY DEFINER function with an explicit
--   column list (never select *), same reasoning as
--   maatefet_followup_my_list (0118): the couple sees the lesson material,
--   not is_shared/segment bookkeeping.
-- - Guard trigger functions get an explicit revoke from anon/authenticated
--   (the round-9 finding: trigger functions had default EXECUTE).
-- - Every public.maatefet_* function: revoke from public AND from anon
--   (this project's anon default grant is separate), grant to authenticated
--   — verified live via has_function_privilege() after apply.

-- ---------- content_assignments (the per-couple grant) ----------
create table maatefet.content_assignments (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  client_id uuid not null references maatefet.clients(id) on delete cascade,
  content_item_id uuid not null references maatefet.content_items(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  -- one grant per (couple, item); the DB refuses the duplicate so two
  -- console tabs racing cannot create two rows the UI would then show twice.
  unique (client_id, content_item_id)
);
create index idx_maatefet_content_assignments_instructor on maatefet.content_assignments(instructor_id);
create index idx_maatefet_content_assignments_client on maatefet.content_assignments(client_id);
create index idx_maatefet_content_assignments_item on maatefet.content_assignments(content_item_id);
alter table maatefet.content_assignments enable row level security;
grant select, insert, update, delete on maatefet.content_assignments to authenticated;
grant all on maatefet.content_assignments to service_role;

comment on table maatefet.content_assignments is
  'Per-couple content grant: the instructor explicitly shares a content item '
  'with one of their own couples. The couple reads it via '
  'public.maatefet_content_couple_list() (SECURITY DEFINER, explicit columns) '
  '— the assignment row is the authorization.';

-- reuses the 0114 guard unchanged — same (instructor_id, client_id) shape.
create trigger trg_maatefet_content_assignments_guard_client
  before insert or update on maatefet.content_assignments
  for each row execute function maatefet.guard_client_belongs_to_instructor();

-- the assigned item must belong to the assigning instructor: an instructor
-- must not be able to grant their couple someone else's material (community-
-- shared or not) — sharing someone else's lesson onward is the author's
-- call, not the reader's. Enforced at the DB so no RPC can be talked around.
create or replace function maatefet.guard_assignment_content_owner()
returns trigger
language plpgsql
security definer
set search_path = maatefet
as $$
begin
  if not exists (
    select 1 from maatefet.content_items ci
    where ci.id = new.content_item_id and ci.instructor_id = new.instructor_id
  ) then
    raise exception 'content item does not belong to this instructor';
  end if;
  return new;
end;
$$;
-- round-9 convention: trigger functions carry no callable privilege.
revoke all on function maatefet.guard_assignment_content_owner() from public;
revoke all on function maatefet.guard_assignment_content_owner() from anon;
revoke all on function maatefet.guard_assignment_content_owner() from authenticated;

create trigger trg_maatefet_content_assignments_guard_owner
  before insert or update on maatefet.content_assignments
  for each row execute function maatefet.guard_assignment_content_owner();

create policy content_assignments_instructor_all on maatefet.content_assignments
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- the couple can see that a grant exists (read-only; the material itself
-- comes through the DEFINER function below, since content_items' own RLS
-- correctly blocks a couple from the raw row).
create policy content_assignments_client_read on maatefet.content_assignments
  for select to authenticated
  using (client_id = maatefet.my_client_id());

-- ============================================================================
-- public.maatefet_* wrappers
-- ============================================================================

-- assign (idempotent: re-assigning the same item to the same couple updates
-- the note instead of failing — the guard triggers re-fire on the update).
create or replace function public.maatefet_content_assign(
  p_client_id uuid,
  p_content_id uuid,
  p_note text default null
)
returns maatefet.content_assignments
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.content_assignments;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can share content with a couple';
  end if;
  if p_client_id is null or p_content_id is null then
    raise exception 'client and content item are required';
  end if;
  insert into maatefet.content_assignments (instructor_id, client_id, content_item_id, note)
  values (v_instructor_id, p_client_id, p_content_id, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (client_id, content_item_id) do update
    set note = coalesce(nullif(btrim(coalesce(excluded.note, '')), ''), content_assignments.note)
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.maatefet_content_assign(uuid, uuid, text) from public;
revoke execute on function public.maatefet_content_assign(uuid, uuid, text) from anon;
grant execute on function public.maatefet_content_assign(uuid, uuid, text) to authenticated;

create or replace function public.maatefet_content_unassign(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_deleted int;
begin
  delete from maatefet.content_assignments where id = p_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'assignment not found';
  end if;
end;
$$;
revoke all on function public.maatefet_content_unassign(uuid) from public;
revoke execute on function public.maatefet_content_unassign(uuid) from anon;
grant execute on function public.maatefet_content_unassign(uuid) to authenticated;

-- instructor view: which items are shared with which couples. security
-- invoker — clients and content_items are both RLS-visible to their own
-- instructor, so plain joins return exactly the caller's rows.
create or replace function public.maatefet_content_assignments_list(
  p_client_id uuid default null,
  p_content_id uuid default null
)
returns table (
  id uuid,
  client_id uuid,
  content_item_id uuid,
  note text,
  created_at timestamptz,
  client_name text,
  partner_name text,
  content_title text,
  content_type text
)
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select ca.id, ca.client_id, ca.content_item_id, ca.note, ca.created_at,
         c.full_name, c.partner_name, ci.title, ci.content_type
  from maatefet.content_assignments ca
  join maatefet.clients c on c.id = ca.client_id
  join maatefet.content_items ci on ci.id = ca.content_item_id
  where (p_client_id is null or ca.client_id = p_client_id)
    and (p_content_id is null or ca.content_item_id = p_content_id)
  order by ca.created_at desc
$$;
revoke all on function public.maatefet_content_assignments_list(uuid, uuid) from public;
revoke execute on function public.maatefet_content_assignments_list(uuid, uuid) from anon;
grant execute on function public.maatefet_content_assignments_list(uuid, uuid) to authenticated;

-- couple view: the lesson material itself. SECURITY DEFINER because
-- content_items' RLS (correctly) has no couple-facing policy — the
-- assignment row created by the couple's own instructor is the
-- authorization. Gated on my_client_id() (which itself requires aal2), and
-- every returned column is listed explicitly: the couple gets the material
-- (title/body/type/media) and the sharing context (when, instructor note),
-- never is_shared/segment/instructor bookkeeping.
create or replace function public.maatefet_content_couple_list()
returns table (
  assignment_id uuid,
  assigned_at timestamptz,
  note text,
  content_id uuid,
  title text,
  body text,
  content_type text,
  media_url text,
  content_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = maatefet, public
as $$
declare
  v_client_id uuid;
begin
  v_client_id := maatefet.my_client_id();
  if v_client_id is null then
    raise exception 'no active client card for this account (2FA required)';
  end if;
  return query
    select ca.id, ca.created_at, ca.note,
           ci.id, ci.title, ci.body, ci.content_type, ci.media_url, ci.updated_at
    from maatefet.content_assignments ca
    join maatefet.content_items ci on ci.id = ca.content_item_id
    where ca.client_id = v_client_id
    order by ca.created_at desc;
end;
$$;
revoke all on function public.maatefet_content_couple_list() from public;
revoke execute on function public.maatefet_content_couple_list() from anon;
grant execute on function public.maatefet_content_couple_list() to authenticated;
