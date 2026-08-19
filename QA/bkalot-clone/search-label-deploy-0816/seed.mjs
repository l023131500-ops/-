// זריעה למדידת התווית בייצור: פנייה אחת, ובתוכה נימוק שנושא מילה שאינה בשם,
// אינה בטלפון, אינה במייל ואינה במספר הפנייה. זה בדיוק המקרה שהתווית הישנה
// הכחישה — היא מנתה ארבעה שדות, והשורה עולה בזכות שדה חמישי.
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס, ולא הזרקת שורה.
// המעברים עצמם נכתבים ב-SQL אחרי הזריעה — פיגום ולא הטענה: מה שנמדד הוא מה
// שהמסך אומר על החיפוש, ולא הדרך שבה נכתב הנימוק.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כאן כ-cp1255
// והעברית שבתוכו נהרסת בזמן הפירוק.
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

const r = await post(FN + "/bkalot-clone-intake", {
  kind: "info", source: "form",
  full_name: "אברהם ישראלי", phone: "0501230011",
  email: "test@more30.com", note: "פנייה שהתווית מעל תיבת החיפוש נמדדת עליה בייצור", consent: "true",
});
if (!r.body?.case_id) throw new Error("intake לא החזירה case_id: " + JSON.stringify(r));

const out = {
  status: r.status,
  case_id: r.body.case_id,
  contact_id: r.body.contact_id ?? null,
  queued: r.body.queued ?? null,
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
