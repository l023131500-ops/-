-- more30 · 32 nadlan-berega — personal report history (core.build_tasks id=6, part c)
-- ============================================================================
-- build_tasks id=6 part (c) ("real data accessible ONLY behind an Enter-System
-- login") was left `todo` because taking it literally — locking /report and
-- /p/[slug] behind login — would break a live, documented, intentional
-- feature (the free, no-signup, WhatsApp-shareable report; see
-- apps/32-nadlan-berega/CLAUDE.md, session 9) and violate the platform's
-- zero-regression rule. That entry itself proposed the resolution actually
-- taken here: add NEW capability behind the existing shared login
-- (more30.com auth-button.js) without touching the public path at all —
-- "e.g. personal search history".
--
-- This table records, only for a signed-in more30 user, which saved reports
-- (`nadlan.saved_reports.slug`) they have viewed and when. Anonymous viewers
-- (the entire existing public flow) never touch this table — the app only
-- writes to it when a client already holds a more30 session token.
-- ============================================================================

create table if not exists nadlan.report_history (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  slug text not null references nadlan.saved_reports (slug) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists report_history_user_idx
  on nadlan.report_history (user_id, viewed_at desc);

alter table nadlan.report_history enable row level security;

-- No policy — same posture as `saved_reports`/`street_video_cache`/
-- `tabu_documents`: all access goes through the server's service-role client
-- (lib/reporthistory.ts), which independently verifies the caller's identity
-- against Supabase Auth (`/auth/v1/user`) before ever reading/writing a row.
-- The anon/authenticated keys never touch this table directly.
grant select, insert, update, delete, references, trigger, truncate
  on nadlan.report_history
  to service_role;
