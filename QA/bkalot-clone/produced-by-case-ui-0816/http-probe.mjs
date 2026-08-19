// הצד השני של המדידה: מה שבייצור עדיין אינו יודע לומר בשורת המסמך של הפנייה.
//
// כאן, בשונה מ-042e60f, כמעט כל מסומן «מי הפיק» כבר נמצא בייצור — 7d7dcf2 פרסה
// את מסך המסמך. לכן מסומני NEW חייבים להיות ייחודיים לשורה שברשימה דווקא:
// כותרת העמודה, התא ומי שממלא אותו. מסומן שמחזיר true על שתי הגרסאות אינו מודד
// דבר (המלכודת של 530fb44, 29d6ac6, e12acf9), ו«fillProducedCell» לבדו הוא כזה
// היום — ולכן הוא עבר להימדד בהפרש (3 במקור מול 2 בייצור) ולא בנוכחות.
//
// מסומני OLD הם בקרה: הם קיימים בשתי הגרסאות ובאותו מספר, ולכן הם מראים
// שמסומני NEW נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1 בלי BOM נקרא כ-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const URLS = [
  "https://more30.com/bkalot-studio/admin",
  "https://more30.com/bkalot-studio/admin/",
];
// ייחודיים לשורה שברשימה: 0 בייצור, ≥1 במקור.
const NEW = [
  "<th>הופק על ידי</th>",
  "<th>נוצר</th><th>הופק על ידי</th><th>תור</th>",
  "fillProducedCell(ptd, d)",
  "const ptd = document.createElement",
];
// נמדדים בהפרש: קיימים בשתי הגרסאות, והמספר הוא מה שהשתנה.
//
// ⚠️ fillCreatedCell ו-fillTemplateCell היו כאן תחילה כבקרה והחזירו 4 מול 3 —
//    כלומר נכשלו כבקרה. הסיבה נמדדה ולא הונחה: ההערה שנכתבה מעל התא החדש מזכירה
//    את שתיהן בשמן, ולכן הן גדלו בטקסט ולא בקוד. הן הועברו לכאן ולא תוקנו
//    בשקט — בקרה שנכשלת ומוסתרת גרועה מבקרה שלא הייתה.
const DIFF = ["fillProducedCell", "הופק על ידי", "fillCreatedCell", "fillTemplateCell"];
// בקרה: אותו מספר בשתי הגרסאות.
const OLD = ["fillDecidedLine", "הופק על ידי: ", "תווי טקסט", "fillQueueCell"];
const count = (h, n) => h.split(n).length - 1;
const ALL = [...NEW, ...DIFF, ...OLD];

const out = { at: new Date().toISOString(), source_bytes: Buffer.byteLength(SRC, "utf8"), source: {}, live: {} };
for (const n of ALL) out.source[n] = count(SRC, n);

for (const u of URLS) {
  const res = await fetch(u + "?cb=" + Math.random().toString(36).slice(2), { headers: { "cache-control": "no-cache" } });
  const html = await res.text();
  const rec = { status: res.status, bytes: Buffer.byteLength(html, "utf8"), markers: {} };
  for (const n of ALL) rec.markers[n] = count(html, n);
  // תו החלפה וכפל-קידוד: אם הם מופיעים, כל ספירת מחרוזת עברית כאן חסרת ערך.
  rec.replacement_chars = count(html, "\uFFFD");
  rec.double_encoded = count(html, "×");
  // ההכרעות נאמרות ולא מונחות: NEW חייב 0 בייצור ו-≥1 במקור, OLD חייב שוויון.
  rec.new_zero_live = NEW.every((n) => rec.markers[n] === 0);
  rec.new_present_source = NEW.every((n) => out.source[n] >= 1);
  rec.old_equal = OLD.every((n) => rec.markers[n] === out.source[n] && out.source[n] >= 1);
  rec.diff_grew = DIFF.every((n) => out.source[n] > rec.markers[n] && rec.markers[n] >= 1);
  out.live[u] = rec;
}
writeFileSync(new URL("./http-probe.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
