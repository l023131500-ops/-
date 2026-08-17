-- PENDING HEARTBEAT — insert this BEFORE reading core.run_progress to infer
-- what is already done. The Supabase MCP was not connected this session
-- (explicit ToolSearch for mcp__supabase__* returned no matches), so this row
-- was written to a file instead of inserted live. `at` below is NOT the real
-- run time — set it to now() when you actually run this statement, or leave
-- as-is and note the gap.
--
-- Commit: 6ce905d (fix/nadlan-a11y)
-- Run this in commit order relative to any other *_heartbeat-pending.sql
-- files still queued (see git log --oneline --reverse -- "*_heartbeat-pending.sql").

insert into core.run_progress (phase, task, status, note, at)
values (
  'perf-sweep',
  '14 smachot — Google Fonts render-blocking fix',
  'done',
  'apps/14-bsmachot-plus/website/index.html: Google Fonts <link rel="stylesheet"> ' ||
  'blocking link converted to loadCSS preload/swap pattern (media=print + ' ||
  'onload swap + noscript fallback), matching the fix already applied to ' ||
  '02/03/04/17/22. Applied to source and to the deployed copy ' ||
  '(_deploy/smachot-more30/smachot/index.html, gitignored, not tracked in git) ' ||
  'and deployed live via `vercel deploy --prod` from _deploy/smachot-more30 ' ||
  '(project smachot-more30, already linked). Verified live via cache-busted ' ||
  'fetch of https://more30.com/smachot showing the new markup. Lighthouse ' ||
  '(scripts/qa/lighthouse-run.mjs) before/after: render-blocking-insight ' ||
  'estimated savings dropped 1,190ms -> 840ms. Aggregate performance score is ' ||
  'noisy (79 before this specific re-run, 76 after) and stays below the 90 ' ||
  'threshold -- base.css/style.css (same-origin, local) still block render and ' ||
  'were not touched this step. SYSTEMS_STATUS.md row 14 updated. ' ||
  'This heartbeat was written late from a file — Supabase MCP unavailable this session.',
  now()
);
