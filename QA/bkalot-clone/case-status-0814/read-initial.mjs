// קריאה חוזרת של הסטטוס ההתחלתי בלבד — probe.mjs שלב 1 קרא ל-/case עם
// case_id, והנתיב מקבל id. אין כאן קליטה חדשה: אותן ארבע הפניות של שלב 1.
import { readFileSync, appendFileSync } from "node:fs";
const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const dir = "C:/Users/USER/Downloads/more30/QA/bkalot-clone/case-status-0814/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const out = [];
const say = (s) => { out.push(s); console.log(s); };
const post = async (u, b, e = {}) => {
  const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...e }, body: JSON.stringify(b) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const login = await post(ADMIN + "/login", { email: "qa0075@more30.com", password: "Qa0075!probe" });
const T = { "x-admin-token": login.body.token };
const ids = JSON.parse(readFileSync(dir + "ids.json", "utf8"));
for (const tag of ["A", "B", "C", "D"]) {
  const r = await post(ADMIN + "/case", { id: ids[tag] }, T);
  say(`${tag} (#${ids[tag]}) status-after-intake = ${r.body?.case?.status}  docs=${(r.body?.documents ?? []).length}`);
}
appendFileSync(dir + "probe-out.txt", out.join("\n") + "\n", "utf8");
