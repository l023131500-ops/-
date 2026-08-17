-- heartbeat queued because the Supabase MCP is not connected to this session.
-- Insert AFTER the existing _heartbeat-pending.sql in this same folder (run in commit order).
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '30 CRM זכויות — §8ב נחיתה בתוך המוצר אחרי כניסה',
  'done',
  'NEEDS_USER.md §0א″ סימן "30/31 עדיין לא נבדקו" אחרי שנבדק 21 מתחברים. נבדק ב-Playwright מול הייצור: more30.com/crm -> הפניה אוטומטית ל-/crm/auth (מסך כניסה עצמאי, פרויקט Supabase נפרד jhbeelzvjvhnkxldqvxx) -> התחברות עם test@more30.com -> נחיתה ב-/crm/dashboard, לוח בקרה מלא עם תפריט (לקוחות/משימות/שותפים/הפניות/זכאויות/תיבת תקשורת/מסמכים/אנליטיקה/הגדרות) ונתונים אמיתיים (לקוח קיים מ-QA 12/08 בפעילות האחרונה), כפתור "לקוח בדיקה". 0 שגיאות/אזהרות קונסולה. 31 גשר עדיין לא נבדק. אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות: QA/platform/post-confirm-landing-0817/.'
);
