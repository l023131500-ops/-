// פריסה: האם «הופק על ידי» של שורת רשימת העבודה הגיע אל הכתובת החיה.
//
// אותם ארבעה מסומני NEW, ארבעת ה-DIFF וארבעת ה-OLD של
// QA/bkalot-clone/produced-by-list-ui-0816/http-probe.mjs, מילה במילה ובמכוון:
// שם הם החזירו 0 בייצור ו-≥1 במקור, וכאן הם צריכים להתהפך אל שוויון. הצד השני
// של אותה מדידה בדיוק, ולא ניסוח שני שלה.
//
// «הופק על ידי» אינו NEW כאן אלא DIFF: a6e8844 כבר פרסה אותו ככותרת עמודה במסך
// הפנייה, ומסומן שמחזיר true על שתי הגרסאות אינו מודד דבר (המלכודת של 530fb44,
// 29d6ac6, e12acf9). כך גם fillProducedCell ו-Object.hasOwn, ו-documents_count
// שנכשל כבקרה ב-UI (6 מול 2) והועבר לכאן שם בכתב — הוא נשאר כאן ולא חוזר בשקט
// ל-OLD.
//
// ה-OLD הם בקרה: קיימים בשתי הגרסאות ובאותו מספר בדיוק, ולכן הם מראים
// שמסומני NEW נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה. שתי כתובות הבקרה אינן
// אמורות לזוז בפריסה הזאת.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1 בלי BOM נקרא כאן כ-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const URLS = [
  "https://more30.com/bkalot-studio/admin",
  "https://more30.com/bkalot-studio/admin/",
];
const CONTROL = [
  "https://more30.com/bkalot-studio/",
  "https://more30.com/",
];
// ייחודיים לשורה שברשימה: 0 בייצור לפני, = המקור אחרי.
const NEW = [
  "function producedBit(c)",
  "const produced = producedBit(c);",
  "last_produced_by_name",
  "מי הפיק אינו ידוע",
];
// קיימים בשתי הגרסאות; המספר הוא מה שגדל.
const DIFF = ["הופק על ידי", "fillProducedCell", "Object.hasOwn", "documents_count"];
// בקרה: אותו מספר בשתי הגרסאות.
const OLD = ["fillDecidedLine", "fillQueueCell", "fillTemplateCell", "decidedBit(c)"];
const count = (h, n) => h.split(n).length - 1;
const ALL = [...NEW, ...DIFF, ...OLD];
const phase = process.argv[2] || "before";

const out = { phase, at: new Date().toISOString(), source_bytes: Buffer.byteLength(SRC, "utf8"), source: {}, live: {}, control: {} };
for (const n of ALL) out.source[n] = count(SRC, n);

for (const u of URLS) {
  const res = await fetch(u + "?cb=" + phase + Math.random().toString(36).slice(2), { headers: { "cache-control": "no-cache" } });
  const html = await res.text();
  const rec = { status: res.status, bytes: Buffer.byteLength(html, "utf8"), markers: {} };
  for (const n of ALL) rec.markers[n] = count(html, n);
  // תו החלפה וכפל-קידוד: אם הם מופיעים, כל ספירת מחרוזת עברית כאן חסרת ערך.
  rec.replacement_chars = count(html, "\uFFFD");
  rec.double_encoded = count(html, "×");
  // ההכרעות נאמרות ולא מונחות.
  rec.new_zero_live = NEW.every((n) => rec.markers[n] === 0);
  rec.new_equals_source = NEW.every((n) => rec.markers[n] === out.source[n] && out.source[n] >= 1);
  rec.diff_below_source = DIFF.every((n) => out.source[n] > rec.markers[n] && rec.markers[n] >= 1);
  rec.diff_equals_source = DIFF.every((n) => rec.markers[n] === out.source[n] && out.source[n] >= 1);
  rec.old_equal = OLD.every((n) => rec.markers[n] === out.source[n] && out.source[n] >= 1);
  out.live[u] = rec;
}
for (const u of CONTROL) {
  const res = await fetch(u + "?cb=" + phase + Math.random().toString(36).slice(2), { headers: { "cache-control": "no-cache" } });
  const html = await res.text();
  out.control[u] = { status: res.status, bytes: Buffer.byteLength(html, "utf8") };
}
writeFileSync(new URL(`./http-${phase}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
