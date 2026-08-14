// seed.mjs — זריעה דרך נתיב המוצר: bkalot-clone-intake מעל HTTP עם מפתח anon,
// בדיוק כמו מהטופס. שלושה טלפונים שונים בכוונה — הקליטה מאתרת איש קשר לפי טלפון.
//
// ההכרעה נעשית בסבב נפרד (decide.sql, שתי קריאות) ובסדר הפוך, כדי ש-created_at desc
// ו-decided_at desc יהיו הפוכים לגמרי; הפנייה שאיש לא הכריע עוברת מהראש לזנב.
import { writeFileSync } from "node:fs";

const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON_KEY = process.env.CLONE_ANON;

const rows = [
  { full_name: "QA הצג בייצור א", phone: "0504440011" },
  { full_name: "QA הצג בייצור ב", phone: "0504440022" },
  { full_name: "QA הצג בייצור ג", phone: "0504440033" },
];

const out = [];
for (const r of rows) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON_KEY, authorization: "Bearer " + ANON_KEY },
    body: JSON.stringify({
      kind: "info",
      source: "form",
      full_name: r.full_name,
      phone: r.phone,
      email: "",
      note: "QA apply-button-deploy-0814",
      consent: "true",
    }),
  });
  const body = await res.json();
  out.push({ phone: r.phone, status: res.status, body });
  console.log(r.phone, res.status, JSON.stringify(body));
}
writeFileSync("QA/bkalot-clone/apply-button-deploy-0814/_seed.json", JSON.stringify(out, null, 2), "utf8");
