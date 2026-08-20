-- more30 · 39-maatefet — stage 3 closes: module 8, ארגון החתונה (wedding
-- organization checklist) — the last item on MAATEFET_BUILD.md's stage-3
-- roadmap line ("ליווי אחרי החתונה + דירקטוריז (הזנה הדרגתית) + ארגון חתונה").
-- ============================================================================
-- Until this migration there was no shared checklist between an instructor
-- and a couple for the dozen-odd logistics a wedding actually requires
-- (venue, catering, photography, the ketubah/rabbi, invitations…) — only
-- free-form instructor-only reminders (0114), which the couple never sees.
-- This adds exactly the missing piece: one task list per couple, visible to
-- both sides, where the instructor decides who owns each item.
--
-- Shape, reusing every pattern this schema has already proven rather than
-- inventing new ones:
-- - maatefet.wedding_tasks: same (instructor_id, client_id) shape as
--   appointments/reminders/followups — reuses guard_client_belongs_to_
--   instructor() (0114) unchanged; the trigger is column-name-generic, not
--   appointments-specific, so no new guard function is needed.
-- - `category` is a controlled vocabulary (one table, many facets), same
--   shape as content_type (0117) and directory_entries.category (0119)
--   rather than a free-text field or a separate table per category.
-- - `assigned_to` ('instructor' | 'couple') decides who owns getting an item
--   done — a venue booking is the instructor's professional call, but
--   "choose the flowers" is the couple's. This is the field the mutation
--   surface below actually keys off of.
-- - Read: RLS-shared list function (maatefet_wedding_tasks_list), same
--   "one function, two RLS policies OR'd together" convention already used
--   by maatefet_appointments_list/maatefet_reminders_list — instructor.html
--   and portal.html both call the identical function and each gets their
--   own rows back. No column-level privacy split is needed here (unlike
--   followups' flagged/instructor_note): nothing on this table is
--   instructor-private, the whole point is that both sides see the same
--   checklist.
-- - Write: the instructor gets full CRUD via RLS (`wedding_tasks_instructor_
--   all`), exactly like appointments/reminders/followups. The couple gets
--   **no** raw write policy at all — same "no client write policy, one
--   narrow RPC" shape as maatefet_appointment_rsvp/maatefet_followup_
--   respond. Their only mutation is maatefet_wedding_task_toggle(), a
--   SECURITY DEFINER RPC that flips a task between 'todo' and 'done', and
--   only for a task that is (a) their own client_id and (b)
--   assigned_to = 'couple' — a couple can never touch an instructor-owned
--   task's status, category, title, or due date.
--
-- Standard privilege check repeated from every prior maatefet migration
-- (0111/0114/0115/0116/0117/0118/0119): this project's `public` schema does
-- not have PostgREST's usual "revoke from public also blocks anon" behaviour
-- — anon gets a separate default grant — so every new public.maatefet_*
-- function below gets an explicit `revoke ... from anon`, to be verified
-- live via has_function_privilege() after creation, same as every prior
-- round.

-- ---------- wedding_tasks (module 8: ארגון החתונה) ----------
create table maatefet.wedding_tasks (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  client_id uuid not null references maatefet.clients(id) on delete cascade,
  category text not null
    check (category in (
      'venue', 'catering', 'photography_video', 'music', 'flowers_design',
      'attire', 'rabbi_ketubah', 'invitations', 'logistics', 'budget', 'other'
    )),
  title text not null,
  detail text,
  due_date date,
  assigned_to text not null default 'couple'
    check (assigned_to in ('instructor', 'couple')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_wedding_tasks_instructor on maatefet.wedding_tasks(instructor_id);
create index idx_maatefet_wedding_tasks_client on maatefet.wedding_tasks(client_id);
create index idx_maatefet_wedding_tasks_due on maatefet.wedding_tasks(due_date);
alter table maatefet.wedding_tasks enable row level security;
grant select, insert, update, delete on maatefet.wedding_tasks to authenticated;
grant all on maatefet.wedding_tasks to service_role;

create trigger trg_maatefet_wedding_tasks_updated_at
  before update on maatefet.wedding_tasks
  for each row execute function maatefet.set_updated_at();

-- reuses the 0114 guard unchanged — same (instructor_id, client_id) shape.
create trigger trg_maatefet_wedding_tasks_guard_client
  before insert or update on maatefet.wedding_tasks
  for each row execute function maatefet.guard_client_belongs_to_instructor();

create policy wedding_tasks_instructor_all on maatefet.wedding_tasks
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- read-only for the couple; no insert/update/delete policy for the client
-- role — their only mutation is maatefet_wedding_task_toggle() below.
create policy wedding_tasks_client_read on maatefet.wedding_tasks
  for select to authenticated
  using (client_id = maatefet.my_client_id());

-- ============================================================================
-- public.maatefet_* wrappers
-- ============================================================================

-- shared list: RLS alone decides which rows come back — an instructor
-- session sees their own clients' tasks, a client session sees only their
-- own, via the two OR'd policies above. Same convention as
-- maatefet_appointments_list/maatefet_reminders_list.
create or replace function public.maatefet_wedding_tasks_list()
returns setof maatefet.wedding_tasks
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.wedding_tasks
  order by (status = 'done'), due_date nulls last, created_at
$$;

revoke all on function public.maatefet_wedding_tasks_list() from public;
revoke all on function public.maatefet_wedding_tasks_list() from anon;
grant execute on function public.maatefet_wedding_tasks_list() to authenticated;

-- instructor create/update — full control over every field, including
-- status (an instructor can mark their own or the couple's task done too,
-- e.g. after confirming a vendor by phone on the couple's behalf).
create or replace function public.maatefet_wedding_task_upsert(
  p_id uuid default null,
  p_client_id uuid default null,
  p_category text default null,
  p_title text default null,
  p_detail text default null,
  p_due_date date default null,
  p_assigned_to text default null,
  p_status text default null
)
returns maatefet.wedding_tasks
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.wedding_tasks;
  v_status text;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can manage wedding-organization tasks';
  end if;

  if p_id is null then
    if p_client_id is null or p_category is null or p_title is null or btrim(p_title) = '' then
      raise exception 'client, category and title are required';
    end if;
    insert into maatefet.wedding_tasks
      (instructor_id, client_id, category, title, detail, due_date, assigned_to)
    values (
      v_instructor_id, p_client_id, p_category, btrim(p_title), p_detail, p_due_date,
      coalesce(p_assigned_to, 'couple')
    )
    returning * into v_row;
  else
    v_status := p_status;
    update maatefet.wedding_tasks
    set category = coalesce(p_category, category),
        title = coalesce(nullif(btrim(p_title), ''), title),
        detail = coalesce(p_detail, detail),
        due_date = coalesce(p_due_date, due_date),
        assigned_to = coalesce(p_assigned_to, assigned_to),
        status = coalesce(v_status, status),
        completed_at = case
          when v_status = 'done' and status <> 'done' then now()
          when v_status is not null and v_status <> 'done' then null
          else completed_at
        end
    where id = p_id and instructor_id = v_instructor_id
    returning * into v_row;
    if v_row.id is null then
      raise exception 'wedding-organization task not found';
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_wedding_task_upsert(uuid, uuid, text, text, text, date, text, text) from public;
revoke all on function public.maatefet_wedding_task_upsert(uuid, uuid, text, text, text, date, text, text) from anon;
grant execute on function public.maatefet_wedding_task_upsert(uuid, uuid, text, text, text, date, text, text) to authenticated;

create or replace function public.maatefet_wedding_task_delete(p_id uuid)
returns boolean
language sql
security invoker
set search_path = maatefet, public
as $$
  with deleted as (
    delete from maatefet.wedding_tasks
    where id = p_id and instructor_id = maatefet.my_instructor_id()
    returning 1
  )
  select exists(select 1 from deleted)
$$;

revoke all on function public.maatefet_wedding_task_delete(uuid) from public;
revoke all on function public.maatefet_wedding_task_delete(uuid) from anon;
grant execute on function public.maatefet_wedding_task_delete(uuid) to authenticated;

-- the couple's only mutation: toggle their own assigned task between
-- 'todo' and 'done'. Cannot touch an instructor-assigned task (status stays
-- whatever the instructor set), cannot touch another couple's task (client_id
-- must match my_client_id()), cannot change category/title/due date.
create or replace function public.maatefet_wedding_task_toggle(p_id uuid)
returns maatefet.wedding_tasks
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_client_id uuid;
  v_row maatefet.wedding_tasks;
begin
  v_client_id := maatefet.my_client_id();
  if v_client_id is null then
    raise exception 'must be a client with a verified 2FA session to update a wedding-organization task';
  end if;

  update maatefet.wedding_tasks
  set status = case when status = 'done' then 'todo' else 'done' end,
      completed_at = case when status = 'done' then null else now() end
  where id = p_id and client_id = v_client_id and assigned_to = 'couple'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'task not found or not assigned to the couple';
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_wedding_task_toggle(uuid) from public;
revoke all on function public.maatefet_wedding_task_toggle(uuid) from anon;
grant execute on function public.maatefet_wedding_task_toggle(uuid) to authenticated;

-- ---------- registry note ----------
update core.projects
set note = note || E'\n\n[20/08/2026 Loop C סבב 14] שלב 3 נסגר — מודול 8, ארגון החתונה (הפריט האחרון '
  || 'ברשימת שלב 3). maatefet.wedding_tasks: רשימת-משימות אחת משותפת לזוג ולמדריך/ה, אותה צורת '
  || 'instructor_id+client_id כמו appointments/reminders/followups — משתמשת מחדש ב-guard_client_belongs_to_instructor '
  || 'ללא שינוי. category מבוקר (11 ערכים: אולם/קייטרינג/צילום-וידאו/מוזיקה/פרחים-עיצוב/לבוש/רב-כתובה/הזמנות/לוגיסטיקה/תקציב/אחר), '
  || 'אותה צורה כמו content_type (0117) ו-directory_entries.category (0119). assigned_to (מדריך/ה או זוג) קובע מי אחראי/ת '
  || 'על כל פריט. קריאה: פונקציה יחידה משותפת (maatefet_wedding_tasks_list) — RLS לבד מחזיר למדריך/ה את המשימות של הזוגות '
  || 'שלו/ה ולזוג את המשימות שלו/ה בלבד, אותו דפוס בדיוק כמו appointments/reminders. כתיבה: המדריך/ה מקבל/ת CRUD מלא דרך RLS; '
  || 'לזוג אין שום מדיניות כתיבה גולמית — המוטציה היחידה היא maatefet_wedding_task_toggle (SECURITY DEFINER), שמחליף '
  || 'todo↔done רק על משימה שהוקצתה לזוג עצמו (assigned_to=couple) ורק על client_id שלהם/ן — לא ניתן לגעת במשימת מדריך/ה '
  || 'או במשימה של זוג אחר. UI: instructor.html קיבל טאב "ארגון החתונה" (יצירה/עריכה/מחיקה/סימון-סטטוס, סינון לפי הקצאה), '
  || 'portal.html קיבל כרטיס "ארגון החתונה" (רשימה עם checkbox פעיל רק על משימות שהוקצו לזוג, משימות מדריך/ה מוצגות '
  || 'לקריאה-בלבד). אפס רגרסיה: אף טאב/כרטיס/RPC קיים לא נגע. **שלב 3 עכשיו סגור** — כל שלושת הפריטים (ליווי אחרי החתונה, '
  || 'דירקטוריז, ארגון חתונה) בנויים. השלב הבא: שלב 4 — סליקת מנויים (ספק ישראלי, מצב טסט עד אישור) + אנליטיקה + הרחבות.'
where number = '39';
