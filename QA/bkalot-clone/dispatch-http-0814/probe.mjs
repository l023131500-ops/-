// מדידת נתיב dispatch מעל HTTP, אחרי פריסת v5.
//
// כל מה שנמדד כאן עובר דרך הכתובת החיה של ה-edge function — לא קריאת RPC
// ולא הזרקה למסד. הפניות עצמן נוצרות דרך נתיב הקליטה הציבורי (intake) עם
// מפתח ה-anon של הטופס, בדיוק כמו משתמש אמיתי.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255,
// והעברית שבתוך המחרוזות הייתה נהרסת בזמן הפירוק ומדווחת "לא נמצא" על
// טקסט קיים.
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

// ── 00 — preflight: x-admin-token עדיין מוכרז ──────────────────────────────
// בקשה שאינה מכריזה עליו נחסמת בדפדפן, והבדיקה משורת הפקודה הייתה עוברת
// בירוק בלי לגלות את זה (#223).
{
  const r = await fetch(ADMIN + "/dispatch", {
    method: "OPTIONS",
    headers: { origin: "https://more30.com", "access-control-request-method": "POST" },
  });
  say(`[00] OPTIONS /dispatch => ${r.status} allow-headers=${r.headers.get("access-control-allow-headers")}`);
}

// ── 01 — dispatch בלי טוקן: 401 לפני שהמסד נוגע בכלום ─────────────────────
{
  const r = await post(ADMIN + "/dispatch", { queue_id: 1 });
  say(`[01] dispatch בלי x-admin-token => http=${r.status} ok=${r.body.ok} error=${r.body.error}`);
}

// ── הזהות ──────────────────────────────────────────────────────────────────
const login = await post(ADMIN + "/login", { email: "qa0072@more30.com", password: "Qa0072!probe" });
say(`[--] login => http=${login.status} ok=${login.body.ok} admin=${JSON.stringify(login.body.admin)}`);
const T = { "x-admin-token": login.body.token };

// ── 02 — טוקן פגום: 401 גם עם נתיב תקין ────────────────────────────────────
{
  const bad = login.body.token.slice(0, -1) + "Z";
  const r = await post(ADMIN + "/dispatch", { queue_id: 1 }, { "x-admin-token": bad });
  say(`[02] dispatch עם טוקן פגום => http=${r.status} ok=${r.body.ok} error=${r.body.error}`);
}

// ── הפניות: שתיהן דרך נתיב הקליטה האמיתי, שני טלפונים שונים ────────────────
// A — היעד ברשימת הבדיקה  →  אמור להיכנס לתור queued ולהתעבד.
// B — היעד אינו ברשימה    →  נכנס לתור blocked כבר ב-0067, ו-dispatch חייב
//     לסרב לו בלי לכתוב שורת יומן.
const A = await post(INTAKE, {
  kind: "treatment", source: "form", full_name: "מרים בדיקה", phone: "0500073001",
  email: "qa.bkalot@more30.com", note: "בדיקת נתיב המעבד מעל HTTP", consent: "true", situation: "disability",
});
const B = await post(INTAKE, {
  kind: "treatment", source: "form", full_name: "חנה בדיקה", phone: "0500073002",
  email: "qa.blocked.0073@more30.com", note: "יעד שאינו ברשימה", consent: "true", situation: "disability",
});
say(`[--] intake A => http=${A.status} case=${A.body.case_id} contact=${A.body.contact_id} rights=${A.body.rights_count}`);
say(`[--] intake B => http=${B.status} case=${B.body.case_id} contact=${B.body.contact_id} rights=${B.body.rights_count}`);

const seeded = {};
for (const [tag, res] of [["A", A], ["B", B]]) {
  const r = await post(ADMIN + "/render", { case_id: res.body.case_id }, T);
  const q = await post(ADMIN + "/queue", { document_id: r.body.document_id }, T);
  seeded[tag] = { case_id: res.body.case_id, document_id: r.body.document_id, queue_id: q.body.queue_id };
  say(`[--] ${tag} render doc=${r.body.document_id} | queue=${q.body.queue_id} status=${q.body.status} mode=${q.body.mode} to=${q.body.to_address}`);
}

// ── 03 — המסלול המלא, מעל HTTP ─────────────────────────────────────────────
{
  const r = await post(ADMIN + "/dispatch", { queue_id: seeded.A.queue_id }, T);
  const b = r.body;
  say(`[03] dispatch A => http=${r.status} ok=${b.ok} status=${b.status} outcome=${b.outcome} mode=${b.mode} ` +
      `to=${b.to_address} bytes=${b.content_bytes} doc=${b.document_id} matches=${b.body_matches_document} ` +
      `sent_for_real=${b.sent_for_real} admin=${b.admin ? b.admin.email : "(חסר)"}`);
}

// ── 04 — עיבוד שני של אותה שורה ────────────────────────────────────────────
// לא שורת יומן שנייה: שתי לחיצות במסך הן לחיצה אחת בעיני יומן המסירה.
{
  const r = await post(ADMIN + "/dispatch", { queue_id: seeded.A.queue_id }, T);
  const b = r.body;
  say(`[04] dispatch A שוב => http=${r.status} ok=${b.ok} error=${b.error} status=${b.status} already=${b.already_processed}`);
}

// ── 05 — שורה שנכנסה חסומה ─────────────────────────────────────────────────
{
  const r = await post(ADMIN + "/dispatch", { queue_id: seeded.B.queue_id }, T);
  const b = r.body;
  say(`[05] dispatch B (חסומה) => http=${r.status} ok=${b.ok} error=${b.error} status=${b.status} already=${b.already_processed}`);
}

// ── 06 — שורה של המערכת החיה: השומר הראשון של 0070, מעל HTTP ───────────────
// זו המדידה החשובה כאן: הכתובת החדשה נגישה למי שיש לו סשן ניהול של השכפול,
// והיא חולקת טבלה עם המערכת החיה. מזהה של שורת מקור חייב לחזור בלי כתיבה.
{
  const r = await post(ADMIN + "/dispatch", { queue_id: 6 }, T);
  const b = r.body;
  say(`[06] dispatch על שורת מקור #6 => http=${r.status} ok=${b.ok} error=${b.error} app_key=${b.app_key}`);
}

// ── 07 — קלט ───────────────────────────────────────────────────────────────
for (const [label, body] of [
  ["גוף ריק", {}],
  ["queue_id לא מספרי", { queue_id: "27abc" }],
  ["25 ספרות", { queue_id: "1234567890123456789012345" }],
  ["מזהה שאינו קיים", { queue_id: 999999 }],
  ["הכינוי id", { id: seeded.B.queue_id }],
]) {
  const r = await post(ADMIN + "/dispatch", body, T);
  say(`[07] ${label} => http=${r.status} ok=${r.body.ok} error=${r.body.error}`);
}

// ── 08 — dispatch מופיע ברשימת הנתיבים ─────────────────────────────────────
{
  const r = await post(ADMIN + "/nope", {}, T);
  say(`[08] נתיב שאינו קיים => http=${r.status} error=${r.body.error} allowed=${JSON.stringify(r.body.allowed)}`);
}

say(`SEEDED ${JSON.stringify(seeded)}`);
writeFileSync("C:/Users/USER/Downloads/more30/QA/bkalot-clone/dispatch-http-0814/probe-out.txt", out.join("\n") + "\n", "utf8");
