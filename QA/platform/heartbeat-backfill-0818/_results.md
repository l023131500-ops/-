# Heartbeat backlog reconciliation (0818)

## What was found

Session start: read RUN_INSTRUCTIONS.md, checked `core.run_progress` (last row
`tivuch-round4-functional-0818`, which closed the round-4 functional sweep and
left the choice of next step open) and git log on `fix/nadlan-a11y` (HEAD
`4764057`). Rather than starting a new round, looked for unfinished work first.

`git log --reverse --oneline --grep="heartbeat: pending row"` on this branch
found 44 commits, each a placeholder written by a session that made a real
change but could not reach the Supabase MCP to insert the row — e.g.
`749a125 heartbeat: pending row for nadlan-dark-recheck-0818 (1f0554c)`. Every
placeholder names the real commit it stands in for. 20 of the 44 had already
been backfilled by earlier sessions (verified in core.run_progress).

## What was done

With the Supabase MCP available this session, inserted the 24 still-missing
rows into `core.run_progress` (ids 904–927), one per remaining placeholder
commit, `phase='backfill'`, `status='done'`, `at` set to the target commit's
actual committer timestamp (not now — so ordering in the table matches commit
order, per the standing rule: run heartbeats in commit order or a later
measurement dates an earlier deploy). Each note cites the real commit hash and
a one-line summary of what that commit did (mostly the 17/08 Lighthouse/a11y
first-measurement sweep and Google-Fonts render-blocking perf fixes; a few
docs/anti-drift syncs).

Two commits shared the literal placeholder text "untracked-specs-0817"
(`06ec1b3` and `91bc2f9`, different dates/content) — inserted as
`untracked-specs-0817` and `untracked-specs-0817c` (a third, `032e50c`, was
already in the table as `untracked-specs-0817b`) to keep task names unique
while keeping both hashes traceable in their notes.

No app code changed, no protected system touched
(08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 untouched) — this step only
read git history and wrote rows to `core.run_progress` (this project's own
schema).

## What's still open (not done this step, flagged for next time)

- An uncommitted, untracked file `QA/platform/_commit-msg-heartbeat-reconcile-10-0818.txt`
  claims a *separate* reconciliation of 5 more tasks (`mechiron-admin-gate-recheck-0817`,
  `vercel-quota-recheck-0817`, `nadlan-kesef-footer-recheck-0817`,
  `source-fixes-deploy-recheck-0817`, `brand-audit-recheck-0817`) against a
  different queue (`_heartbeat-pending.sql`/`.md` files, not commit-message
  markers) claiming "~66 pending files still queued". None of those 5 task
  names exist in `core.run_progress` yet, and none of the 44 commit-message
  markers handled here match them either — this is a different backlog that
  needs its own investigation (most of the `.sql`/`.md` marker files it refers
  to are no longer in the working tree, so the ~71/~66 count could not be
  re-derived in this step). Only 2 marker files remain on disk
  (`QA/platform/smel-lh-fontfix-0817/_status-heartbeat-pending.sql`,
  `QA/platform/tamlul-service-key-fix-0818/_heartbeat-pending.md`), and both
  already have rows now (via this step's backfill). Left for a follow-up step.
- The repo also has a large amount of untracked QA evidence from 08/06–08/17
  (screenshots, `_commit-msg.txt` files) that was never git-added by the
  sessions that produced it. Not touched this step — out of scope for a single
  ~20-minute step, flagged here rather than bulk-added blind.
