// שורת ההיסטוריה של 0097 נכתבה לפני שתוקנה שורת ה-revoke, ולכן הטקסט השמור בה
// הוא הגרסה שהשאירה ל-anon הרשאת הרצה. כאן הוא מוחלף בקובץ כפי שהוא עכשיו.
//
// למה זה נחוץ ואינו קוסמטי: מי שיקרא את ההיסטוריה כדי לדעת מה רץ — וזו בדיוק
// השאלה של תקלת migration-file-may-never-have-run — היה מקבל טקסט שאינו מתאר
// את המצב שנמדד במסד. ה-DDL עצמו אינו רץ שוב; רק הטקסט השמור מתעדכן.
//
// ⚠️ המצב במסד כבר נכון (proacl = {postgres=X/postgres,service_role=X/postgres},
// נמדד) — התיקון הגיע ב-revoke נפרד. מה שמתעדכן כאן הוא התיעוד בלבד.
import { readFileSync } from "node:fs";

const REF = "uhnrgujbdxhhmoxcjria";
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
if (!PAT) throw new Error("SUPABASE_ACCESS_TOKEN חסר בסביבה");

const FILE =
  "C:/Users/USER/Downloads/more30/supabase/migrations/" +
  "0097_the_case_screen_does_not_say_which_reason_matched.sql";
const NAME = "0097_the_case_screen_does_not_say_which_reason_matched";

const sql = readFileSync(FILE, "utf8");
if (sql.includes("$mig0097$")) throw new Error("התג מופיע בתוך הקובץ");

const query =
  "update supabase_migrations.schema_migrations\n" +
  `   set statements = array[$mig0097$${sql}$mig0097$]\n` +
  ` where name = $mig0097$${NAME}$mig0097$;\n`;

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { authorization: "Bearer " + PAT, "content-type": "application/json" },
  body: JSON.stringify({ query }),
});
console.log(JSON.stringify({ http: res.status, bytes: Buffer.byteLength(sql, "utf8"), body: (await res.text()).slice(0, 300) }));
if (!res.ok) process.exitCode = 1;
