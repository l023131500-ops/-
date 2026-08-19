-- Heartbeat for this step. NOT applied: the Supabase MCP did not appear in
-- this session's ToolSearch results at any point (playwright connected;
-- supabase never did) -- same "never appeared at all" case as
-- heartbeats-queued-as-files.md describes, not a transient gate fault.
-- Queued here so the row can be entered by whoever has the connection,
-- instead of the step going unrecorded. Run in commit order along with any
-- other pending _heartbeat-pending.sql/_heartbeat.sql files -- find them with
-- `git ls-files -- "*_heartbeat*.sql"` and order by
-- `git log --oneline --reverse -- "*_heartbeat*.sql"`, not by id guesswork.
insert into core.run_progress (phase, task, status, note) values (
  'platform-sweep',
  'pwtoggle-sweep-close-0819 -- verify more30-priority.md sec1a (show-password toggle) is closed platform-wide',
  'done',
  'Follow-up to kupot-28 admin-login-pwtoggle-0819. Searched app source on disk (not git-tracked Grep -- app sources are gitignored) for type="password" across apps/*, excluding node_modules/.next/dist/_deploy. Found 5 non-archive files with a password field outside the shared portal/public/login.html: 28-kupot-health-funds/server/admin-page.ts (fixed this session, see prior heartbeat), 24-galilee-connect-hub/src/pages/GabaiPortal.tsx (already had showPassword state + an explicit code comment citing sec1a -- pre-existing, not built here), 19-igud-shiurim-portal/public/app.js (already had a generic pwField() helper with eye toggle wrapping every password field in the file, incl. login and per-institution API password, twice), 35-kioskfleet/server/public/js/app.js (already had the same pw-wrap + eye/eye-off SVG toggle pattern -- verified only, deliberately not touched per priority sec1bb+ which says leave kiosk console polish alone for now). Two remaining hits were _archive/bklotm and _archive/lux-manage -- archived code, not a live system. Conclusion: sec1a (show-password button on every password field) is fully closed across all live systems audited so far. No code changed in this step -- verification + documentation only (NEEDS_USER.md).'
);
