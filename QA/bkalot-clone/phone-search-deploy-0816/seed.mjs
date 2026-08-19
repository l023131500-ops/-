// זריעה למדידה בייצור — שורת «חופש לפי» במסך הרשימה החי.
//
// פנייה אחת, והטלפון נשלח *עם מקפים* בכוונה: זו בדיוק הצורה שהמנהל מקליד
// בחיפוש, והקליטה מנרמלת אותה אל ספרות בכתיבה. אותה פנייה מספיקה לשני המצבים —
// זה שמציג את השורה (מונח עם מקפים) וזה שאינו מציג אותה (אותן ספרות בדיוק).
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

// ⚠️ הטלפון הוא בדיוק עשר ספרות אחרי הנרמול — תקלת 0078: אורך אחר נדחה בקליטה,
//    case_id חוזר null, וכל המדידה שאחריו רצה על פנייה שאינה קיימת.
const TYPED = "054-812-3491";
const r = await post(FN + "/bkalot-clone-intake", {
  kind: "treatment", source: "form", situation: "single_parent",
  full_name: "בדיקת חיפוש טלפון בייצור", phone: TYPED,
  email: "test@more30.com", note: "מה שהאזרח כתב בטופס", consent: "true",
});
const id = r.body?.case_id ?? r.body?.case?.id ?? null;
if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(r));

const out = {
  typed: TYPED,
  case: { case_id: id, contact_id: r.body?.contact_id ?? null,
          rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null,
          status: r.body?.status ?? null },
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
