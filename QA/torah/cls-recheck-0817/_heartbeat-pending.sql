-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), and no SUPABASE_ACCESS_TOKEN/SB_PAT
-- is set in process, user or machine scope, so the Management API bootstrap
-- is out too (heartbeat-needs-mcp-anon-key-cannot). core.run_progress is not
-- reachable from here by any route.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list and run order) — run all pending files in git-log commit order,
-- not folder-name order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift sweep — SYSTEMS_STATUS.md "מה נשאר לתקן": 01 torah "CLS 0.578 חי כרגע" נבדק מחדש (רישום)',
$$cls-recheck-0817 — אין שינוי קוד. הרצת scripts/qa/lighthouse-run.mjs מחדש
נגד https://more30.com/torah (אותו כלי שכתב את המספר המקורי) הראתה
cls: "0.001" — בדיוק הערך שקדם לרגרסיה מ-03/08, לא ה-0.578 שהרשומה בטבלת
"מה נשאר לתקן" טענה שעדיין חי (perf 63, fcp 2.1s, lcp 5.3s, tbt 510ms).
לא נחקר מתי בין 03/08 לעכשיו זה תוקן — רק שהוא סגור עכשיו. LCP 5.3s ו-TBT
510ms נשארים בעיה פתוחה (ארכיטקטונית, דורשת SSR מלא) — רק שורת ה-CLS
הועברה לטבלה עם קו חוצה. עודכן SYSTEMS_STATUS.md: רשומה חדשה בראש הקובץ +
קו חוצה על חלק שורת הטבלה של 01 torah. זה הפער השישי מסוג הזה שנמצא מיושן
ב-17/08.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס שורות
נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/torah/cls-recheck-0817/_lighthouse.json.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: re-measured a
stale "01 torah — CLS 0.578 live now, fix built and awaiting deploy" claim
in SYSTEMS_STATUS.md's remaining-work table against current production.
scripts/qa/lighthouse-run.mjs against /torah found cls: "0.001" — the gap is
not currently active, no deploy needed. LCP 5.3s/TBT 510ms remain open
(architectural, needs full SSR) — only the CLS line was struck through. No
code change; SYSTEMS_STATUS.md corrected (new dated entry + struck-through
table cell). Joins the pending-heartbeat queue; run in commit order.$$
);
