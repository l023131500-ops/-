-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 1503878 — "אנטי-דריפט: SYSTEMS_STATUS.md/NEEDS_USER.md — 32
-- נדל"ן: Lighthouse נמדד לראשונה, פרפורמנס 60 (מתחת לסף 90)"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'nadlan-lh-0817',
  'done',
  'New angle: only torah(01) and tivuch(36) had ever had Lighthouse run against them. Ran scripts/qa/lighthouse-run.mjs against https://more30.com/nadlan (branch fix/nadlan-a11y is named after this system): performance 60, accessibility 100, SEO 100, BP 77 (same two NetFree-injected audits as torah/tivuch, not a code bug). 60 is lower than torah''s own starting point (74) before it was fixed to 88. Not investigated or fixed in this step - measurement only, to document the gap before the next step investigates (render-blocking-insight ~2490ms, mainthread-work-breakdown 6.2s, lcp-breakdown-insight are the leading suspects). No code change, no deploy. Evidence: QA/platform/nadlan-lh-0817/_lighthouse.json.'
);
