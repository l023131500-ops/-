// פריסה: האם «למה» — הנימוק בטבלת רצף ההכרעות — הגיע אל הכתובת החיה.
//
// הצד השני של המדידה של aff6455, ולא ניסוח שני שלה: שם התא נמדד מקוד שבמקור מול
// אותו edge ואותו מסד חי, וכאן אותם מסומנים בדיוק צריכים להתהפך מ-0 בייצור אל
// שוויון עם המקור.
//
// NEW  — קיימים במקור ואינם קיימים בייצור לפני. אלה שקונים את הפריסה.
// DIFF — קיימים בשתי הגרסאות ובמספר שונה: ההערה החדשה של fillHistoryNoteCell
//        מזכירה בשמם נוסחים שכבר בייצור, ולכן הם גדלים ואינם נולדים.
// OLD  — בקרה: קיימים בשתי הגרסאות ובאותו מספר בדיוק, ולכן הם מראים שמסומני NEW
//        נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה.
//
// הסיווג נקבע ב-classify.mjs לפני הריצה הראשונה ונמדד ולא הונח — «מי הכריע»
// תוכנן בקרה ונמדד 12 בייצור מול 13 במקור (ההערה החדשה מזכירה אותו בשמו), ולכן
// הוא DIFF. שתי הריצות רצות מהקובץ הזה בדיוק ובלי שינוי ביניהן — תקלת 0087, שבה
// שתי ריצות רצו משתי גרסאות של אותו כלי.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
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

const NEW = [
  "fillHistoryNoteCell",
  "td.why",
  "<th>למה</th>",
  "השרת אינו מחזיר את הנימוק",
  "לא נכתב נימוק על המעבר הזה",
  "תווים, כפי שנשמרו",
  "note_too_long",
  "overflow-wrap",
];
const DIFF = ["fillHistoryWhoCell", "Object.hasOwn", "מי הכריע"];
const OLD = ["רצף ההכרעות", "handsBit", "producedBit", "fillQueueCell", "fillTemplateCell", "fillCreatedCell"];

const count = (hay, needle) => hay.split(needle).length - 1;
const ALL = [...NEW, ...DIFF, ...OLD];
const phase = process.argv[2] || "before";
const measure = (text) => Object.fromEntries(ALL.map((m) => [m, count(text, m)]));

const out = {
  phase,
  source: { bytes: Buffer.byteLength(SRC, "utf8"), markers: measure(SRC) },
  live: {},
  control: {},
};

for (const u of URLS) {
  const res = await fetch(u + "?cb=" + phase + Math.random().toString(36).slice(2), { headers: { "cache-control": "no-cache" } });
  const body = await res.text();
  const L = measure(body);
  const S = out.source.markers;
  out.live[u] = {
    status: res.status,
    bytes: Buffer.byteLength(body, "utf8"),
    replacement_chars: count(body, "\uFFFD"),
    // כפל-קידוד cp1255→utf8 מייצר את הרצף הזה; אפס הוא מה שנדרש.
    double_encoded: count(body, "×"),
    markers: L,
    // ההכרעות נאמרות ולא מונחות.
    new_zero_in_live: NEW.every((m) => L[m] === 0 && S[m] >= 1),
    new_equals_source: NEW.every((m) => L[m] === S[m] && S[m] >= 1),
    diff_below_source: DIFF.every((m) => S[m] > L[m] && L[m] >= 1),
    diff_equals_source: DIFF.every((m) => L[m] === S[m] && S[m] >= 1),
    diff_values: Object.fromEntries(DIFF.map((m) => [m, `${L[m]} → ${S[m]}`])),
    old_unchanged: OLD.every((m) => L[m] === S[m] && S[m] >= 1),
    old_values: Object.fromEntries(OLD.map((m) => [m, `${L[m]} = ${S[m]}`])),
  };
}
for (const u of CONTROL) {
  const res = await fetch(u + "?cb=" + phase + Math.random().toString(36).slice(2), { headers: { "cache-control": "no-cache" } });
  const body = await res.text();
  out.control[u] = { status: res.status, bytes: Buffer.byteLength(body, "utf8") };
}

writeFileSync(new URL(`./http-${phase}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out.live, null, 2));
console.log(JSON.stringify(out.control, null, 2));
