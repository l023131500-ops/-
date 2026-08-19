// זריעה לפעימת «מסך הניהול אינו יודע לשאול מי לא נלקח».
//
// שלוש פניות דרך נתיב הקליטה הציבורי מעל HTTP (bkalot-clone-intake, מפתח anon
// כמו מהטופס) ולא בהזרקה ל-cases. השלישית היא זו שקונה את המדידה:
//   A — איש לא נגע בה. status=new, decided_at null.
//   B — תוכרע מהמסך עצמו בדפדפן (לחיצת «בטיפול»), ולכן decided_at יימלא.
//   C — נקלטת ואז מופק עליה מסמך; הטריגר documents_advance_case מקדם אותה
//       ל-in_progress בעוד ש-decided_at נשאר null. C היא ההפרדה בין «לא הוכרעה»
//       לבין status=new: סינון שמחפש status=new לבדו מחמיץ אותה לגמרי, ואילו
//       ברשימה היא נראית בדיוק כמו פנייה שאדם לקח.
//
// שלושה טלפונים שונים בכוונה — intake מאתר איש קשר לפי טלפון, ושלוש פניות
// מאותו טלפון היו נותנות איש קשר אחד.
//
// הסקריפט אינו מכריע דבר: אף אחת מהשלוש אינה עוברת ב-set_status כאן, וההכרעה
// היחידה שתירשם היא לחיצה בדפדפן. C עוברת render בלבד עם queued=false — מסמך
// נוצר, ושום שורה אינה נכנסת לתור ושום הודעה אינה יוצאת.
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
const mk = async (kind, name, note, phone) => {
  const res = await fetch(INTAKE, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify({
      kind, source: "form", situation: "single_parent",
      full_name: name, phone, email: "test@more30.com", note, consent: "true",
    }),
  });
  const body = await res.json().catch(() => null);
  const id = body?.case_id ?? body?.case?.id ?? null;
  if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify({ status: res.status, body }));
  return { id, rights: body?.rights_count ?? null, status: body?.status ?? null };
};

const a = await mk("treatment", "בדיקה סינון A", "איש לא נגע בה", "0501230201");
const b = await mk("treatment", "בדיקה סינון B", "תוכרע מהמסך בלחיצת «בטיפול»", "0501230202");
const c = await mk("reminder", "בדיקה סינון C", "יופק עליה מסמך — הטריגר יקדם אותה בלי הכרעת אדם", "0501230203");

const out = { case_a: a, case_b: b, case_c: c };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
