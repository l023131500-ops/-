-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), so core.run_progress is not
-- reachable from here. Joins the existing queue (see QA/*/*-0817/
-- _heartbeat-pending.sql for the full list) — run all pending files in
-- git-log commit order, not folder-name order. Delete each file once its
-- row lands.

insert into core.run_progress (phase, task, status, note) values (
'26 modaot-studio — fixed vite.config.ts base mismatch (NEEDS_USER 2291abb)',
$$studio-base-fix-0817 — apps/26-modaot-studio/vite.config.ts declared
base: "/modaot/" (system 03's mount path) while studio is served at
/studio/. Production was not broken because it is served from a
manually-staged copy under _deploy/studio-more30/public/studio/ whose
index.html already had correct paths (see memory
studio-build-base-override), but any real `vite build` from this source
config would emit /modaot/assets/... and 404 every asset once staged.
Logged in NEEDS_USER.md as an open, unfixed bug since 10/08
(commit 2291abb) — not blocked on the user, just never applied.

Fixed: base changed to "/studio/". Verified with a local `vite build`
(node node_modules\vite\bin\vite.js build) inside apps/26-modaot-studio:
dist/public/index.html now emits /studio/assets/index-*.js and
/studio/assets/index-*.css instead of /modaot/assets/.... dist/ is
gitignored, not committed. No deploy in this step — only the source
config, so the next real rebuild of this app is correct from the start.
NEEDS_USER.md and SYSTEMS_STATUS.md updated to reflect the fix.$$,
'done',
$$commit on fix/nadlan-a11y, pushed. 1-line source fix
(apps/26-modaot-studio/vite.config.ts: base "/modaot/" -> "/studio/"),
verified with a local vite build, no deploy performed. Protected systems
(08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) not touched. Joins the
pending-heartbeat queue; run in commit order with the others.$$
);
