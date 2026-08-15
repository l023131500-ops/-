// זריעה לפעימת «מסך המסמך אינו אומר מי הפיק אותו» (UI).
//
// פנייה אחת דרך נתיב הקליטה הציבורי מעל HTTP (bkalot-clone-intake, מפתח anon
// כמו מהטופס) ולא בהזרקה ל-cases. עליה יופק מסמך מהמסך עצמו, בלחיצת «הפק»,
// ולא ב-SQL — מפני שמה שנמדד כאן הוא בדיוק מה שהשער v8 מעביר: הזהות שיושבת
// ב-g.admin ונוסעת בארגומנט השני של bkalot_clone_render.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתוכו נהרסת בזמן הפירוק.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";

// הטלפון הוא בדיוק עשר ספרות. ב-0078 הוא נבנה מאורך מערך והפיק אחת-עשרה,
// הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות שאינן קיימות
// והציגה אפס כאילו זו תשובה. לכן זריקה על case_id ריק, ולא המשך שקט.
const res = await fetch(INTAKE, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
  body: JSON.stringify({
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: "בדיקה מי הפיק", phone: "0501230801", email: "test@more30.com",
    note: "יופק עליה מסמך מהמסך, כדי לראות מי הפיק אותו", consent: "true",
  }),
});
const body = await res.json().catch(() => null);
const id = body?.case_id ?? body?.case?.id ?? null;
if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify({ status: res.status, body }));

const out = { case_id: id, rights: body?.rights_count ?? null, status: body?.status ?? null, queued: body?.queued ?? null, contact_id: body?.contact_id ?? null };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
