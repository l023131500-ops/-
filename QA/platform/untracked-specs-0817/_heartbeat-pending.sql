-- heartbeat ממתין ל-core.run_progress — Supabase MCP לא היה מחובר בסשן זה (17/08/2026, ערב)
-- הרץ את זה (או מבנה שווה-ערך) בסבב הבא כשה-MCP מחובר:

insert into core.run_progress (phase, task, status, note)
values (
  'platform',
  'untracked-specs-0817',
  'done',
  'הוספתי לגיט את BKALOT_CLONE_BUILD.md ו-BKALOT_AUTOMATION_BUILD.md, שהיו untracked למרות ש-RUN_INSTRUCTIONS.md ו-more30-priority.md §5ב מפנים אליהם כקריאת-חובה/מפרט לעבודה בעדיפות #1 (שכפול בקלות). נבדק שאין סודות בתוכן לפני commit+push. שאר קבצי ה-untracked בשורש (docx, cmd loop scripts, QA evidence היסטורי) נשארו ללא טיפול בכוונה — צעד נפרד.'
);
