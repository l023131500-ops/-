// נתוני הבדיקה לפריסה — נוצרים דרך נתיב הקליטה האמיתי מעל HTTP ולא בהזרקה למסד.
// שתי הפניות הראשונות באותו טלפון בכוונה: bkalot_clone_intake מאתר איש קשר לפי
// טלפון בלבד ודורס את המייל שלו, וזה בדיוק מה שמדליק את contact_email_differs
// בפנייה הראשונה — האזהרה שהצעד הזה אמור להראות בייצור.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";

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

const P1 = "0500071001";  // A ו-B חולקים אותו — הדריסה
const P3 = "0500071003";

// A — יעד ברשימת הבדיקה. אחרי B המייל של איש הקשר כבר לא יהיה זה.
const a = await post(INTAKE, {
  kind: "treatment", source: "form", full_name: "אורית בדיקה", phone: P1,
  email: "qa.bkalot@more30.com", note: "בדיקת פריסת עמודת התור", consent: "true", situation: "disability",
});
say(`A intake ${a.status} case=${a.body.case_id} contact=${a.body.contact_id}`);

// B — אותו טלפון, מייל אחר: דורס את איש הקשר, ויעדו אינו ברשימת הבדיקה → blocked
const b = await post(INTAKE, {
  kind: "treatment", source: "form", full_name: "אורית בדיקה", phone: P1,
  email: "later.overwrite.0071@more30.com", note: "פנייה שנייה מאותו טלפון", consent: "true", situation: "disability",
});
say(`B intake ${b.status} case=${b.body.case_id} contact=${b.body.contact_id}`);

// C — מידע בלי מייל: to_email null, differs null (ולא false), אין מסמכים
const c = await post(INTAKE, {
  kind: "info", source: "form", full_name: "גדי בדיקה", phone: P3, email: "", note: "", consent: "true",
});
say(`C intake ${c.status} case=${c.body.case_id} contact=${c.body.contact_id}`);

const login = await post(ADMIN + "/login", { email: "qa0071@more30.com", password: "Qa0071!probe" });
say(`login ${login.status} ok=${login.body.ok}`);
const T = { "x-admin-token": login.body.token };

// A ו-B מופקים ונכנסים לתור מראש, כדי שהעמודה תציג משהו בטעינת המסך —
// זה בדיוק מה ש-0069 הוסיפה ומה שהמסך לא הציג עד c3338c5.
for (const [tag, res] of [["A", a], ["B", b]]) {
  const r = await post(ADMIN + "/render", { case_id: res.body.case_id }, T);
  const q = await post(ADMIN + "/queue", { document_id: r.body.document_id }, T);
  say(`${tag} render doc=${r.body.document_id} chars=${r.body.text_chars} rights=${r.body.rights_count} | queue=${q.body.queue_id} status=${q.body.status} mode=${q.body.mode} to=${q.body.to_address}`);
}

say(`CASE_IDS A=${a.body.case_id} B=${b.body.case_id} C=${c.body.case_id}`);
writeFileSync("C:/Users/USER/Downloads/more30/QA/bkalot-clone/queue-column-deploy-0814/seed-out.txt", out.join("\n") + "\n", "utf8");
