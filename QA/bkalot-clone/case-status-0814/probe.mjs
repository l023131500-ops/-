// 0071 — «פנייה שהופק לה מסמך אינה חדשה» נמדד מעל HTTP על הכתובות החיות.
//
// הנתונים נוצרים דרך נתיב הקליטה הציבורי (bkalot-clone-intake, מפתח anon
// מהטופס) ולא בהזרקה למסד, והסטטוס נקרא בחזרה דרך /case ו-/cases של מסך
// הניהול — כלומר דרך אותו נתיב בדיוק שהדפדפן קורא בו.
//
// ארבע פניות, ארבעה טלפונים שונים (intake מאתר איש קשר לפי טלפון):
//   A — נקלטת ואינה מופקת            → חייבת להישאר 'new'
//   B — נקלטת ומופק לה מסמך          → 'new' → 'in_progress'
//   C — נסגרת ידנית ואז מופק לה מסמך → חייבת להישאר 'closed' (הפרדיקט)
//   D — מופקת, נכנסת לתור ומעובדת    → 'in_progress' ולא 'sent'
//
// שלב 1 (stage=1): קליטה + קריאת הסטטוס ההתחלתי של כל הארבע.
// בין השלבים: C נסגרת ידנית ב-SQL — אין עדיין נתיב ניהול שמשנה סטטוס, וזה
// קו פתוח מוכרז ולא ממצא של הפעימה הזו.
// שלב 2 (stage=2): הפקה/תור/עיבוד + קריאת הסטטוס הסופי + מסנן הרשימה.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const stage = process.argv[2] || "1";
const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const dir = "C:/Users/USER/Downloads/more30/QA/bkalot-clone/case-status-0814/";
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

const login = await post(ADMIN + "/login", { email: "qa0075@more30.com", password: "Qa0075!probe" });
say(`login http=${login.status} ok=${login.body.ok}`);
const T = { "x-admin-token": login.body.token };

// הסטטוס נקרא דרך מסך הפנייה ולא דרך המסד: זה מה שהמשתמש רואה.
// המפתח הוא id ולא case_id — נתיב /case מקבל מזהה מספרי בשם id (index.ts).
async function statusOf(id) {
  const r = await post(ADMIN + "/case", { id }, T);
  return r.body?.case?.status ?? r.body?.status ?? JSON.stringify(r.body).slice(0, 120);
}

if (stage === "1") {
  const cases = [
    ["A", { kind: "treatment", source: "form", full_name: "אביגיל בדיקה", phone: "0500075001",
            email: "qa.bkalot@more30.com", note: "נקלטת ואינה מופקת", consent: "true", situation: "disability" }],
    ["B", { kind: "treatment", source: "form", full_name: "בתיה בדיקה", phone: "0500075002",
            email: "qa.bkalot@more30.com", note: "מופק לה מסמך", consent: "true", situation: "disability" }],
    ["C", { kind: "treatment", source: "form", full_name: "גילה בדיקה", phone: "0500075003",
            email: "qa.bkalot@more30.com", note: "נסגרת ואז מופק לה מסמך", consent: "true", situation: "disability" }],
    ["D", { kind: "treatment", source: "form", full_name: "דינה בדיקה", phone: "0500075004",
            email: "qa.bkalot@more30.com", note: "מופקת, בתור, ומעובדת", consent: "true", situation: "disability" }],
  ];
  const ids = {};
  for (const [tag, body] of cases) {
    const r = await post(INTAKE, body);
    ids[tag] = r.body.case_id;
    say(`${tag} intake http=${r.status} ok=${r.body.ok} case=${r.body.case_id} rights=${r.body.rights_count}`);
  }
  for (const tag of ["A", "B", "C", "D"]) say(`${tag} status-after-intake = ${await statusOf(ids[tag])}`);
  say(`CASE_IDS ${JSON.stringify(ids)}`);
  writeFileSync(dir + "ids.json", JSON.stringify(ids), "utf8");
  writeFileSync(dir + "probe-out.txt", out.join("\n") + "\n", "utf8");
} else {
  const ids = JSON.parse(readFileSync(dir + "ids.json", "utf8"));
  say("");
  say("── שלב 2 ──");
  for (const tag of ["A", "B", "C", "D"]) say(`${tag} status-before-render = ${await statusOf(ids[tag])}`);

  // A אינה מופקת בכוונה — היא הבקרה שמוכיחה שהטריגר תלוי במסמך ולא בזמן.
  for (const tag of ["B", "C", "D"]) {
    const r = await post(ADMIN + "/render", { case_id: ids[tag] }, T);
    say(`${tag} render http=${r.status} doc=${r.body.document_id} chars=${r.body.text_chars} → status=${await statusOf(ids[tag])}`);
    if (tag === "D") {
      const q = await post(ADMIN + "/queue", { document_id: r.body.document_id }, T);
      say(`D queue=${q.body.queue_id} status=${q.body.status} mode=${q.body.mode} to=${q.body.to_address} → case status=${await statusOf(ids[tag])}`);
      const d = await post(ADMIN + "/dispatch", { queue_id: q.body.queue_id }, T);
      say(`D dispatch ok=${d.body.ok} qstatus=${d.body.status} outcome=${d.body.outcome} mode=${d.body.mode} bytes=${d.body.content_bytes} sent_for_real=${d.body.sent_for_real}`);
      say(`D status-after-dispatch = ${await statusOf(ids[tag])}   ← חייב להיות in_progress ולא sent`);
    }
  }
  say(`A status-final (לא הופקה) = ${await statusOf(ids.A)}`);

  // המסנן: עד 0071 הוא הציע חמישה ערכים ורק אחד מהם החזיר שורות.
  for (const st of ["", "new", "in_progress", "sent", "closed", "rejected"]) {
    const r = await post(ADMIN + "/cases", { status: st, limit: 50 }, T);
    const rows = r.body?.rows ?? r.body?.cases ?? [];
    say(`filter status=${st || "(הכול)"} http=${r.status} total=${r.body?.total} rows=${rows.length}`);
  }
  appendFileSync(dir + "probe-out.txt", out.join("\n") + "\n", "utf8");
}
