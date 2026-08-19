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
  'kupot-28',
  'admin-login-pwtoggle-0819 -- show-password (eye) toggle on the admin login field, per more30-priority.md sec1a',
  'done',
  'apps/28-kupot-health-funds/server/admin-page.ts: added a pw-toggle button next to the admin password field, same eye/eye-off SVG + aria-pressed/aria-label pattern as portal/public/login.html''s existing pwToggle (kept in sync, not reinvented). Purely additive -- login POST, cookie flow, table rendering, logout untouched. tsc --noEmit clean. Rebuilt via script/build-vercel-fn.ts (api/index.js, 1.7MB, matches known-good size), copied into _deploy/kupot-more30, deployed vercel deploy --prod --yes (dpl_5w1aXCcBJEX1V1M9VEeX3tfyKsi3, READY, ~10s upload -- the known-good fast profile, not the earlier build-failure trap). Verified live via Playwright on more30.com/kupot/api/admin?cachebust=0819pwtoggle: typed a value, clicked toggle -> type flips password to text, value preserved, aria-pressed/aria-label/icon all agree; clicked again -> reverts. Only pre-existing console entries (403 on switch-leads with no session cookie yet, DOM form-nesting notice) -- no new errors. Evidence: QA/kupot-28/pwtoggle-0819/_results.md. Protected systems untouched, no DB writes.'
);
