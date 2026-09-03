-- Participant notifications (email / whatsapp) for teachers.
-- product-plan.md Phase 5 "Automation (WhatsApp, Email, IVR, Forums)" has zero
-- built history for this app despite the Dashboard already linking a "שלח
-- הודעה לתלמידים" quick action straight into the Participants page, which
-- only ever offered add/list/search -- no way to actually message anyone.
-- This table is the send/audit log the new notify-participants function
-- writes to, mirroring apps/01-torah-platform's public.notifications_log
-- (badf9726) but scoped to egod's single-teacher-owns-lesson model instead
-- of a multi-tenant one.
create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete set null,
  participant_id uuid references public.participants(id) on delete set null,
  channel text not null check (channel in ('email','whatsapp')),
  recipient text not null,
  subject text,
  message text not null,
  status text not null default 'simulated' check (status in ('sent','simulated','failed')),
  error text,
  meta jsonb not null default '{}'::jsonb,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_log_lesson on public.notifications_log(lesson_id);

alter table public.notifications_log enable row level security;

drop policy if exists "Teachers can view own notifications log" on public.notifications_log;
create policy "Teachers can view own notifications log" on public.notifications_log
  for select using (
    lesson_id in (
      select l.id from public.lessons l
      join public.profiles p on l.teacher_id = p.id
      where p.user_id = auth.uid()
    )
  );

drop policy if exists "Teachers can insert own notifications log" on public.notifications_log;
create policy "Teachers can insert own notifications log" on public.notifications_log
  for insert with check (
    lesson_id in (
      select l.id from public.lessons l
      join public.profiles p on l.teacher_id = p.id
      where p.user_id = auth.uid()
    )
  );
