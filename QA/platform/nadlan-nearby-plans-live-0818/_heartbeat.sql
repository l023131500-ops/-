-- Heartbeat for this step. NOT applied: the Supabase MCP did not appear in
-- this session's ToolSearch results (same "never connected this session"
-- case as nearby-plans-geometry-0818/_heartbeat.sql). Queued here so the row
-- can be entered by whoever has the connection. Run in commit order along
-- with any other pending *_heartbeat*.sql files — find them with
-- `git ls-files -- "*_heartbeat*.sql"` and order by
-- `git log --oneline --reverse -- "*_heartbeat*.sql"`, not by id guesswork.
insert into core.run_progress (phase, task, status, note) values (
  'nadlan-32',
  'nearby-plans-live-0818 — live verification for §12 (construction near the property): real geocode + XPLAN radius query against the four spec addresses, no bug found',
  'done',
  'Added scripts/qa/nearby-plans-live.mjs, which calls the real (unmodified) geocodeAddress + nearbyConstructionPlans from apps/32-nadlan-berega/lib against live GovMap/XPLAN for the four addresses in more30-fixes-and-features.txt section 12 (Doresh Tov 17 Jerusalem, Shmuel HaNavi 86 Jerusalem, HaDekel 22 Hatzor HaGlilit, HaBaal Shem Tov 9 Rehovot). Also added scripts/qa/_register-ts-loader.mjs + _ts-loader-hooks.mjs, a reusable Node ESM resolve hook that retries extensionless relative imports with a .ts suffix, needed because Node 24''s native TS stripping still enforces exact-extension ESM resolution against this app''s moduleResolution:"bundler" source. Result: 4/4 addresses resolved (all cityVerified=true) and queried without error, 0 failed; lat/lng for each landed in the correct city by eye; all returned distances <= 400m radius, all areas <= 200 dunam masterplan filter, no duplicate plans per address (multipart dedup confirmed working against real XPLAN geometry, not just the hand-built polygons in the prior geometry-0818 step). This is the live-data check that nearby-plans-geometry-0818 (commit 4ca4770) explicitly deferred. Explicitly not done: no API route, no UI panel, no premium-tier gate, no wiring into buildreport.ts -- still the next step. Protected systems untouched -- no DB writes, read-only calls to public GovMap/XPLAN endpoints only.'
);
