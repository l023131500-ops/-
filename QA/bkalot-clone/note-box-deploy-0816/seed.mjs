// זריעה למדידת הפריסה — תיבת הנימוק בכתובת החיה.
//
// אותה זריעה בדיוק כמו b1fcca7: שתי פניות ריקות, ואין כאן ולו קריאת set-status
// אחת. שם נמדד הקוד שבמקור מול שרת סטטי מקומי, וכאן אותם מצבים בדיוק נמדדים
// מ-https://more30.com/bkalot-studio/admin — ההפרש היחיד הוא מאיפה נטען ה-HTML.
//
// A — נימוק שנכתב בתיבה ונלחץ «בטיפול»  → נשמר, וחוזר בטבלת «רצף ההכרעות» מתחת
// B — 501 תווים                          → note_too_long, והסטטוס אינו זז
// המצב השלישי — תיבה ריקה — נמדד על A לפני ההקלדה.
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

// ⚠️ הטלפון הוא בדיוק עשר ספרות. ב-0078 הוא נבנה מאורך מערך והפיק אחת-עשרה,
// הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות שאינן קיימות.
// לכן זריקה על case_id ריק ולא המשך שקט.
const CITIZEN = "מה שהאזרח כתב בטופס — cases.note, ואינו הנימוק של המכריע";
const plan = [
  ["A", "0501240931", "בדיקת פריסה תיבת נימוק נשמר"],
  ["B", "0501240932", "בדיקת פריסה תיבת נימוק ארוך מדי"],
];

const cases = {};
for (const [key, phone, name] of plan) {
  const r = await post(FN + "/bkalot-clone-intake", {
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: name, phone, email: "test@more30.com", note: CITIZEN, consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) throw new Error(`intake ${key} לא החזירה case_id: ` + JSON.stringify(r));
  cases[key] = {
    case_id: id, contact_id: r.body?.contact_id ?? null,
    rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null,
    status: r.body?.status ?? null,
  };
}

const out = { citizen_chars: CITIZEN.length, cases };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
