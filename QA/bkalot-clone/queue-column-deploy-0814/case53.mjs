// מה קורה לפנייה 53 (info, בלי מייל, בלי מצב, בלי זכויות ובלי מסמכים) —
// המסך נזרק ממנה למסך הכניסה, ופניות 51 ו-52 נפתחות. השאלה: השרת או הלקוח.
import { readFileSync } from "node:fs";
const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";

async function post(url, body, extra = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, text: t, body: j };
}

const login = await post(ADMIN + "/login", { email: "qa0071@more30.com", password: "Qa0071!probe" });
const T = { "x-admin-token": login.body.token };
console.log(`login ${login.status} ok=${login.body.ok}`);

for (const id of [51, 52, 53]) {
  const k = await post(ADMIN + "/case", { id }, T);
  const c = k.body?.case || {};
  console.log(`case ${id} -> http=${k.status} ok=${k.body?.ok} error=${k.body?.error ?? "-"} to_email=${JSON.stringify(c.to_email)} consent=${JSON.stringify(c.consent)} differs=${JSON.stringify(c.contact_email_differs)} docs=${(k.body?.documents || []).length}`);
  if (k.status !== 200 || k.body?.ok === false) console.log(`   RAW: ${k.text.slice(0, 400)}`);
}
