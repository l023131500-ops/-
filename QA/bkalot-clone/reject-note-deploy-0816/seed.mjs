// זריעה למדידת הפריסה: פנייה אחת בייצור שעליה תילחץ «דחייה» פעמיים — פעם בלי
// נימוק (נחסמת, וזה מה שהלבנה קונה) ופעם עם נימוק (עוברת, וזו הבקרה שמראה
// שהחסימה היא של הריקנות ולא של הכפתור).
//
// kind=info ולא treatment: info אינו מחבר זכויות, ולכן קליטה אחת אינה גוררת 42
// שורות case_rights לגלגול אחורה. השער של 0095 יושב ב-set_status ואינו מסתכל
// על kind כלל.
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס — ולא הזרקת שורה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";

const res = await fetch(BASE + "/bkalot-clone-intake", {
  method: "POST",
  headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
  body: JSON.stringify({
    kind: "info", source: "form", situation: "single_parent",
    full_name: "בדיקת פריסה 0095", phone: "0501230896",
    email: "test@more30.com", note: "עליה תילחץ דחייה אחת בלי נימוק ואחת עם", consent: "true",
  }),
});
const body = await res.json().catch(() => null);
// הטלפון הוא בדיוק עשר ספרות: קליטה שנדחית מחזירה case_id ריק, וכל המדידה
// שאחריה הייתה רצה על פנייה שאינה קיימת. לכן זריקה, ולא המשך שקט.
const case_id = body?.case_id ?? body?.case?.id ?? null;
if (case_id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(body));

const out = { case_id, contact_id: body?.contact_id ?? null, rights: body?.rights_count ?? null, queued: body?.queued ?? null, intake_http: res.status };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
