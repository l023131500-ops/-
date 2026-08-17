-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 781434a — "01 torah: agud-logo.png -> WebP (1.33MB -> 9.3KB, -99.3%)"

insert into core.run_progress (phase, task, status, note)
values (
  'polish',
  'torah-logo-webp-0817',
  'done',
  'QA/torah.md recommendation #2: converted apps/01-torah-platform/src/assets/agud-logo.png (1,356,654 bytes) to WebP at 200px height (300x200, sharp quality 85) -> 9,274 bytes, -99.3%. Used only in two lazy() legacy routes (/study-days/:token, /shul/:accessToken), not the homepage bundle, so this does not move the /torah Lighthouse score - it removes real dead weight from those two pages. Both imports updated, old PNG removed, vite build clean, deployed prod (dpl_JATB6xtpawMfS2bBnccQC3CM3Zw9). Verified live: asset 200s as image/webp, Playwright screenshot on /study-days/:token shows the logo rendering correctly, 0 console errors besides the known NetFree favicon 418. Evidence: QA/platform/torah-logo-webp-0817/.'
);
