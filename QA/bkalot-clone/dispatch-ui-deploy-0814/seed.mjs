// נתוני הבדיקה נוצרים דרך נתיב הקליטה האמיתי מעל HTTP (bkalot-clone-intake,
// מפתח anon מהטופס הציבורי) ולא בהזרקה למסד.
//
// שלוש פניות, שלושה טלפונים שונים — שלושת המצבים שהכפתור «עבד עכשיו» צריך
// להבחין ביניהם, והפעם על הכתובת החיה ולא על שרת מקומי:
//   A — יעד ברשימת הבדיקה, מופק ונכנס לתור  → queued, הכפתור פעיל
//   B — יעד שאינו ברשימה, מופק ונכנס לתור   → blocked, הכפתור כבוי
//   C — מופק ואינו נכנס לתור                → אין שורה, הכפתור כבוי
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";
const INTAKE = BASE + "/bkalot-clone-intake";
const ADMIN = BASE + "/bkalot-clone-admin";

const out = [];
const say = (s) => { out.push(s); console.log(s); };

async function post(url, body, extra = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  let j = null;
  try { j = await r.json(); } catch { j = { parse_error: true }; }
  return { status: r.status, body: j };
}

const cases = [
  ["A", { kind: "treatment", source: "form", full_name: "מרים בדיקה", phone: "0500074001",
          email: "qa.bkalot@more30.com", note: "השורה שתעובד מהמסך החי", consent: "true", situation: "disability" }],
  ["B", { kind: "treatment", source: "form", full_name: "נעמי בדיקה", phone: "0500074002",
          email: "qa.blocked.0074@more30.com", note: "יעד שאינו ברשימה", consent: "true", situation: "disability" }],
  ["C", { kind: "treatment", source: "form", full_name: "שרה בדיקה", phone: "0500074003",
          email: "qa.bkalot@more30.com", note: "מופק ולא נכנס לתור", consent: "true", situation: "disability" }],
];

const ids = {};
for (const [tag, body] of cases) {
  const r = await post(INTAKE, body);
  ids[tag] = r.body.case_id;
  say(`${tag} intake http=${r.status} ok=${r.body.ok} case=${r.body.case_id} contact=${r.body.contact_id} rights=${r.body.rights_count}`);
}

const login = await post(ADMIN + "/login", { email: "qa0074@more30.com", password: "Qa0074!probe" });
say(`login ${login.status} ok=${login.body.ok}`);
const T = { "x-admin-token": login.body.token };

for (const tag of ["A", "B", "C"]) {
  const r = await post(ADMIN + "/render", { case_id: ids[tag] }, T);
  if (tag === "C") { say(`C render doc=${r.body.document_id} chars=${r.body.text_chars} | לא הוכנס לתור בכוונה`); continue; }
  const q = await post(ADMIN + "/queue", { document_id: r.body.document_id }, T);
  say(`${tag} render doc=${r.body.document_id} chars=${r.body.text_chars} | queue=${q.body.queue_id} status=${q.body.status} mode=${q.body.mode} to=${q.body.to_address}`);
}

say(`CASE_IDS A=${ids.A} B=${ids.B} C=${ids.C}`);
writeFileSync("C:/Users/USER/Downloads/more30/QA/bkalot-clone/dispatch-ui-deploy-0814/seed-out.txt", out.join("\n") + "\n", "utf8");
