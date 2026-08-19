// זריעה למדידה בייצור. זהה לזריעת note-tally-ui-0816 בכוונה — אותה פנייה בדיוק,
// כדי שמה שנמדד כאן מול הכתובת החיה יהיה בר-השוואה למה שנמדד שם מול עץ העבודה.
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס, ולא הזרקת שורה.
// ארבעת המעברים נכתבים ב-SQL אחרי הזריעה — פיגום ולא הטענה: לשלושה נימוק
// ולרביעי אין כלל, וזה בדיוק ההפרש שהמכנה אמור לומר (הכותרת סופרת 4 מעברים
// והספירה אמורה לומר 3 נימוקים).
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כאן כ-cp1255
// והעברית שבתוכו נהרסת בזמן הפירוק.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const FN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";

const res = await fetch(FN + "/bkalot-clone-intake", {
  method: "POST",
  headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
  body: JSON.stringify({
    kind: "info", source: "form",
    full_name: "אברהם ישראלי", phone: "0501230011",
    email: "test@more30.com", note: "פנייה שרצף ההכרעות שלה נספר", consent: "true",
  }),
});
const body = await res.json().catch(() => null);
if (!body?.case_id) throw new Error("intake לא החזירה case_id: " + JSON.stringify({ status: res.status, body }));

const out = { status: res.status, case_id: body.case_id, contact_id: body.contact_id ?? null, queued: body.queued ?? null };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
