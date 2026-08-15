// הצד השני של המדידה: מה שבייצור עדיין אינו יודע לומר בשורת הרשימה.
//
// כמו ב-3da9647, «הופק על ידי» כבר נמצא בייצור — a6e8844 פרסה את שורת המסמך
// שבתוך הפנייה, על כותרת עמודה שנושאת בדיוק את המילים האלה. לכן מסומן שמחפש
// את המחרוזת הזו לבדה מחזיר true על שתי הגרסאות ואינו מודד דבר (המלכודת של
// 530fb44, 29d6ac6, e12acf9). מסומני NEW כאן ייחודיים לשורה שברשימה: שם
// הפונקציה, הקריאה לה מתוך render, והשדה שהיא קוראת.
//
// מסומני DIFF קיימים בשתי הגרסאות והמספר הוא מה שהשתנה — «הופק על ידי» גדל
// כי נוספה לו הופעה שנייה, ו-fillProducedCell ו-Object.hasOwn גדלו בטקסט
// (ההערה החדשה מזכירה את שניהם בשמם) ולא רק בקוד. הם נמדדים בהפרש ולא
// בנוכחות, ולא הועברו בשקט ל-OLD.
//
// מסומני OLD הם בקרה: קיימים בשתי הגרסאות ובאותו מספר בדיוק, ולכן הם מראים
// שמסומני NEW נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1 בלי BOM נקרא כאן כ-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const URLS = [
  "https://more30.com/bkalot-studio/admin",
  "https://more30.com/bkalot-studio/admin/",
];
// ייחודיים לשורה שברשימה: 0 בייצור, ≥1 במקור.
const NEW = [
  "function producedBit(c)",
  "const produced = producedBit(c);",
  "last_produced_by_name",
  "מי הפיק אינו ידוע",
];
// נמדדים בהפרש: קיימים בשתי הגרסאות, והמספר הוא מה שהשתנה.
//
// ⚠️ documents_count היה כאן תחילה כבקרה והחזיר 6 מול 2 — כלומר נכשל כבקרה.
//    הסיבה נמדדה ולא הונחה: ההערה החדשה מזכירה אותו בשמו שלוש פעמים, והקוד
//    החדש קורא אותו פעם אחת. הוא הועבר לכאן ולא תוקן בשקט — בקרה שנכשלת
//    ומוסתרת גרועה מבקרה שלא הייתה.
const DIFF = ["הופק על ידי", "fillProducedCell", "Object.hasOwn", "documents_count"];
// בקרה: אותו מספר בשתי הגרסאות.
const OLD = ["fillDecidedLine", "fillQueueCell", "fillTemplateCell", "decidedBit(c)"];
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
  // ההכרעות נאמרות ולא מונחות: NEW חייב 0 בייצור ו-≥1 במקור, DIFF חייב לגדול
  // כשהוא כבר קיים בייצור, ו-OLD חייב שוויון.
  rec.new_zero_live = NEW.every((n) => rec.markers[n] === 0);
  rec.new_present_source = NEW.every((n) => out.source[n] >= 1);
  rec.diff_grew = DIFF.every((n) => out.source[n] > rec.markers[n] && rec.markers[n] >= 1);
  rec.old_equal = OLD.every((n) => rec.markers[n] === out.source[n] && out.source[n] >= 1);
  out.live[u] = rec;
}
writeFileSync(new URL("./http-probe.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
