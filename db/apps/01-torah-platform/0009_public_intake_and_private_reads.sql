-- 01 torah-platform (Supabase bieebmnmkffwbqlsfozh)
-- ---------------------------------------------------------------------------
-- Two halves of one problem, which have to be fixed together.
--
-- (a) NO PUBLIC FORM ON THE SITE COULD SUBMIT ANYTHING. Verified with the anon
--     key the deployed bundle carries: INSERT into leads, portal_messages and
--     rabbi_questions all returned
--       42501 new row violates row-level security policy
--     Every intake path was therefore dead — find-a-lesson, request-a-lesson,
--     join-as-teacher, the footer contact form, ask-the-rabbi. Each of those
--     screens still showed a success message, because the client either ignored
--     the error or reported a generic failure the visitor could not act on.
--
-- (b) THOSE SAME TABLES ARE WORLD-READABLE. Their SELECT policy is
--       tenant_id IS NULL OR user_in_tenant(tenant_id) OR <tenant is active>
--     and the third branch is true for every visitor. 22 tables carry it. On a
--     lesson directory that is the intent. On leads, contact messages, chat,
--     participants and memorial records it means that the moment intake starts
--     working, every name and phone number submitted becomes public.
--
-- Enabling (a) without fixing (b) would turn a dead form into a data leak, so
-- this migration does both: private tables stop being publicly readable, and
-- the intake tables gain a narrow insert-only path for anonymous visitors.
--
-- Nothing here widens member access: user_in_tenant already covers super admins
-- (it calls is_super_admin first), and the existing FOR ALL write policies are
-- left untouched.

-- ── 1. Tables that were never meant to be public ────────────────────────────
-- Read is restricted to people who belong to the tenant. Listed one by one on
-- purpose: the split between public content and private records is a judgement
-- about each table, not something to derive from a pattern.
do $$
declare t text;
begin
  foreach t in array array[
    'leads',            -- names and phone numbers of people asking for a lesson
    'portal_messages',  -- inbound contact messages
    'participants',     -- who attends which lesson
    'chat_messages',
    'chat_rooms',
    'newsletters',
    'forum_posts',      -- the forum is a members' space in this product
    'study_daily',
    'study_schedules',
    'azkarot'           -- deceased names plus the family's contact details
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_read', t);
    execute format(
      'create policy %I on public.%I for select using (public.user_in_tenant(tenant_id))',
      t || '_tenant_read', t);
  end loop;
end $$;

-- The forum read policy is named differently from the rest.
drop policy if exists forum_posts_tenant_read on public.forum_posts;

-- ── 2. Two tables that are partly public ────────────────────────────────────
-- An answered question that was marked public belongs on the public page; an
-- unanswered one carries the asker's phone number and does not.
drop policy if exists rabbi_questions_tenant_read on public.rabbi_questions;
create policy rabbi_questions_tenant_read on public.rabbi_questions
  for select using (
    public.user_in_tenant(tenant_id)
    or (is_public = true and answer is not null)
  );

-- Uploaded material is visible once it has been approved. Pending and rejected
-- uploads stay with the tenant.
drop policy if exists materials_tenant_read on public.materials;
create policy materials_tenant_read on public.materials
  for select using (
    public.user_in_tenant(tenant_id)
    or status = 'approved'
  );

-- ── 3. Let the public forms submit ──────────────────────────────────────────
-- Insert only, and only into a tenant that is active and public. anon has no
-- SELECT on leads or portal_messages after step 1, so a submitter cannot read
-- back anything — not even their own row. supabase-js .insert() without a
-- following .select() does not ask for the row back, which is what the forms do.
create or replace function public.tenant_accepts_public_intake(_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = _tenant_id and t.status = 'active' and t.is_public = true
  );
$$;

grant execute on function public.tenant_accepts_public_intake(uuid) to anon, authenticated;

drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads
  for insert to anon
  with check (public.tenant_accepts_public_intake(tenant_id));

drop policy if exists portal_messages_public_insert on public.portal_messages;
create policy portal_messages_public_insert on public.portal_messages
  for insert to anon
  with check (public.tenant_accepts_public_intake(tenant_id));

drop policy if exists rabbi_questions_public_insert on public.rabbi_questions;
create policy rabbi_questions_public_insert on public.rabbi_questions
  for insert to anon
  with check (
    public.tenant_accepts_public_intake(tenant_id)
    -- A question arrives unanswered and unpublished. Marking your own question
    -- public and answered would otherwise be a way to write to the public page.
    and answer is null
    and coalesce(is_public, false) = false
  );

-- PostgREST needs the table privilege as well as the policy.
grant insert on public.leads            to anon;
grant insert on public.portal_messages  to anon;
grant insert on public.rabbi_questions  to anon;
