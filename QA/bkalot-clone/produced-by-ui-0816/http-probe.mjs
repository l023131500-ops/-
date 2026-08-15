// הצד השני של המדידה: מה שבייצור עדיין אינו יודע לומר מי הפיק.
//
// המסומנים נבחרים כך שיחזירו 0 על הקובץ שבייצור ו-1 על המקור — מסומן שמחזיר
// true על שתי הגרסאות אינו מודד דבר (המלכודת של 530fb44, 29d6ac6, e12acf9).
// שלושת מסומני OLD הם בקרה: הם קיימים בשתי הגרסאות, ולכן הם מראים שהמסומנים
// הראשונים באמת נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1 בלי BOM נקרא כ-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const URLS = [
  "https://more30.com/bkalot-studio/admin",
  "https://more30.com/bkalot-studio/admin/",
];
// ⚠️ המסומן הרביעי היה תחילה "החשבון אינו קיים עוד\";" והחזיר 0 גם על המקור —
//    השורה נגמרת בגרש הפוך ולא בגרשיים, ולכן הוא מדד אפס מול אפס והיה עובר
//    כ«תקין». הוחלף במשפט ה-title, שקיים במקור בדיוק פעם אחת. «החשבון אינו קיים
//    עוד» עצמו עבר לרשימת הנספרים: 2 במקור מול 1 בייצור — fillDecidedLine כבר
//    מחזיקה אותו, ולכן הוא נמדד בהפרש ולא בנוכחות.
const NEW = ["הופק על ידי: ", "fillProducedCell", "produced_by_name", "הזהות נשמרה על המסמך בזמן ההפקה", "prodLine"];
const OLD = ["fillCreatedCell", "fillDecidedLine", "תווי טקסט", "החשבון אינו קיים עוד"];
const count = (h, n) => h.split(n).length - 1;

const out = { at: new Date().toISOString(), source_bytes: Buffer.byteLength(SRC, "utf8"), source: {}, live: {} };
for (const n of [...NEW, ...OLD]) out.source[n] = count(SRC, n);

for (const u of URLS) {
  const res = await fetch(u + "?cb=" + Math.random().toString(36).slice(2), { headers: { "cache-control": "no-cache" } });
  const html = await res.text();
  const rec = { status: res.status, bytes: Buffer.byteLength(html, "utf8"), markers: {} };
  for (const n of [...NEW, ...OLD]) rec.markers[n] = count(html, n);
  // תו החלפה וכפל-קידוד: אם הם מופיעים, כל ספירת מחרוזת עברית כאן חסרת ערך.
  rec.replacement_chars = count(html, "\uFFFD");
  rec.double_encoded = count(html, "×");
  out.live[u] = rec;
}
writeFileSync(new URL("./http-probe.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
