-- PENDING: Supabase MCP was not connected during this run (2026-08-19).
-- Insert this row FIRST, before inferring what's already done from later
-- heartbeats -- `at` is NOT the actual run time, it is a placeholder for
-- whoever applies this file. Actual work time: 2026-08-19 ~08:20 local.
insert into core.run_progress (phase, task, status, note, at)
values (
  'systems-sweep',
  '18 orech (torah-editor)',
  'done',
  'Finished a prior session''s uncommitted work: added a "הורד כ-PDF" button '
  || 'in the editor (apps/18-torah-editor-mvp/app/editor/page.tsx), same '
  || 'window.print() styled-print pattern already live in mechiron(27)/'
  || 'kupot(28)/chizukim(17), no new dependency. Additive only -- existing '
  || '.txt download, autosave, citation-detect, nikud flows unchanged. '
  || 'Verified: next build clean (11 pages); committed 7e67cf3 on '
  || 'feat/graphics-upgrade, pushed; deployed prod via vercel deploy from '
  || 'apps/18-torah-editor-mvp (dpl_3vVx9ut34wtigqkqsu8X8m3U1wXP, aliased '
  || 'orech-more30.vercel.app); confirmed live at more30.com/orech/editor '
  || '-- fetched the served JS chunk (page-4f8871c817130591.js) and it '
  || 'contains the PDF button text, Frank Ruhl Libre font-family and '
  || 'window.print() call. Playwright MCP browser was locked by a '
  || 'concurrent session so verification used a direct HTTP fetch of the '
  || 'built bundle instead of a screenshot.',
  now()
);
