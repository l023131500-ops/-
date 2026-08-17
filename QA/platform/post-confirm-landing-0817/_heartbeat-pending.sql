-- heartbeat queued because the Supabase MCP is not connected to this session.
-- Run in git-commit order (append after the existing queue).
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '21 מתחברים — §8ב נחיתה בתוך המוצר אחרי כניסה',
  'done',
  'NEEDS_USER.md §0א″ סימן "מה קורה אחרי אישור המייל (§8ב) לא נבדק על 21/30/31" כפער מדידה פתוח. נבדק ב-Playwright מול הייצור: more30.com/mthbram -> כניסה -> more30.com/login -> התחברות עם test@more30.com -> חזרה מדויקת ל-/mthbram/. הכפתור התחלף ל-"לקוח", תפריט "מחובר כ־לקוח בדיקה" (האזור האישי/שדרוג לפרימיום/יציאה), עמוד המוצר נשאר זמין מתחתיו. 0 שגיאות קונסולה. זו הזרימה המשותפת (auth-button.js), לא מסך ההתחברות העצמאי של הפרויקט הפרטי aypsqqvfohekxxuqsmrw שלא אותר לו נתיב UI נפרד. 30 CRM זכויות ו-31 גשר עדיין לא נבדקו. אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות: QA/platform/post-confirm-landing-0817/.'
);
