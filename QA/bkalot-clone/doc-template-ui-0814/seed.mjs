// נתוני הבדיקה נוצרים דרך נתיב הקליטה האמיתי מעל HTTP (bkalot-clone-intake,
// מפתח anon מהטופס הציבורי) ולא בהזרקה למסד.
//
// שתי פניות, שני טלפונים שונים בכוונה — intake מאתר איש קשר לפי טלפון, ושתי
// פניות מאותו טלפון היו נותנות איש קשר אחד. A היא זו שנבדקת, B היא הבקרה שלא
// נוגעים בה כלל: היא נשארת בלי מסמך, ולכן טבלת המסמכים אצלה אינה קיימת בכלל.
//
// A היא treatment בכוונה — כלומר ברירת המחדל שלה היא rights_treatment_reply,
// ולכן הפקה מפורשת ב-general_inquiry_reply מציבה בשורה שם מכתב שברירת המחדל
// אינה יכולה להפיק על הפנייה הזו בשום מצב.
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
  ["A", { kind: "treatment", source: "form", full_name: "\u05d7\u05e0\u05d4 \u05d1\u05d3\u05d9\u05e7\u05ea 0076", phone: "0500076101",
          email: "qa.bkalot@more30.com", note: "\u05e9\u05d5\u05e8\u05ea \u05d4\u05de\u05e1\u05de\u05da \u05d0\u05de\u05d5\u05e8\u05d4 \u05dc\u05d5\u05de\u05e8 \u05d0\u05d9\u05d6\u05d4 \u05de\u05db\u05ea\u05d1 \u05d9\u05d5\u05e9\u05d1 \u05d1\u05d4", consent: "true", situation: "disability" }],
  ["B", { kind: "info", source: "form", full_name: "\u05d3\u05d1\u05d5\u05e8\u05d4 \u05d1\u05e7\u05e8\u05d4 0076", phone: "0500076102",
          email: "qa.bkalot@more30.com", note: "\u05d1\u05e7\u05e8\u05d4 \u2014 \u05dc\u05d0 \u05e0\u05d5\u05d2\u05e2\u05d9\u05dd \u05d1\u05d4", consent: "true", situation: "disability" }],
];

const ids = {};
for (const [tag, body] of cases) {
  const r = await post(INTAKE, body);
  ids[tag] = r.body.case_id;
  say(`${tag} intake http=${r.status} ok=${r.body.ok} kind=${body.kind} case=${r.body.case_id} contact=${r.body.contact_id} rights=${r.body.rights_count}`);
}

say(`CASE_IDS A=${ids.A} B=${ids.B}`);
writeFileSync("C:/Users/USER/Downloads/more30/QA/bkalot-clone/doc-template-ui-0814/seed-out.txt", out.join("\n") + "\n", "utf8");
