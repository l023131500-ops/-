-- Heartbeat for this step. NOT applied: the Supabase MCP server is not connected
-- in this session, and the anon key in `portal/.env.local` cannot substitute —
-- PostgREST answers 406 for the `core` schema (not exposed), on `run_progress`
-- and on `projects` alike. Left here so the row can be inserted by whoever has
-- the connection, rather than the step going unrecorded or the note being
-- invented later from the commit message.
insert into core.run_progress (phase, task, status, note) values (
  'kiosk-35',
  'dialogs-rtl-0811 — the six device dialogs read for painted order',
  'done',
  '170/170 in a real Chromium, light+dark x 390/1200, 8 dialog views, 112 token pairs. No defect: the promptUrl label''s host, the exit-code dialog''s "S/N" bullet and its two explicit isolates, and "1 מתוך 1 מאושרים" all paint in reading order. No source change, so nothing to deploy. Group B has no real match in any dialog (A 12 / B 0 / C 100) and is now proven by a control row instead of an assertion that was not true. Open: clientModal, confirmDeleteClient and the three admin dialogs are still unwalked.'
);
