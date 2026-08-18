-- Heartbeat for this step. NOT applied: the Supabase MCP was still
-- "connecting" (never became available) this session, same case documented
-- in heartbeats-queued-as-files.md. Queued here so the row can be entered
-- by whoever has the connection. Run in commit order along with any other
-- pending *_heartbeat*.sql files -- find them with
-- `git ls-files -- "*_heartbeat*.sql"` and order by
-- `git log --oneline --reverse -- "*_heartbeat*.sql"`, not by id guesswork.
insert into core.run_progress (phase, task, status, note) values (
  'orech-18',
  'export-0819 -- add copy-to-clipboard + download-as-.txt to the /orech/editor toolbar',
  'done',
  'Direct continuation of the tamlul (02) export step (commit 54a59bd):
more30-feature-expansion.md flagged 18-orech as the transcript/editor app
with zero export path, and the previous session identified the full text
was already sitting in editor page.tsx client state, just needing the
same two buttons tamlul got. Added copyText() (navigator.clipboard) and
downloadTxt() (client-side Blob, filename from docTitle or titleFrom()
fallback) next to the existing "detect citations" / "add nikud" toolbar
buttons in apps/18-torah-editor-mvp/app/editor/page.tsx. Purely additive:
no new API route, no DB change, citation detection / nikud / autosave /
document-loading flows untouched. Verified: tsc --noEmit clean, next
build succeeds (11/11 routes, /editor route shape unchanged). Deployed
vercel deploy --prod to orech-more30 (prj_9FxRiF4Pl3DnjvKSfgOymUxHJgdp),
dpl_9t1KpGww3X2EHdedw79N4tzK8YBR READY, aliased. Live-verified with a
cache-buster on more30.com/orech/editor: 200, both new button strings
present in the served HTML, and the pre-existing citation/nikud/doc-hint
strings are unchanged. Commit f624b12, pushed to fix/nadlan-a11y.'
);
