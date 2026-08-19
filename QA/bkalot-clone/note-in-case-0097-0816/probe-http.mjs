// המדידה של הכרעה (7) — ולא הנחה שלה.
//
// הטענה שהמיגרציה הזו נשענת עליה היא ש-PostgREST ממשיך לפתור {p_id} בלבד אל
// החתימה החדשה, כלומר שהשער הפרוס (v8) לא נשבר. פתרון שגוי כאן אינו באג קטן:
// כל מסך פנייה בייצור נכבה. לכן זה נמדד דרך השער עצמו מעל HTTP, ולא בקריאת SQL
// ישירה — קריאת SQL בוחרת פונקציה בכללי postgres, וכללי הבחירה של PostgREST
// לפי שמות ארגומנטים הם דבר אחר.
//
// ⚠️ הקריאה עוברת דרך אותו שער פרוס בדיוק שיושב בייצור עכשיו, ואינה פורסת דבר.
//
// נכתב ב-node ולא ב-PowerShell בכוונה — תקלת ps1-without-bom-parsed-as-cp1255.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";
const CASE_ID = Number(process.argv[2]);
const EMAIL = process.argv[3];
const PASS = process.argv[4];

// המסלול נקבע לפי הנתיב ולא לפי מפתח בגוף, והטוקן נקרא מכותרת x-admin-token
// ולא מהגוף — שניהם נמדדו מהשער עצמו ולא הונחו.
async function post(route, body, token) {
  const res = await fetch(BASE + "/bkalot-clone-admin/" + route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON,
      authorization: "Bearer " + ANON,
      ...(token ? { "x-admin-token": token } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const login = await post("login", { email: EMAIL, password: PASS });
const token = login.body?.token ?? login.body?.session?.token ?? null;
if (!token) throw new Error("login לא החזיר token: " + JSON.stringify(login).slice(0, 400));

const out = { login_http: login.status };
for (const [label, extra] of [["בלי q", {}], ["עם q", { q: "המס הקודמת" }]]) {
  const r = await post("case", { id: CASE_ID, ...extra }, token);
  const hist = r.body?.status_history ?? [];
  out[label] = {
    http: r.status,
    ok: r.body?.ok ?? null,
    error: r.body?.error ?? null,
    rows: hist.length,
    // המפתח נבדק בנפרד מהערך: מפתח חסר ו-false נראים אותו דבר ב-?? false.
    key_on_every_row: hist.every((h) => Object.hasOwn(h, "note_matched")),
    note_matched: hist.map((h) => [h.id, h.note_matched]),
  };
}
await post("logout", {}, token);

writeFileSync(new URL("./http.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
