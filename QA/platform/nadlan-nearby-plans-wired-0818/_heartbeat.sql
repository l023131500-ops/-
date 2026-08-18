-- Heartbeat for this step. NOT applied: the Supabase MCP was still
-- "connecting" (never became available) this session, same case as the
-- geometry-0818 and live-0818 heartbeats before it. Queued here so the row
-- can be entered by whoever has the connection. Run in commit order along
-- with any other pending *_heartbeat*.sql files -- find them with
-- `git ls-files -- "*_heartbeat*.sql"` and order by
-- `git log --oneline --reverse -- "*_heartbeat*.sql"`, not by id guesswork.
insert into core.run_progress (phase, task, status, note) values (
  'nadlan-32',
  'nearby-plans-wired-0818 -- wire §12 (construction near the property) data layer into buildReport + UI panel + premium gate, fixed a live radius bug found in the process',
  'done',
  'Finished the wiring that nearby-plans-geometry-0818 (4ca4770) and nearby-plans-live-0818 (3803d83) both explicitly deferred: buildreport.ts now calls nearbyConstructionPlans() behind tierMayUsePaidSources(tier), the result flows into PropertyReport.nearbyPlans, and ReportView renders it via the (already-committed) NearbyPlansPanel under the "potential" category. Verified live via next dev + GET /api/report?tier=premium for Dizengoff 100 Tel Aviv: real XPLAN plans returned with plan number/name/status/area/distance/lat/lng; tier=basic on the same address returns nearbyPlans=null, confirming the premium gate matches the imagery-gate pattern (source not queried at free tier, not just hidden). tsc --noEmit and npm run build both clean. Found and fixed a real bug before commit: XPLAN''s distance/units query params bound which plans'' geometry intersects the 400m search buffer, but a plan''s displayed area centroid can lie far outside that buffer for an elongated polygon -- live Dizengoff data showed entries up to ~4000m under a panel that promises "רדיוס 400 מ''"; added a centroid-distance filter in lib/nearbyplans.ts so returned entries actually satisfy their own radius claim (re-verified live: 6 plans, 35-265m, after the fix). Not deployed yet -- apps/32-nadlan-berega deploys via the separate nadlan-berega repo/sync script, a separate step. No protected system touched.'
);
