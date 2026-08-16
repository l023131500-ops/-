// פריסה: האם «רצף ההכרעות» של מסך הפנייה הגיע אל הכתובת החיה.
//
// אותם שישה מסומני NEW, ששת ה-DIFF וארבעת ה-OLD של
// QA/bkalot-clone/status-history-ui-0816/http-probe.mjs, מילה במילה ובמכוון:
// שם הם החזירו 0 בייצור ו-≥1 במקור, וכאן הם צריכים להתהפך אל שוויון. הצד השני
// של אותה מדידה בדיוק, ולא ניסוח שני שלה.
//
// ⚠️ שלושת האחרונים ב-DIFF (fillProducedCell, fillDecidedLine, «החשבון אינו קיים
// עוד») היו תחילה ב-OLD כבקרה ונכשלו שם — הם לא זזו בקוד אלא בטקסט, מפני שההערה
// החדשה של fillHistoryWhoCell מזכירה את שתי הפונקציות בשמן והנוסח חוזר בתא
// החדש. הם נשארים כאן ב-DIFF ואינם חוזרים בשקט ל-OLD.
//
// ה-OLD הם בקרה: קיימים בשתי הגרסאות ובאותו מספר בדיוק, ולכן הם מראים שמסומני
// NEW נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה. שתי כתובות הבקרה אינן אמורות
// לזוז בפריסה הזאת.
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
  "רצף ההכרעות",
  "fillHistoryWhoCell",
  "status_history",
  "מפתח שורה ולא מונה",
  "אין השלמה למפרע",
  "השרת אינו מחזיר את יומן ההכרעות",
];
const DIFF = ["Object.hasOwn", "מעברים", "מי הכריע", "fillProducedCell", "fillDecidedLine", "החשבון אינו קיים עוד"];
const OLD = ["fillQueueCell", "fillTemplateCell", "תווי טקסט", "fillCreatedCell"];

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
