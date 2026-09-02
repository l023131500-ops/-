-- ============================================================================
-- Participant notifications (email / whatsapp) — audit_gaps #01: "התראות
-- למשתתפים (מייל/ווטסאפ)" was fully unbuilt (README documented a
-- notify-participants edge function that never existed). This table is the
-- send/audit log the new notify-participants function writes to.
-- Deliberately NOT added to the generic public-active-tenant read loop in
-- 20260519000002 (participants/leads/etc.) — it holds message bodies +
-- recipient contact info, tenant members only.
-- ============================================================================
create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
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
create index if not exists idx_notifications_log_tenant on public.notifications_log(tenant_id);
create index if not exists idx_notifications_log_lesson on public.notifications_log(lesson_id);

alter table public.notifications_log enable row level security;

drop policy if exists "notifications_log_tenant_read" on public.notifications_log;
create policy "notifications_log_tenant_read" on public.notifications_log
  for select using (public.user_in_tenant(tenant_id));

drop policy if exists "notifications_log_tenant_write" on public.notifications_log;
create policy "notifications_log_tenant_write" on public.notifications_log
  for insert with check (
    public.is_super_admin(auth.uid())
    or public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), tenant_id, 'moderator')
    or public.has_tenant_role(auth.uid(), tenant_id, 'member')
  );
