// הצד השני של המדידה: מה שנמדד בדפדפן רץ מול שרת סטטי מקומי, ולכן מדד את הקוד
// ולא את המוצר. כאן נמדד מה שיושב עכשיו בייצור — כדי שהפער יהיה כתוב במספרים
// ולא בהצהרה, ושהפריסה שאחריה תהיה מדידה הפוכה של אותם מסומנים בדיוק.
//
// שלוש קבוצות ולא אחת:
//   NEW  — חייב 0 בייצור ו-≥1 במקור. מסומן שמחזיר true על שתי הגרסאות אינו מודד
//          דבר, וזו המלכודת של 530fb44, 29d6ac6 ו-e12acf9.
//   DIFF — קיים בשתיהן ובמספר שונה.
//   OLD  — בקרה: חייב להיות זהה בשתיהן. אם OLD זז, נמדדו שני קבצים שונים ולא
//          שתי גרסאות של אותו קובץ.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const URLS = [
  "https://more30.com/bkalot-studio/admin",
  "https://more30.com/bkalot-studio/admin/",
];

const NEW = [
  "רצף ההכרעות",
  "fillHistoryWhoCell",
  "status_history",
  "מפתח שורה ולא מונה",
  "אין השלמה למפרע",
  "השרת אינו מחזיר את יומן ההכרעות",
];
// ⚠️ שלושת האחרונים היו תחילה ב-OLD כבקרה, ונכשלו: fillProducedCell 6→7,
//    fillDecidedLine 5→6 ו«החשבון אינו קיים עוד» 5→6. הם לא זזו בקוד אלא בטקסט —
//    ההערה החדשה של fillHistoryWhoCell מזכירה את שתי הפונקציות בשמן, והנוסח
//    «החשבון אינו קיים עוד» חוזר בתא החדש מפני שהוא אותו מצב בדיוק. הועברו
//    ל-DIFF ולא תוקנו בשקט — אותה תקלה בדיוק שנרשמה ב-heartbeat 619.
const DIFF = ["Object.hasOwn", "מעברים", "מי הכריע", "fillProducedCell", "fillDecidedLine", "החשבון אינו קיים עוד"];
// OLD: קיימים בייצור מאז 839386a ואינם אמורים לזוז בפעימה הזו — לא בקוד ולא
// בטקסט. הפעימה אינה נוגעת בתא התור, בתא התבנית ובמונה התווים.
const OLD = ["fillQueueCell", "fillTemplateCell", "תווי טקסט", "fillCreatedCell"];

const count = (hay, needle) => hay.split(needle).length - 1;
const measure = (text) => {
  const o = {};
  for (const m of [...NEW, ...DIFF, ...OLD]) o[m] = count(text, m);
  return o;
};

const out = { source: { bytes: Buffer.byteLength(SRC, "utf8"), markers: measure(SRC) }, live: {} };
for (const u of URLS) {
  const res = await fetch(u + "?cb=" + Buffer.from(String(URLS.indexOf(u))).toString("hex") + "0089", { headers: { "cache-control": "no-cache" } });
  const body = await res.text();
  out.live[u] = {
    status: res.status,
    bytes: Buffer.byteLength(body, "utf8"),
    replacement_chars: count(body, "\uFFFD"),
    // כפל-קידוד cp1255→utf8 מייצר את הרצף הזה; אפס הוא מה שנדרש.
    double_encoded: count(body, "×"),
    markers: measure(body),
  };
}

out.verdict = {};
for (const u of URLS) {
  const L = out.live[u].markers, S = out.source.markers;
  out.verdict[u] = {
    new_zero_in_live: NEW.every((m) => L[m] === 0 && S[m] >= 1),
    diff_moved: Object.fromEntries(DIFF.map((m) => [m, `${L[m]} → ${S[m]}`])),
    old_unchanged: OLD.every((m) => L[m] === S[m]),
    old_values: Object.fromEntries(OLD.map((m) => [m, `${L[m]} = ${S[m]}`])),
  };
}
writeFileSync(new URL("./http-probe.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
