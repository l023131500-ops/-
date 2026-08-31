-- The ivr-* edge functions (ivr-search, ivr-agent, ivr-submit — deployed live,
-- called by the ימות המשיח phone-IVR integration and displayed to
-- super-admins on /legacy/ivr, src/pages/legacy/IvrBuilder.tsx) have always
-- written to public.ivr_submissions, but that table was never created in any
-- migration. Every insert has always failed:
--   - ivr-search/ivr-agent: fire-and-forget call log, error silently dropped
--     (their caller-facing response wasn't affected), but zero call history
--     was ever recorded.
--   - ivr-submit: the ONLY record of a caller's message/request, and its
--     response to the phone system is gated on this insert's error — so
--     every real call to ivr-submit has always returned an error to the
--     caller instead of the "your request was received" confirmation.
-- Read-only from the admin screen (RequireSuperAdmin-gated route); all writes
-- go through the edge functions' service-role client, which bypasses RLS —
-- same pattern as public.audit_log (no tenant scoping, super-admin read only).
create table if not exists public.ivr_submissions (
  id uuid primary key default gen_random_uuid(),
  caller_phone text,
  request_type text not null default 'message',
  input_text text,
  response_text text,
  params jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists idx_ivr_submissions_created on public.ivr_submissions(created_at desc);

alter table public.ivr_submissions enable row level security;

drop policy if exists "ivr_submissions_super_admin_read" on public.ivr_submissions;
create policy "ivr_submissions_super_admin_read" on public.ivr_submissions
  for select using (public.is_super_admin(auth.uid()));
