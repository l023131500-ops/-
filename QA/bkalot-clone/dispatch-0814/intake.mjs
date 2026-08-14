// נתוני הבדיקה נוצרים דרך נתיב הקליטה האמיתי מעל HTTP (functions/v1/bkalot-clone-intake,
// מפתח anon מהטופס הציבורי) ולא בהזרקה למסד. שלוש פניות, שלושה טלפונים שונים:
// A ו-C יעד ברשימת הבדיקה, B יעד שאינו ברשימה (נכנס לתור כ-blocked כבר ב-0067).
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";

const out = [];
const say = (s) => { out.push(s); console.log(s); };

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify(body),
  });
  let j = null;
  try { j = await r.json(); } catch { j = { parse_error: true }; }
  return { status: r.status, body: j };
}

const cases = [
  ["A", { kind: "treatment", source: "form", full_name: "רונית בדיקה", phone: "0500072001",
          email: "qa.bkalot@more30.com", note: "בדיקת המעבד", consent: "true", situation: "disability" }],
  ["B", { kind: "treatment", source: "form", full_name: "יעל בדיקה", phone: "0500072002",
          email: "qa.blocked.0072@more30.com", note: "יעד שאינו ברשימה", consent: "true", situation: "disability" }],
  ["C", { kind: "treatment", source: "form", full_name: "דוד בדיקה", phone: "0500072003",
          email: "qa.bkalot@more30.com", note: "היעד יוסר לפני העיבוד", consent: "true", situation: "disability" }],
];

const ids = [];
for (const [tag, body] of cases) {
  const r = await post(INTAKE, body);
  say(`${tag} intake http=${r.status} ok=${r.body.ok} case=${r.body.case_id} contact=${r.body.contact_id} rights=${r.body.rights_count}`);
  ids.push(`${tag}=${r.body.case_id}`);
}
say(`CASE_IDS ${ids.join(" ")}`);

writeFileSync("C:/Users/USER/Downloads/more30/QA/bkalot-clone/dispatch-0814/intake-out.txt", out.join("\n") + "\n", "utf8");
