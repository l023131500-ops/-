-- heartbeat queued because the Supabase MCP is not connected to this session.
-- Insert AFTER _heartbeat-pending.sql and _heartbeat-pending-2.sql in this same folder (run in commit order).
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '31 גשר — §8ב נחיתה בתוך המוצר אחרי כניסה',
  'done',
  'NEEDS_USER.md §0א״ סימן "31 גשר עדיין לא נבדק" אחרי ש-21 מתחברים ו-30 CRM זכויות נבדקו. נבדק ב-Playwright מול הייצור: more30.com/gesher -> הפניה אוטומטית ל-/gesher/auth (מסך כניסה עצמאי, פרויקט Supabase נפרד ygaqqnuyfnumezxxmtbh) -> התחברות עם test@more30.com -> נחיתה ב-/gesher/client/status, מסך לקוח אמיתי ("שלום, לקוח בדיקה", ציר התקדמות בדיקה בן שלושה שלבים, תיק מסמכים מאובטח, תפריט צד מלא). 0 שגיאות/אזהרות קונסולה. שלושתן (21/30/31) נמדדו עכשיו וסוגרות את הפער. לא נבדק כאן: פאנל הניהול של גשר, חסום בנפרד על SUPABASE_SERVICE_ROLE_KEY חסר (NEEDS_USER §0י׳). אין שינוי קוד, אין פריסה - מדידה בלבד. ראיות: QA/platform/post-confirm-landing-0817/.'
);
