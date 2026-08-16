// פריסה: האם «כמה ידיים עברו» של שורת רשימת העבודה הגיע אל הכתובת החיה.
//
// הצד השני של המדידה של 74dbf7d, ולא ניסוח שני שלה: שם handsBit נמדד מהמקור מול
// ה-DB החי, וכאן אותם מסומנים בדיוק צריכים להתהפך מ-0 בייצור אל שוויון עם המקור.
//
// NEW  — קיימים במקור ואינם קיימים בייצור לפני. אלה שקונים את הפריסה.
// DIFF — קיימים בשתי הגרסאות ובמספר שונה; ההערה החדשה של handsBit מזכירה בשמן
//        פונקציות ונוסחים שכבר בייצור, ולכן הם גדלים ואינם נולדים.
// OLD  — בקרה: קיימים בשתי הגרסאות ובאותו מספר בדיוק, ולכן הם מראים שמסומני NEW
//        נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה. שתי כתובות בקרה אינן אמורות
//        לזוז בפריסה הזאת.
//
// ⚠️ שלושה מסומנים סווגו מחדש אחרי ריצת before ראשונה, בכתב ולא בשקט:
//    «מעבר אחד» תוכנן NEW ונמדד 3 בייצור — countHe במסך הפנייה כבר אומר אותו מאז
//    8a577bc, ולכן הוא DIFF (3→4) ולא לידה. fillHistoryWhoCell תוכנן OLD ונמדד
//    2 מול 3 — ההערה החדשה של handsBit מזכירה אותו בשמו, ולכן הוא DIFF (2→3);
//    אותה תקלה בדיוק שנרשמה ב-heartbeat 619 וב-8a577bc. producedBit תוכנן DIFF
//    ונמדד 2=2 — הוא בייצור מאז 839386a וההערה החדשה אינה נוגעת בו, ולכן הוא
//    בקרה. מסומן שמחזיר את אותו ערך בשתי הגרסאות אינו מודד פריסה, ומסומן שזז
//    אינו בקרה; שתי הטעויות נרשמות ואינן נבלעות.
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
  "handsBit",
  "status_changes_count",
  "status_deciders_count",
  "מנהל אחד",
  "מעברים ולא לחיצות",
];
const DIFF = [
  "Object.hasOwn",
  "countHe",
  "מי הכריע אינו ידוע",
  "case_status_log_is_a_change",
  "מעבר אחד",
  "fillHistoryWhoCell",
];
const OLD = ["fillQueueCell", "fillTemplateCell", "תווי טקסט", "fillCreatedCell", "producedBit"];

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
console.log(JSON.stringify(out, null, 2));
