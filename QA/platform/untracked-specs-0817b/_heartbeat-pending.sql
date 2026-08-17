-- Supabase MCP not connected this session (0 mcp__supabase__* tools available).
-- Run this insert once a session with the MCP connected picks up the queue,
-- in git-log commit order relative to any other _heartbeat-pending.sql files.
insert into core.run_progress (phase, task, status, note)
values (
  'platform',
  'untracked-specs-0817b',
  'done',
  'הוספתי לגיט 4 מסמכי מפרט שהיו untracked אך מאוזכרים ממסמכים שכבר בגיט: ' ||
  'MASTER_PLAN.md (מאוזכר ב-NEEDS_USER.md §6), NADLAN_EXPANSION_SPEC.md ' ||
  '(מאוזכר ב-NIGHT_PROGRESS.md), GANNENET_BUILD.md (מאוזכר ב-apps/40-gannenet/STATUS.md §1ה), ' ||
  'KIOSK_BUILD.md (מאוזכר ב-apps/35-kioskfleet/STATUS.md §2). לא נכלל KIOSK_BUILD.md.md ' ||
  '(עותק כפול בשם שגוי, לא מאוזכר משום מקום) ולא KIOSK_INSTALL_GUIDE.md/EVENTS_BUILD.md ' ||
  '(לא נמצא אזכור מקובץ שכבר בגיט). אין שינוי קוד, אין פריסה. commit 032e50c on fix/nadlan-a11y.'
);
