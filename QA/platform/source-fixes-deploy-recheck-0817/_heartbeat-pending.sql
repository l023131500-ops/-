-- PENDING HEARTBEAT — Supabase MCP was not connected in this session (17/08/2026).
-- Insert this BEFORE inferring what is already done from core.run_progress —
-- otherwise the last row still in the table reads as the latest state and this
-- step reads as not-yet-started. `at` below is NOT the run time, it is a
-- placeholder — this was written from a file, not live.
-- Find the full queue with: git ls-files -- "*_heartbeat-pending.sql"
-- Run order = git log --oneline --reverse -- "*_heartbeat-pending.sql" (oldest commit first).

insert into core.run_progress (phase, task, status, note, at)
values (
  'anti-drift-sweep',
  'NEEDS_USER §0א — three "py-1 not yet deployed" rows (03 igud-ads, 02 igud-transcribe, 21 mthbram), recheck',
  'done',
  'NEEDS_USER.md §0א table (source fixes saved to git 03/08 but excluded by .gitignore, pending an architecture decision) tagged three specific rows "⏳ טרם נפרס" (not yet deployed): apps/03-igud-ads/app/(public)/page.tsx (py-1 on 3 nav links), apps/02-igud-transcribe/app/page.tsx (py-1 on footer mailto link), apps/21-mthbram/src/pages/NotFound.tsx (py-1 on the 404 return-home link). Verified directly against production with a cache-buster: https://more30.com/modaot and https://more30.com/tamlul serve the exact "inline-block py-1" class in server-rendered HTML; https://more30.com/mthbram is a client-rendered SPA with a catch-all route, so fetched the JS bundle the production HTML references (/mthbram/assets/index-DO5Yp880.js) and found the same "inline-block py-1" on the "Return to Home" link. All three are live. The §0א architecture question itself (per-app repo vs. managing code in this monorepo) is untouched and still open — this only closes the deployment-status claim on these three rows. No code change, no deploy — measurement only. Evidence: QA/platform/source-fixes-deploy-recheck-0817/_results.txt. Written from a _heartbeat-pending.sql file because the Supabase MCP was not connected this session; `at` is not the true run time.',
  now()
);
