// זריעה למדידת שני המספרים מהכתובת החיה: פנייה אחת, דרך נתיב הציבור מעל HTTP
// עם מפתח anon כמו מהטופס ולא הזרקת שורה.
//
// השם «אברהם ישראלי» אינו קישוט אלא הכשל עצמו: q=«אברהם» מתאים לשם — שדה נראה —
// ולכן matched_in_note חוזר false, וכל הסימון הישן נשתק. הסימן החדש הוא היחיד
// שאומר שיש שם גם נימוק. חמישה מעברים וארבעה נימוקים נכתבים אחר כך ב-SQL, בכוונה
// שני מספרים שונים: שורה שתספור מעברים במקום נימוקים תיפול כאן ולא בייצור.
//
// kind=info ולא treatment: info אינו מחבר זכויות, ולכן הקליטה אינה גוררת
// ~880 שורות case_rights לגלגול אחורה. queued נמדד ולא מוצהר.
//
// נכתב ב-node ולא ב-PowerShell: קובץ .ps1 בלי BOM נקרא כאן כ-cp1255 והעברית
// שבתוכו נהרסת בזמן הפירוק.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const FN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";

const res = await fetch(FN + "/bkalot-clone-intake", {
  method: "POST",
  headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
  body: JSON.stringify({
    kind: "info", source: "form",
    full_name: "אברהם ישראלי", phone: "0501230013",
    email: "test@more30.com", note: "פנייה ששני המספרים בייצור נמדדים עליה", consent: "true",
  }),
});
const body = await res.json().catch(() => null);
if (!body?.case_id) throw new Error("intake לא החזירה case_id: " + JSON.stringify({ status: res.status, body }));

const out = { status: res.status, case_id: body.case_id, contact_id: body.contact_id ?? null, queued: body.queued ?? null };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
