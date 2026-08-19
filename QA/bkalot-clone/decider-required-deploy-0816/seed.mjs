// זריעה למדידת הפריסה — אותה זריעה של 53a3e5a, והפעם מול הכתובת החיה.
//
// פנייה אחת בלבד: מה שנמדד כאן אינו מה שהמסד עושה (0092 נמדדה משני צדדיה) אלא
// מה שהמסך **בייצור** אומר כשהקוד decider_required חוזר אל הלחיצה.
//
// ⚠️ אין דרך לגרום לשרת החי להחזיר את הקוד הזה מהדפדפן, ובכוונה: השער ממלא את
//    p_admin_id מהטוקן תמיד. לכן התשובה מוזרקת בדפדפן על הקריאה האחת הזו
//    (ראו README), והצד השרתי נמדד בנפרד ב-SQL על אותה פנייה.
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

// ⚠️ הטלפון הוא בדיוק עשר ספרות — תקלת 0078: אורך אחר נדחה בקליטה, case_id חוזר
//    null, וכל המדידה שאחריו רצה על פנייה שאינה קיימת. לכן זריקה ולא המשך שקט.
const r = await post(FN + "/bkalot-clone-intake", {
  kind: "treatment", source: "form", situation: "single_parent",
  full_name: "בדיקת נוסח זהות חסרה בייצור", phone: "0501240932",
  email: "test@more30.com", note: "מה שהאזרח כתב בטופס", consent: "true",
});
const id = r.body?.case_id ?? r.body?.case?.id ?? null;
if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(r));

const out = {
  case: { case_id: id, contact_id: r.body?.contact_id ?? null,
          rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null,
          status: r.body?.status ?? null },
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
