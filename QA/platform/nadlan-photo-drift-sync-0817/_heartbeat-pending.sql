-- PENDING HEARTBEAT — insert this BEFORE inferring what's already done from
-- core.run_progress. The Supabase MCP was not connected in this session
-- (no mcp__supabase__* tools present), so this row could not be written live.
-- `at` below is NOT the run time — it is written late, from this file,
-- whenever the next session with MCP access picks it up. Insert in
-- git-commit order alongside any other _heartbeat-pending.sql files still
-- queued.

insert into core.run_progress (phase, task, status, note, at)
values (
  'docs',
  'NEEDS_USER.md sec 0* item 2 (nadlan building photos) stale-open sync',
  'done',
  'NEEDS_USER.md section "🔴 0*. שני דברים פתוחים מהסבב האחרון (01/08)" listed two open items. Item 2 ("nadlan building photos, NetFree swapped some again") was left looking open, but the very next section in the same file, "👁️ 0א. נדל''ן — בדיקה אחת של דקה, ושתי הכרעות (עודכן 01/08)" — written the same day — already closes it explicitly: "הפעם הדפדפן שהריץ את הבדיקה קיבל את התמונות האמיתיות... אין צורך שתבדוק את זה" (all four addresses loaded real 640x500 building photos, including the one flagged as flaky). Item 1 in the same "0*" section (system 18 orech — hub session/identity not read inside the /orech app after login) was checked and is still a real, unresolved bug — left untouched. Searched extensively this session for a fresh small actionable step first (favicon tracking list, WhatsApp link list, touch-target table, dark-mode table, plans/pricing decision items, BLOCKED.md items) — everything else found was either already synced earlier today (17/08), required the Supabase MCP (unavailable), required a user decision explicitly marked as such, or required touching a not-vendored/protected system. This anti-drift doc-only sync was the smallest genuine remaining step. No code change, no deploy, no protected system touched. Evidence: re-read of NEEDS_USER.md lines ~2354-2418 (sections 0* and 0א) confirming the item-2 claim was already resolved in-file on the same date.',
  now()
);
