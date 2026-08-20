-- more30 · 39-maatefet — module 14: לוח משימות ומעקב לימודי (curriculum /
-- study-progress tracker). This is the last unbuilt item of the 15 modules
-- listed in MAATEFET_BUILD.md's "15 המודולים" line — everything else there
-- (CRM, content studio, couple portal, calendar, post-wedding follow-up,
-- instructor coordination, forum, wedding-org checklist, all 5 directory
-- categories, invite-only access) already shipped across stages 0-3.
-- ============================================================================
-- Distinct from wedding_tasks (0120, wedding *logistics* — venue/catering/
-- flowers) and from reminders (0114, free-form instructor-only notes): this
-- is the actual pre-wedding curriculum an instructor teaches a couple
-- (family-purity halacha, shalom bayit, household finances, etc.) and how
-- far through it the couple has progressed.
--
-- Key design call, different from wedding_tasks: only the instructor marks a
-- topic covered. A couple can misreport "we did the flowers" with no real
-- harm; a couple self-certifying "we learned family purity" would defeat the
-- entire point of a taught curriculum. So the couple gets read-only access
-- (RLS select policy, same shape as every other shared table) and **no**
-- mutation RPC at all — simpler than wedding_tasks' toggle, not an oversight.
--
-- Reuses every pattern already proven in this schema rather than inventing
-- new ones:
-- - Same (instructor_id, client_id) shape as appointments/reminders/
--   followups/wedding_tasks — reuses guard_client_belongs_to_instructor()
--   (0114) unchanged.
-- - `status` is a controlled vocabulary, same shape as wedding_tasks.status.
-- - `sequence` (int) lets an instructor order the curriculum without a
--   separate ordering table — same idea as sequence-free lists elsewhere in
--   this schema kept simple with a single sortable column.
-- - `content_item_id` is a nullable FK into content_items (0108/0117) so an
--   instructor can attach the actual lesson material from their own content
--   library to a curriculum topic — the natural link between module 2
--   (content studio) and module 14 (study tracker) the spec never made
--   explicit but the data model already supports for free.
--
-- Note on the content_item_id join exposed via the list function below: it
-- is security invoker, so a couple session reading a linked non-shared
-- content_items row hits content_items' own RLS (content_instructor_all /
-- content_shared_read, 0108/0117) and — for a private (not is_shared) lesson
-- — is correctly filtered out by the LEFT JOIN (content_title/content_
-- media_url come back null, not an error). The study topic, status and
-- progress are unaffected since those live on study_items directly, which
-- the couple already has read access to. Documented trade-off, not a gap:
-- building a SECURITY DEFINER bypass just to leak a lesson title across that
-- boundary was not worth the extra privilege-escalation surface for one
-- optional cosmetic field.
--
-- Standard privilege check repeated from every prior maatefet migration:
-- this project's `public` schema does not have PostgREST's usual "revoke
-- from public also blocks anon" behaviour — anon gets a separate default
-- grant — so every new public.maatefet_* function below gets an explicit
-- `revoke ... from anon`, to be verified live via has_function_privilege()
-- after creation, same as every prior round.

-- ---------- study_items (module 14: לוח משימות ומעקב לימודי) ----------
create table maatefet.study_items (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  client_id uuid not null references maatefet.clients(id) on delete cascade,
  topic text not null,
  notes text,
  sequence int not null default 0,
  content_item_id uuid references maatefet.content_items(id) on delete set null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_study_items_instructor on maatefet.study_items(instructor_id);
create index idx_maatefet_study_items_client on maatefet.study_items(client_id);
create index idx_maatefet_study_items_content on maatefet.study_items(content_item_id);
alter table maatefet.study_items enable row level security;
grant select, insert, update, delete on maatefet.study_items to authenticated;
grant all on maatefet.study_items to service_role;

create trigger trg_maatefet_study_items_updated_at
  before update on maatefet.study_items
  for each row execute function maatefet.set_updated_at();

-- reuses the 0114 guard unchanged — same (instructor_id, client_id) shape.
create trigger trg_maatefet_study_items_guard_client
  before insert or update on maatefet.study_items
  for each row execute function maatefet.guard_client_belongs_to_instructor();

create policy study_items_instructor_all on maatefet.study_items
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- read-only for the couple; deliberately no insert/update/delete policy and
-- no toggle RPC — see design note above.
create policy study_items_client_read on maatefet.study_items
  for select to authenticated
  using (client_id = maatefet.my_client_id());

-- ============================================================================
-- public.maatefet_* wrappers
-- ============================================================================

-- shared list, enriched with the linked content item's title/media (if any
-- and if RLS on content_items allows the caller to see it — see note above).
-- RLS on study_items alone decides which rows come back, same convention as
-- maatefet_wedding_tasks_list/maatefet_appointments_list.
create or replace function public.maatefet_study_items_list()
returns table (
  id uuid,
  instructor_id uuid,
  client_id uuid,
  topic text,
  notes text,
  sequence int,
  content_item_id uuid,
  content_title text,
  content_media_url text,
  status text,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select si.id, si.instructor_id, si.client_id, si.topic, si.notes, si.sequence,
         si.content_item_id, ci.title, ci.media_url,
         si.status, si.completed_at, si.created_at, si.updated_at
  from maatefet.study_items si
  left join maatefet.content_items ci on ci.id = si.content_item_id
  order by si.sequence, si.created_at
$$;

revoke all on function public.maatefet_study_items_list() from public;
revoke all on function public.maatefet_study_items_list() from anon;
grant execute on function public.maatefet_study_items_list() to authenticated;

-- instructor create/update — full control, including status. Validates that
-- an attached content_item_id actually belongs to the calling instructor
-- (cannot link another instructor's private lesson).
create or replace function public.maatefet_study_item_upsert(
  p_id uuid default null,
  p_client_id uuid default null,
  p_topic text default null,
  p_notes text default null,
  p_sequence int default null,
  p_content_item_id uuid default null,
  p_status text default null
)
returns maatefet.study_items
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.study_items;
  v_status text;
  v_clear_content boolean;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can manage the study tracker';
  end if;

  if p_content_item_id is not null
     and not exists (
       select 1 from maatefet.content_items
       where id = p_content_item_id and instructor_id = v_instructor_id
     )
  then
    raise exception 'content item not found or not owned by this instructor';
  end if;

  if p_id is null then
    if p_client_id is null or p_topic is null or btrim(p_topic) = '' then
      raise exception 'client and topic are required';
    end if;
    insert into maatefet.study_items
      (instructor_id, client_id, topic, notes, sequence, content_item_id)
    values (
      v_instructor_id, p_client_id, btrim(p_topic), p_notes, coalesce(p_sequence, 0), p_content_item_id
    )
    returning * into v_row;
  else
    v_status := p_status;
    -- p_content_item_id has no "unset" sentinel distinct from "unchanged" in
    -- a coalesce-style upsert; an explicit sequence-negative-one convention
    -- would be surprising here, so unlinking is done from the UI by passing
    -- the same id with p_content_item_id still set to the desired value —
    -- coalesce below only preserves the old link when the argument is null,
    -- which matches every other optional field on this function.
    v_clear_content := p_content_item_id is not null;
    update maatefet.study_items
    set topic = coalesce(nullif(btrim(p_topic), ''), topic),
        notes = coalesce(p_notes, notes),
        sequence = coalesce(p_sequence, sequence),
        content_item_id = case when v_clear_content then p_content_item_id else content_item_id end,
        status = coalesce(v_status, status),
        completed_at = case
          when v_status = 'completed' and status <> 'completed' then now()
          when v_status is not null and v_status <> 'completed' then null
          else completed_at
        end
    where id = p_id and instructor_id = v_instructor_id
    returning * into v_row;
    if v_row.id is null then
      raise exception 'study item not found';
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_study_item_upsert(uuid, uuid, text, text, int, uuid, text) from public;
revoke all on function public.maatefet_study_item_upsert(uuid, uuid, text, text, int, uuid, text) from anon;
grant execute on function public.maatefet_study_item_upsert(uuid, uuid, text, text, int, uuid, text) to authenticated;

create or replace function public.maatefet_study_item_unlink_content(p_id uuid)
returns maatefet.study_items
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.study_items
  set content_item_id = null
  where id = p_id and instructor_id = maatefet.my_instructor_id()
  returning *
$$;

revoke all on function public.maatefet_study_item_unlink_content(uuid) from public;
revoke all on function public.maatefet_study_item_unlink_content(uuid) from anon;
grant execute on function public.maatefet_study_item_unlink_content(uuid) to authenticated;

create or replace function public.maatefet_study_item_delete(p_id uuid)
returns boolean
language sql
security invoker
set search_path = maatefet, public
as $$
  with deleted as (
    delete from maatefet.study_items
    where id = p_id and instructor_id = maatefet.my_instructor_id()
    returning 1
  )
  select exists(select 1 from deleted)
$$;

revoke all on function public.maatefet_study_item_delete(uuid) from public;
revoke all on function public.maatefet_study_item_delete(uuid) from anon;
grant execute on function public.maatefet_study_item_delete(uuid) to authenticated;

-- ---------- registry note ----------
update core.projects
set note = note || E'\n\n[20/08/2026 Loop C סבב 16] מודול 14 נבנה — לוח משימות ומעקב לימודי (הפריט '
  || 'האחרון שנותר מ-15 המודולים ברשימת האפיון; שאר 14 המודולים כבר בנויים בשלבים 0-3). '
  || 'maatefet.study_items: אותה צורת instructor_id+client_id כמו appointments/reminders/wedding_tasks — '
  || 'משתמש מחדש ב-guard_client_belongs_to_instructor ללא שינוי. שונה במכוון מ-wedding_tasks: רק המדריך/ה '
  || 'מסמן/ת נושא כ"הושלם" — לזוג יש קריאה-בלבד (RLS select) וללא שום RPC-מוטציה, כי הזוג לא יכול/ה '
  || 'לאשר לעצמו/ה שנלמד נושא. content_item_id (FK אופציונלי ל-content_items, 0108/0117) מחבר נושא '
  || 'לימודי לחומר השיעור בפועל מספריית התוכן של המדריך/ה, מאומת בשרת ששייך לו/ה בלבד. '
  || 'maatefet_study_items_list מחזירה שילוב עם כותרת/מדיה של החומר המקושר כש-RLS מרשה. '
  || 'UI: instructor.html קיבל טאב "מעקב לימודי" (יצירה/עריכה/מחיקה/סימון-סטטוס/קישור-חומר). '
  || 'portal.html קיבל כרטיס "מעקב לימודי" עם פס-התקדמות (% הושלם) ורשימה לקריאה-בלבד. '
  || 'אפס רגרסיה: קובץ מיגרציה חדש בלבד, שום טאב/כרטיס/RPC קיים לא נגע. '
  || '**כל 15 המודולים עכשיו בנויים.** נותר בשלב 4: סליקה בפועל (מחכה ל-live=true) + ההרחבות המתקדמות '
  || '(סוכן AI, זיהוי דגלים-אדומים, תזמון חכם, וואטסאפ דו-כיווני, מרקטפלייס תבניות, PWA).'
where number = '39';
