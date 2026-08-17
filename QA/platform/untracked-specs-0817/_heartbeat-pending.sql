-- PENDING HEARTBEAT — insert this row before inferring what's already done from other rows.
-- Written late from a file because the Supabase MCP was not connected this session
-- (checked via ToolSearch, no mcp__supabase__* tools available). `at` below is NOT the
-- actual run time — insert it as close to real time as possible when the MCP is back.
insert into core.run_progress (phase, task, status, note, at)
values (
  'platform',
  'untracked-root-docs-triage',
  'done',
  'commit 91bc2f9: added 12 untracked root spec docs identified as genuinely unique (not duplicates) in NEEDS_USER 0תד (17/08 evening) — CRM_מתווכים, EVENTS_BUILD, EVENTS_CAPTURE, KIOSK_INSTALL_GUIDE, NADLAN_GTM, NADLAN_PRO research, NADLAN_V3_additions, more30-admin-build, ad_studio_master_spec, big_mission_phase1, more30_master_spec, תוכנית_אוטומציית_בקלות. Confirmed via hash/diff that KIOSK_BUILD.md.md and the no-dash more30fixesandfeatures.md/more30priority.md are exact or near duplicates of already-tracked files — left alone, no action needed. Still untracked (~140 items, not touched this step): binary .docx specs, old run-loop .cmd scripts (v3-v8, superseded by RUN_INSTRUCTIONS.md), historical QA evidence (_commit-msg.txt files, screenshots), vfix.mjs, gannenet-incoming/.',
  now()
);
