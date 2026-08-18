-- Heartbeat for this step. NOT applied: the Supabase MCP did not appear in
-- this session's ToolSearch results at any point (playwright connected;
-- supabase never did) — same "never appeared at all" case as
-- heartbeats-queued-as-files.md describes, not a transient gate fault.
-- Queued here so the row can be entered by whoever has the connection,
-- instead of the step going unrecorded. Run in commit order along with any
-- other pending _heartbeat-pending.sql/_heartbeat.sql files — find them with
-- `git ls-files -- "*_heartbeat*.sql"` and order by
-- `git log --oneline --reverse -- "*_heartbeat*.sql"`, not by id guesswork.
insert into core.run_progress (phase, task, status, note) values (
  'nadlan-32',
  'nearby-plans-geometry-0818 — data layer for §12 (construction near the property): shoelace centroid + XPLAN radius query, tested',
  'done',
  'Added apps/32-nadlan-berega/lib/geometry.ts (pure area-centroid of an ArcGIS ring polygon via shoelace, no imports, same pattern as lib/aim.ts) and lib/nearbyplans.ts (queries XPLAN layer 1 with returnGeometry=true in a radius, filters plans >200 dunam, dedupes multipart features, returns each plan centroid in WGS84 + planar distance). scripts/qa/nearby-plans-geometry.mjs imports the real geometry.ts module and checks it against hand-computed centroids incl. an asymmetric quad (true centroid 1.4545,3.3636 vs naive vertex average 2,2.75 — far enough apart that a regression to vertex-averaging cannot pass by accident), multipart ring selection, and three no-geometry refusal cases: 10/10 pass. tsc --noEmit in apps/32-nadlan-berega clean. Commit 4ca4770, pushed to fix/nadlan-a11y. Explicitly not done this step: no API route, no UI panel, no premium-tier gate, no wiring into buildreport.ts, no live XPLAN call against the four spec addresses (דורש טוב 17 ירושלים · שמואל הנביא 86 ירושלים · הדקל 22 חצור הגלילית · הבעל שם טוב 9 רחובות) — that is the next step, same look-by-eye-before-release gap the Street View fix (db3f2c1) needed before it shipped. Protected systems untouched — no DB writes at all this step, this app''s own lib/ only.'
);
