// זריעה למדידת המסך: פנייה אחת ובתוכה שלושה נימוקים, כדי שההשוואה תהיה בתוך
// אותו רצף ולא בין פניות. הנימוקים הם מילה במילה אלה של 0097 ושל v9, כדי
// שהמדידה כאן תרוץ על מה שכבר נמדד במסד ומעל HTTP ולא על מקרה אחר.
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס — ולא הזרקת שורה.
// שלוש ההכרעות דרך השער עצמו כמנהל מחובר, מאותה סיבה: כך נכתב case_status_log
// כפי שהוא נכתב בייצור, כולל admin_id והנימוק.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כאן כ-cp1255
// והעברית שבתוכו נהרסת בזמן הפירוק.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const FN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";
const EMAIL = "uicase0098@more30.test";
const PASS = "Uicase0098!pass";

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const out = {};

const intake = await post(FN + "/bkalot-clone-intake", {
  kind: "info", source: "form",
  full_name: "אברהם ישראלי", phone: "0501230011",
  email: "test@more30.com", note: "פנייה לבדיקת סימון הנימוק במסך הפנייה",
  consent: "true",
});
const case_id = intake.body?.case_id ?? null;
if (case_id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(intake));
out.intake = { status: intake.status, case_id, contact_id: intake.body?.contact_id ?? null, queued: intake.body?.queued ?? null };

const login = await post(FN + "/bkalot-clone-admin/login", { email: EMAIL, password: PASS });
const token = login.body?.token;
if (!token) throw new Error("login נכשלה: " + JSON.stringify(login));
out.login = { status: login.status, admin_id: login.body?.admin?.id };

// שלושה מעברים ולא שניים: שני נימוקים שכל אחד מהם התאמה יחידה לשאילתה אחרת,
// ואחד שהמילה «מסמכים» מופיעה גם בו — כך שיש גם מקרה של שתי שורות מסומנות.
const STEPS = [
  ["in_progress", "הפונה ביקש לצרף מסמכים נוספים בשבוע הבא"],
  ["rejected", "המסמכים שצורפו שייכים לשנת המס הקודמת"],
  ["in_progress", "הטופס נשלח בדואר רשום על ידי הפונה"],
];
out.steps = [];
for (const [status, note] of STEPS) {
  const r = await post(FN + "/bkalot-clone-admin/set-status", { id: case_id, status, note }, { "x-admin-token": token });
  out.steps.push({ status, note, http: r.status, ok: r.body?.ok, changed: r.body?.changed });
}

await post(FN + "/bkalot-clone-admin/logout", {}, { "x-admin-token": token });

writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
