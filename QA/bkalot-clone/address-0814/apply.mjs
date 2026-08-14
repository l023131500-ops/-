// מריץ את המיגרציה בייצור דרך Management API, ורושם אותה ב-
// supabase_migrations.schema_migrations — הלקח של 0059 (קובץ מיגרציה יכול
// לשבת כתוב ולא-מורץ בלי שום סימפטום).
// הטוקן מגיע מ-env ולא מהקובץ: process.env.SUPABASE_ACCESS_TOKEN.
import { readFileSync } from "node:fs";

const REF = "uhnrgujbdxhhmoxcjria";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error("SUPABASE_ACCESS_TOKEN missing"); process.exit(1); }

const FILE = process.argv[2];
const VERSION = process.argv[3]; // YYYYMMDDHHMMSS
const sql = readFileSync(FILE, "utf8");
console.log("file chars:", sql.length);

async function q(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + TOKEN },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  return { status: res.status, text };
}

const r = await q(sql);
console.log("migration:", r.status, r.text.slice(0, 800));
if (r.status !== 200 && r.status !== 201) process.exit(2);

const name = FILE.split(/[\\/]/).pop().replace(/^\d+_/, "").replace(/\.sql$/, "");
const r2 = await q(
  `insert into supabase_migrations.schema_migrations (version, name)
   values ('${VERSION}', '${name}')
   on conflict (version) do nothing
   returning version, name;`
);
console.log("registered:", r2.status, r2.text.slice(0, 400));
