-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 22776f5 — "32 נדל"ן ברגע: הרחבת lighthouse-run.mjs לפילוח
-- בפועל, סוגר mainthread-work-breakdown ו-server-response-time בראיה"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'nadlan-mainthread-0817',
  'done',
  'Extended scripts/qa/lighthouse-run.mjs to save the real breakdown behind mainthread-work-breakdown (per-group duration) and bootup-time (per-script total/scripting/scriptParseCompile), not just the summary score - the missing piece that stalled the last three nights investigation of nadlan perf. QA-tool-only change, no production code touched. Re-ran against the live https://more30.com/nadlan: group breakdown for the 6.9s total is dominated by Other (3.6s) and Style & Layout (2.1s), not script execution (Script Evaluation only 660ms, Script Parsing & Compilation only 105ms). Per-script breakdown: auth-button.js (shared across all 24 live systems, previously suspected as the source of the unminified-javascript audit) is only 357ms bootup / 33ms actual scripting - negligible, and not worth the risk of touching a file 24 production systems depend on for such a small estimated gain (6 KiB). Next.js bundles together are only 522ms. The trace itself contains https://netfree.link/card/card-injection.js actually injected into the page - concrete evidence (not just inference) supporting the prior nights conclusion that the local NetFree filtering proxy on this network is the dominant factor, not a server or code bug. Conclusion: no further code fix exists for nadlan mainthread-work-breakdown or server-response-time - both are network-measurement-dependent, closing two items that were open across the last several nights rounds. Updated NEEDS_USER.md and SYSTEMS_STATUS.md. Evidence: QA/platform/nadlan-mainthread-0817/_lighthouse.json.'
);
