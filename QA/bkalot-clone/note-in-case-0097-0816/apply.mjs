// החלת 0097 דרך Management API, ולא בהדבקה של ה-SQL לתוך קריאת כלי.
//
// למה כך ולא apply_migration של ה-MCP: שם ה-SQL נמסר כטקסט שהוקלד מחדש, ולכן
// מה שרץ במסד יכול להיות דומה לקובץ ולא זהה לו — והקובץ הוא מה שנכנס ל-commit.
// כאן נשלחים בייטי הקובץ עצמם, ואותם בייטים בדיוק נשמרים גם בשורת ההיסטוריה.
//
// ⚠️ שורת ההיסטוריה נכתבת באותה קריאה ובאותה עסקה כמו ה-DDL, ולא בקריאה שנייה:
// תקלת migration-file-may-never-have-run היא בדיוק המצב שבו האחת עברה והשנייה
// לא, ואז הקובץ נראה מוחל ואינו.
//
// התג של המרכאות הוא $mig0097$ ולא $$ ולא $function$ — הקובץ עצמו מכיל
// $function$ פעמיים, ותג שחוזר בתוכו היה סוגר את המחרוזת באמצע.
//
// נכתב ב-node ולא ב-PowerShell בכוונה — תקלת ps1-without-bom-parsed-as-cp1255.
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
  sql +
  "\n\ninsert into supabase_migrations.schema_migrations (version, name, statements)\n" +
  "values (to_char(now(), 'YYYYMMDDHH24MISS'), " +
  `$mig0097$${NAME}$mig0097$, array[$mig0097$${sql}$mig0097$]);\n`;

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { authorization: "Bearer " + PAT, "content-type": "application/json" },
  body: JSON.stringify({ query }),
});
const body = await res.text();
console.log(JSON.stringify({ http: res.status, bytes_sent: Buffer.byteLength(sql, "utf8"), body: body.slice(0, 400) }, null, 2));
if (!res.ok) process.exitCode = 1;
