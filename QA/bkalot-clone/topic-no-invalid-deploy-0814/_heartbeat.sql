-- APPLIED 2026-08-14 11:25:31Z as core.run_progress id=598, once the Supabase
-- MCP server was connected again. The note below records why it could not be
-- applied in the run that wrote it; it is kept as written rather than deleted,
-- so the gap between the commit and the row is visible instead of implied.
--
-- Heartbeat 598 for this step. NOT applied: the Supabase MCP server is not
-- connected in this session, and the anon key in `portal/.env.local` cannot
-- substitute — PostgREST answers 406 for the `core` schema (not exposed), on
-- `run_progress` and on `projects` alike. SUPABASE_ACCESS_TOKEN is unset in
-- process, user and machine scope, and no service-role key sits on disk, so the
-- Management API is out as a bootstrap too. Left here so the row can be inserted
-- by whoever has the connection, rather than the step going unrecorded or the
-- note being invented later from the commit message.
insert into core.run_progress (phase, task, status, note) values (
  'bkalot-clone-37',
  'topic-no-invalid-deploy-0814 — «קוד: topic_no_invalid» ירד מהמסך החי',
  'done',
  'פריסה בלבד של 1bd2ff5, בלי שינוי קוד ובלי מיגרציה; bkalot-clone-intake נשארה v1 ו-bkalot-clone-admin v7. stage-portal.ps1 ואז vercel deploy --prod --yes מ-portal/dist בלי --prebuilt: dpl_6Gmiodb7CQJAhAgQ4FPD248UDqgW, production. הטופס 29,061 → 31,400 בשתי הכתובות (עם לוכסן ובלעדיו), דלתת HTTP 2,339 = בדיוק דלתת המקור (31,164 − 28,825), דלתת NetFree נשארה 236; מסך הניהול 90,056 ודף הבית 3,517 לא זזו. ששת המסומנים 0 לפני → 6 אחרי, שני מסומני REMOVED 2 לפני → 0 אחרי, כל מסומן נספר בשתי הגרסאות לפני שנקבע. בדפדפן חי 1280x900 על הכתובת החיה: «999999999999» בהקשות מקלדת מציג עכשיו «מספר הנושא אינו תקין. תקנו ושלחו שוב.» ומתחתיה «מספר הנושא גדול מכל מספר נושא שקיים במערכת.», המיקוד על topic_no והוא aria-invalid — במקום «קוד: topic_no_invalid» ומיקוד BODY. שתי בקרות בייצור: «1-5» אפס בקשות והחסימה המוקדמת לא זזה, «7» פנייה #163 עם 42 זכויות והטופס מתאפס. שלושה צילומים, שלושה MD5 שונים, אפס הודעות בקונסולה. מצב טסט נמדד: documents=0, אפס sent_at, outbound_queue 8, delivery_log 3, טביעת אצבע 681dde58 זהה לאורך כל הריצה. התגלגל אחורה בשלוש פקודות לפי id (לא CTE) וחזר לבסיס בדיוק. מוגן לא נגע. commit 5e867c7, נדחף. אימות עצמאי חוזר (verify-live.mjs) אישר את אותם מספרים מול הכתובת החיה אחרי שהריצה המקורית הסתיימה. פתוח: החסימה המוקדמת עדיין מעבירה מחרוזת ספרות ארוכה מכפי שהעמודה מחזיקה — סיבוב מיותר ולא נתון שאובד; TOPIC_NO_MAX כבר בקובץ, וזו הפעימה הבאה.'
);
