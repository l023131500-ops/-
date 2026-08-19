// מדידת נתיב set-status מעל HTTP, אחרי פריסת v6.
//
// כל מה שנמדד כאן עובר דרך הכתובת החיה של ה-edge function — לא קריאת RPC ולא
// הזרקה למסד. הפניות עצמן נוצרות דרך נתיב הקליטה הציבורי (intake) עם מפתח
// ה-anon של הטופס, בדיוק כמו משתמש אמיתי.
//
// זה בדיוק ההבדל מ-0072: שם המצב הסופי נקבע בקריאת SQL מהטרמינל, כלומר
// הבדיקה עקפה את המוצר. כאן אין ולו קריאת SQL אחת.
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
  const r = await fetch(ADMIN + "/set-status", {
    method: "OPTIONS",
    headers: { origin: "https://more30.com", "access-control-request-method": "POST" },
  });
  say(`[00] OPTIONS /set-status => ${r.status} allow-headers=${r.headers.get("access-control-allow-headers")}`);
}

// ── 01 — set-status בלי טוקן: 401 לפני שהמסד נוגע בכלום ────────────────────
// זו המדידה החשובה ביותר כאן: בלי השער, כל מי שיש לו את מפתח ה-anon הציבורי
// של הטופס היה יכול לסגור כל פנייה במערכת.
{
  const r = await post(ADMIN + "/set-status", { case_id: 1, status: "closed" });
  say(`[01] set-status בלי x-admin-token => http=${r.status} ok=${r.body.ok} error=${r.body.error}`);
}

// ── הזהות ──────────────────────────────────────────────────────────────────
const login = await post(ADMIN + "/login", { email: "qa0073@more30.com", password: "Qa0073!probe" });
say(`[--] login => http=${login.status} ok=${login.body.ok} admin=${JSON.stringify(login.body.admin)}`);
const T = { "x-admin-token": login.body.token };

// ── 02 — טוקן פגום: 401 גם עם גוף תקין לחלוטין ─────────────────────────────
{
  const bad = login.body.token.slice(0, -1) + "Z";
  const r = await post(ADMIN + "/set-status", { case_id: 1, status: "closed" }, { "x-admin-token": bad });
  say(`[02] set-status עם טוקן פגום => http=${r.status} ok=${r.body.ok} error=${r.body.error}`);
}

// ── הפניות: שתיהן דרך נתיב הקליטה האמיתי, שני טלפונים שונים ────────────────
// A — הפנייה שנבדקת.  B — בקרה שלא נוגעים בה בכלל, ושחייבת להישאר new.
const A = await post(INTAKE, {
  kind: "treatment", source: "form", full_name: "רבקה בדיקה", phone: "0500074001",
  email: "qa.bkalot@more30.com", note: "בדיקת נתיב הכרעת האדם מעל HTTP", consent: "true", situation: "disability",
});
const B = await post(INTAKE, {
  kind: "treatment", source: "form", full_name: "לאה בדיקה", phone: "0500074002",
  email: "qa.control.0074@more30.com", note: "בקרה שלא נוגעים בה", consent: "true", situation: "disability",
});
say(`[--] intake A => http=${A.status} case=${A.body.case_id} contact=${A.body.contact_id} rights=${A.body.rights_count}`);
say(`[--] intake B => http=${B.status} case=${B.body.case_id} contact=${B.body.contact_id} rights=${B.body.rights_count}`);
const CA = A.body.case_id, CB = B.body.case_id;

// מצב הלידה, נקרא מהמוצר ולא מהמסד.
{
  const r = await post(ADMIN + "/case", { id: CA }, T);
  say(`[--] מצב לידה של A לפי /case => status=${r.body.case?.status}`);
}

// ── 03..06 — ארבעת המסלולים, כולם מעל HTTP ─────────────────────────────────
for (const [tag, body, why] of [
  ["03", { case_id: CA, status: "closed" }, "סגירה"],
  ["04", { case_id: CA, status: "closed" }, "אותה סגירה שוב"],
  ["05", { case_id: CA, status: "rejected" }, "דחייה אחרי סגירה"],
  ["06", { id: String(CA), status: "in_progress" }, "פתיחה מחדש, בכינוי id וכמחרוזת"],
]) {
  const r = await post(ADMIN + "/set-status", body, T);
  const b = r.body;
  say(`[${tag}] ${why} => http=${r.status} ok=${b.ok} previous=${b.previous} status=${b.status} ` +
      `changed=${b.changed} admin=${b.admin ? b.admin.email : "(חסר)"}`);
}

// ── 07 — המסך קורא בחזרה את מה שנכתב ───────────────────────────────────────
// הכתיבה חוזרת ok:true היא לא הוכחה שהמנהל יראה את זה. הקריאה כאן היא מהנתיב
// שהמסך באמת משתמש בו.
{
  const c = await post(ADMIN + "/case", { id: CA }, T);
  const l = await post(ADMIN + "/cases", { status: "in_progress" }, T);
  const ids = (l.body.cases ?? []).map((x) => x.id);
  say(`[07] /case A => status=${c.body.case?.status} | /cases?status=in_progress => total=${l.body.total} ` +
      `מכיל_את_A=${ids.includes(CA)} מכיל_את_B=${ids.includes(CB)}`);
}

// ── 08 — הבקרה לא זזה ──────────────────────────────────────────────────────
{
  const r = await post(ADMIN + "/case", { id: CB }, T);
  say(`[08] הבקרה B => status=${r.body.case?.status}`);
}

// ── 09 — קלט ורשימת ההיתר, כולם דרך המסד ולא דרך עותק כאן ──────────────────
for (const [label, body] of [
  ["גוף ריק", {}],
  ["case_id לא מספרי", { case_id: "27abc", status: "closed" }],
  ["25 ספרות", { case_id: "1234567890123456789012345", status: "closed" }],
  ["מזהה שאינו קיים", { case_id: 999999, status: "closed" }],
  ["בלי status", { case_id: CB }],
  ["status ברווחים", { case_id: CB, status: "   " }],
  ["status שאינו בסכמה", { case_id: CB, status: "archived" }],
  ["sent", { case_id: CB, status: "sent" }],
  ["new", { case_id: CB, status: "new" }],
]) {
  const r = await post(ADMIN + "/set-status", body, T);
  const b = r.body;
  say(`[09] ${label} => http=${r.status} ok=${b.ok} error=${b.error}` +
      (b.settable ? ` settable=${JSON.stringify(b.settable)}` : ""));
}

// ── 10 — set-status מופיע ברשימת הנתיבים ───────────────────────────────────
{
  const r = await post(ADMIN + "/nope", {}, T);
  say(`[10] נתיב שאינו קיים => http=${r.status} error=${r.body.error} allowed=${JSON.stringify(r.body.allowed)}`);
}

say(`SEEDED ${JSON.stringify({ case_a: CA, case_b: CB, contact_a: A.body.contact_id, contact_b: B.body.contact_id })}`);
writeFileSync("C:/Users/USER/Downloads/more30/QA/bkalot-clone/set-status-http-0814/probe-out.txt", out.join("\n") + "\n", "utf8");
