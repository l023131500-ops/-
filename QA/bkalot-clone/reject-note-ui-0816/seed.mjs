// זריעה למדידת ה-UI של 0095 — «דחייה חייבת נימוק» נאמר במסך ולא בקוד באנגלית.
//
// פנייה אחת ולא שלוש: השער של 0095 נמדד כבר במסד על אחת עשרה קריאות (465bb15),
// והמדידה כאן היא של המסך בלבד — התווית, המונה, ההודעה והמיקוד. פנייה אחת
// עוברת את שני המצבים בזה אחר זה: דחייה בלי נימוק (נחסמת) ואז עם נימוק (עוברת).
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס — ולא הזרקת שורה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כאן כ-cp1255
// והעברית שבתוכו נהרסת בזמן הפירוק.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const r = await post(BASE + "/bkalot-clone-intake", {
  kind: "treatment", source: "form", situation: "single_parent",
  full_name: "בדיקה 0095 דחייה בלי נימוק", phone: "0501230895",
  email: "test@more30.com", note: "עליה תיעשה דחייה אחת בלי נימוק ואחת עם", consent: "true",
});
// הטלפון הוא בדיוק עשר ספרות: קליטה שנדחית מחזירה case_id ריק, וכל המדידה
// שאחריה הייתה רצה על פנייה שאינה קיימת. לכן זריקה, ולא המשך שקט.
const case_id = r.body?.case_id ?? r.body?.case?.id ?? null;
if (case_id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(r));

const out = { case_id, contact_id: r.body?.contact_id ?? null, rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null, intake_http: r.status };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
