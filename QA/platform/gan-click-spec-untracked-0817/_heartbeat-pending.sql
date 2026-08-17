-- Supabase MCP not connected this session (0 mcp__supabase__* tools available).
-- Run this insert once a session with the MCP connected picks up the queue,
-- in git-log commit order relative to any other _heartbeat-pending.sql files.
insert into core.run_progress (phase, task, status, note)
values (
  'platform',
  'gan-click-spec-untracked-0817',
  'done',
  'הוספתי לגיט את GAN_CLICK_MASTER_SPEC.docx (21KB) — היה untracked, ' ||
  'ו-GANNENET_BUILD.md (tracked, §7) מצהיר עליו כ"מקור אמת מלא". ' ||
  'בדיקת התאמה בין כל קבצי השורש ה-untracked (~40) לכל אזכור שלהם ' ||
  'מקובץ tracked לא העלתה קובץ נוסף שראוי להוסיף: more30-fixes-and-features.md ' ||
  'הוא כפילות של .txt שכבר tracked, ושאר הקבצים (NADLAN_GTM/NADLAN_PRO/' ||
  'EVENTS_BUILD/EVENTS_CAPTURE/KIOSK_INSTALL_GUIDE/CRM_.../vfix.mjs/תיקיות QA) ' ||
  'הם הפניה-עצמית בלבד או כבר נבדקו ונשללו בסבב הקודם (032e50c). ' ||
  'אין שינוי קוד, אין פריסה. commit on fix/nadlan-a11y.'
);
