-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches). This step needed no MCP/token at
-- all — a plain unauthenticated HTTPS GET is enough to re-check the gate.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list and run order) — run all pending files in git-log commit order,
-- not folder-name order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift sweep — NEEDS_USER.md #0ש′ leads-api reader gate (lux-manage, #170) re-checked: still closed',
$$leads-api-gate-recheck-0817 — re-verified the security gate deployed
12/08 for the orphaned lux-manage project (zwxwteebcoejrjdufzsv). Original
finding: GET /functions/v1/leads-api with no apikey/Authorization returned
200 and the full leads table (names, emails, phone numbers). Fix deployed
via Lovable same day: readerGate() requires x-api-key == LEADS_API_KEY and
fails closed without it. Re-measured today with the identical unauthenticated
GET: still 403 "leads-api reader disabled: LEADS_API_KEY is not configured".
5 days after deploy, no regression. POST (public contact form) untouched by
design and not re-tested (writes only, no read exposure). No code change, no
deploy — measurement only.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס שורות
נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/leads-api-gate-recheck-0817/_results.json.$$,
'ok',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: re-verified the
leads-api reader gate on the orphaned lux-manage Supabase project
(zwxwteebcoejrjdufzsv, core.issues #170) is still closed, 5 days after the
12/08 Lovable deploy. Unauthenticated GET still returns 403 "leads-api
reader disabled: LEADS_API_KEY is not configured" instead of the original
200 + full leads table leak. No regression found. No code change, no
deploy — this check needed no Supabase MCP/token at all (plain HTTPS GET),
so it stayed possible even with the MCP down. Joins the pending-heartbeat
queue; run in commit order.$$
);
