// 0070 — נתוני בדיקה לעמודת התור במסך הפנייה.
// הכל נוצר דרך נתיב הקליטה האמיתי מעל HTTP ולא בהזרקה למסד.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";

const out = [];
const say = (s) => { out.push(s); };

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

const P1 = "0500070001";
const P3 = "0500070003";

// A — יעד ברשימת הבדיקה
const a = await post(INTAKE, {
  kind: "treatment", source: "form", full_name: "אורית בדיקה", phone: P1,
  email: "qa.bkalot@more30.com", note: "בדיקת עמודת תור", consent: "true", situation: "disability",
});
say(`A intake ${a.status} ${JSON.stringify(a.body)}`);

// B — אותו טלפון, מייל אחר (דורס את איש הקשר), יעד שאינו ברשימה
const b = await post(INTAKE, {
  kind: "treatment", source: "form", full_name: "אורית בדיקה", phone: P1,
  email: "later.overwrite.0070@more30.com", note: "פנייה שנייה מאותו טלפון", consent: "true", situation: "disability",
});
say(`B intake ${b.status} ${JSON.stringify(b.body)}`);

// C — מידע בלי מייל: to_email null, differs null, אין מסמכים
const c = await post(INTAKE, {
  kind: "info", source: "form", full_name: "גדי בדיקה", phone: P3, email: "", note: "", consent: "true",
});
say(`C intake ${c.status} ${JSON.stringify(c.body)}`);

// כניסת ניהול
const login = await post(ADMIN + "/login", { email: "qa0070@more30.com", password: "Qa0070!probe" });
say(`login ${login.status} ok=${login.body.ok} admin=${JSON.stringify(login.body.admin)}`);
const T = { "x-admin-token": login.body.token };

for (const [tag, res] of [["A", a], ["B", b]]) {
  const id = res.body.case_id;
  const r = await post(ADMIN + "/render", { case_id: id }, T);
  say(`${tag} render case=${id} ${r.status} doc=${r.body.document_id} chars=${r.body.text_chars} rights=${r.body.rights_count}`);
  const q = await post(ADMIN + "/queue", { document_id: r.body.document_id }, T);
  say(`${tag} queue doc=${r.body.document_id} ${q.status} ${JSON.stringify(q.body)}`);
}

// הקריאה שהמסך עושה בטעינה — מה שהעמודה החדשה אמורה להציג
for (const [tag, res] of [["A", a], ["B", b], ["C", c]]) {
  const k = await post(ADMIN + "/case", { id: res.body.case_id }, T);
  const cc = k.body.case || {};
  say(`${tag} case=${res.body.case_id} to_email=${cc.to_email} consent=${cc.consent} contact_email=${cc.contact?.email} differs=${cc.contact_email_differs} docs=${JSON.stringify((k.body.documents || []).map((d) => [d.id, d.queue_id, d.queue_status, d.queue_mode, d.queue_missing]))}`);
}

say(`CASE_IDS ${a.body.case_id},${b.body.case_id},${c.body.case_id}`);
writeFileSync("C:/Users/USER/Downloads/more30/QA/bkalot-clone/queue-column-0814/probe-out.txt", out.join("\n") + "\n", "utf8");
console.log(out.join("\n"));
