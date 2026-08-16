// זריעה למדידת ה-UI של 0096 — «נמצאה לפי הנימוק» נאמר בשורה ולא נשאר בתשובה.
//
// שתי פניות ולא אחת, מפני שהמדידה כאן היא של הפרדה ולא של נוכחות: אחת שנמצאת
// בזכות הנימוק (הסימן חייב להופיע) ואחת שנמצאת בזכות השם (הסימן חייב לא
// להופיע). סימן שדולק תמיד אינו אומר דבר.
//
// שתי הפניות והנימוקים הם מילה במילה אלה שנמדדו במיגרציה 0096 עצמה — אותו
// טקסט בדיוק, כדי שהמדידה במסך תרוץ על מה שכבר נמדד במסד ולא על מקרה אחר.
//
// kind=info ולא treatment: info אינו מחבר זכויות, ולכן שתי קליטות אינן גוררות
// 84 שורות case_rights לגלגול אחורה. השער של 0095 יושב ב-set_status ואינו
// מסתכל על kind כלל.
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

const PEOPLE = [
  { full_name: "אברהם ישראלי", phone: "0501230011" },
  { full_name: "מרים כהן", phone: "0502230022" },
];

const out = [];
for (const p of PEOPLE) {
  const r = await post(BASE + "/bkalot-clone-intake", {
    kind: "info", source: "form",
    full_name: p.full_name, phone: p.phone,
    email: "test@more30.com", note: "פנייה לבדיקת חיפוש בנימוקים",
    consent: "true",
  });
  // הטלפון הוא בדיוק עשר ספרות: קליטה שנדחית מחזירה case_id ריק, וכל המדידה
  // שאחריה הייתה רצה על פנייה שאינה קיימת. לכן זריקה, ולא המשך שקט.
  const case_id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (case_id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(r));
  out.push({ ...p, case_id, contact_id: r.body?.contact_id ?? null, queued: r.body?.queued ?? null, intake_http: r.status });
}

writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
