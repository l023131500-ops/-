// זריעה למדידת הייצור: שתי פניות ולא אחת. באחת איש הקשר יימחק ובשנייה לא, כדי
// שההשוואה תהיה בתוך אותה רשימה ובאותו צילום — שורה בלי זהות לצד שורה עם זהות.
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס — ולא הזרקת שורה;
// שני טלפונים שונים, אחרת ה-upsert על (app_key, phone) היה מחבר את שתיהן לאותו
// איש קשר ומחיקה אחת הייתה מרוקנת את שתיהן.
//
// המחיקה עצמה אינה כאן: אין לה נתיב HTTP, והיא נעשית ב-SQL בין הזריעה לצילום.
// נאמר ולא נבלע — המדידה כאן היא של המסך בייצור, והמחיקה היא פיגום.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const FN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const out = { intakes: [] };

const PEOPLE = [
  { full_name: "אברהם ישראלי", phone: "0501230011", note: "פנייה שאיש הקשר שלה יימחק" },
  { full_name: "שרה כהן", phone: "0501230022", note: "פנייה שאיש הקשר שלה נשאר — בקרה" },
];

for (const p of PEOPLE) {
  const r = await post(FN + "/bkalot-clone-intake", {
    kind: "info", source: "form",
    full_name: p.full_name, phone: p.phone,
    email: "test@more30.com", note: p.note, consent: "true",
  });
  if (!r.body?.case_id) throw new Error("intake לא החזירה case_id: " + JSON.stringify(r));
  out.intakes.push({
    who: p.full_name, status: r.status,
    case_id: r.body.case_id, contact_id: r.body.contact_id ?? null, queued: r.body.queued ?? null,
  });
}

writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
