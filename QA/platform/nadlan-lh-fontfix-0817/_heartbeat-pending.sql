-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 1e14599 — "32 נדל"ן ברגע: תוקן שורש הפרפורמנס — Google Fonts
-- render-blocking → next/font/google"
-- Source-repo commit: nadlan-berega@65fd579

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'nadlan-fontfix-0817',
  'done',
  'Root-caused the perf=60 measured in nadlan-lh-0817: app/globals.css loaded Heebo+Assistant via @import url(fonts.googleapis.com/...) with no preconnect - a serial network chain (HTML -> bundled CSS -> Google CSS -> gstatic WOFF2) gating first paint, matching FCP=LCP=5.0s exactly. Not a stale-deployment issue like torah was - a genuine source bug. Fixed with next/font/google (self-hosted, inlined at build time) in both the standalone nadlan-berega repo (source of truth per scripts/sync-nadlan.ps1, commit 65fd579) and its deployable copy apps/32-nadlan-berega (what actually ships via Vercel project nadlan-more30). next build verified zero fonts.googleapis.com references. Deployed: vercel deploy --prod from apps/32-nadlan-berega, dpl_GVKytw1SwRXDz5ZzfTwu7TQ3AZzQ, READY. Measured after (Lighthouse, same tool): performance 60->72, FCP 5.0s->2.4s, LCP 5.0s->3.1s, render-blocking-insight estimated savings 2490ms->300ms. Still below the 90 threshold - server-response-time (TTFB 1040ms) and mainthread-work-breakdown (3.9s) remain open for the next round, noted in NEEDS_USER.md. Evidence: QA/platform/nadlan-lh-fontfix-0817/_lighthouse.json.'
);
