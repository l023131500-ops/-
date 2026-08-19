// נתוני הבדיקה נוצרים דרך נתיב הקליטה האמיתי מעל HTTP (bkalot-clone-intake,
// מפתח anon מהטופס הציבורי) ולא בהזרקה למסד.
//
// שתי פניות, שני טלפונים שונים בכוונה — intake מאתר איש קשר לפי טלפון, ושתי
// פניות מאותו טלפון היו נותנות איש קשר אחד:
//   A — treatment. עליה תימדד העמודה בייצור: ברירת המחדל שלה היא המכתב עם
//       רשימת הזכויות, ולכן «מענה לפנייה כללית» בשורה הוא ערך שברירת המחדל
//       אינה יכולה להפיק עליה בשום מצב.
//   B — הבקרה. לא נוגעים בה כלל, והיא חייבת להישאר בלי ולו מסמך אחד.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";
const INTAKE = BASE + "/bkalot-clone-intake";

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
  ["A", { kind: "treatment", source: "form", full_name: "חנה בדיקה", phone: "0500076101",
          email: "qa.bkalot@more30.com", note: "הפנייה שעמודת המכתב תימדד עליה בייצור", consent: "true", situation: "disability" }],
  ["B", { kind: "treatment", source: "form", full_name: "יעל בדיקה", phone: "0500076102",
          email: "qa.bkalot@more30.com", note: "בקרה — לא נוגעים בה", consent: "true", situation: "disability" }],
];

const ids = {};
for (const [tag, body] of cases) {
  const r = await post(INTAKE, body);
  ids[tag] = r.body.case_id;
  say(`${tag} intake http=${r.status} ok=${r.body.ok} kind=${body.kind} case=${r.body.case_id} contact=${r.body.contact_id} rights=${r.body.rights_count}`);
}

say(`CASE_IDS A=${ids.A} B=${ids.B}`);
writeFileSync("C:/Users/USER/Downloads/more30/QA/bkalot-clone/doc-template-col-deploy-0814/seed-out.txt", out.join("\n") + "\n", "utf8");
