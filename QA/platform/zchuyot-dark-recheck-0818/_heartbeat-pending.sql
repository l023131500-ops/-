-- Supabase MCP not connected this session. Run this once MCP/access is available.
insert into core.run_progress (phase, task, status, note)
values (
  'a11y-sweep-3',
  'zchuyot-dark-recheck-0818',
  'done',
  '22 zchuyot round-3 dark-mode contrast recheck: contrast-probe.mjs against https://more30.com/zchuyot, both color schemes (light/dark), both widths (1440/390) -- 0 failures in all four combinations. Notable: this is the app that previously exposed a false-positive in contrast-probe.mjs itself (whileInView-driven fade sections using opacity:0 pre-scroll, documented in the tool source at contrast-probe.mjs:98-101) -- the opacity/visibility guards added since then held up cleanly here, no false positives this run. No code change, no deploy (nothing to fix). Evidence: QA/platform/zchuyot-dark-recheck-0818/_results.md. Next in round-3 ROUTES queue (after torah/tamlul/modaot/imud/briut/bkalot/smel/smachot/egod/chatzor/chatzor-app/chizukim/chizukim-app/orech/mthbram/zchuyot; galil/kiosk already done out of order in a prior session): studio, mechiron, kupot, crm, gesher, nadlan, kesef.'
);
