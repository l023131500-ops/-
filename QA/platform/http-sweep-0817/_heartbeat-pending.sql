-- Supabase MCP not connected this session (0 mcp__supabase__* tools available via ToolSearch).
-- Run this insert once a session with the MCP connected picks up the queue,
-- in git-log commit order relative to any other _heartbeat-pending.sql files.
insert into core.run_progress (phase, task, status, note)
values (
  'platform',
  'http-sweep-0817',
  'done',
  'סבב עצמאי נוסף על fix/nadlan-a11y, זווית לא-נבדקת: HTTP HEAD ישיר (לא Playwright) על שורש כל 24 המערכות החיות ' ||
  'לפי טבלת SYSTEMS_STATUS.md. תוצאה: 24/24 בריאים — 200 או 30x צפוי (trailing-slash של Next.js, או /auth תואם לתיעוד עבור crm/gesher). ' ||
  '0 חדשים, 0 סטייה מהתיעוד. Supabase MCP ו-Lovable MCP עדיין לא מחוברים בסשן הזה. ' ||
  'אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות: QA/platform/http-sweep-0817/_results.md.'
);
