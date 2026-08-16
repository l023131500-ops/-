// פריסה: האם המשפט שמסביר למה דחייה נחסמה — במקום הקוד באנגלית — הגיע אל
// הכתובת החיה.
//
// הצד השני של המדידה של 4a66637, ולא ניסוח שני שלה: שם הנוסח נמדד משני שרתים
// סטטיים מקומיים (8138 הגרסה שבייצור, 8137 המתוקנת), וכאן אותם מסומנים בדיוק
// צריכים להתהפך מ-0 בייצור אל שוויון עם המקור.
//
// הסיווג נקבע ב-classify.mjs לפני שהקובץ הזה נכתב, ומספריו הם מה שקבע מי יושב
// היכן — נמדד ולא הונח:
//
// NEW (9)  — 0 בייצור, ≥1 במקור. אלה שקונים את הפריסה. שלושתם הראשונים הם
//            המוצר עצמו (הקוד שהמפה מכירה, הנוסח, והתווית), והשאר הם התיעוד
//            שמחזיק אותם.
// DIFF (7) — קיימים בייצור ובמספר שונה. שלושה מהם אינם קוד חדש אלא נוכחות של
//            טקסט: «לא נרשמה שורת יומן» 2→4, note_too_long 5→6 ו-decider_required
//            1→2 גדלו מפני שהתיעוד החדש מזכיר אותם בשמם. שלושת האחרים הם השימוש
//            האמיתי: noteInput.focus() 1→2 (המיקוד החוזר), syncNoteCount 4→5
//            ו-out?.error 6→7 (הענף החדש). «אפשר להשאיר ריק» 1→2 הוא מקרה משלו —
//            הנוסח החדש מכיל את הישן כתת-מחרוזת, ולכן הוא גדל ואינו נולד.
// OLD (32) — בקרה: אותו מספר בדיוק בשתי הגרסאות, ולכן הם מראים שמסומני NEW
//            נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה. שמונת הראשונים הם
//            מסומני ה-NEW של f8f2dfc/e2ea093 — מה שהלבנה הקודמת פרסה הוא הבקרה
//            של זו. why-input נשאר 2 אף שהתיבה שהוא מתאר היא בדיוק מה שהשתנה
//            (התווית והמונה שמעליה ומתחתיה), ולכן הוא הבקרה הצמודה ביותר שיש.
//
// שתי הריצות רצות מהקובץ הזה בדיוק ובלי שינוי ביניהן — תקלת 0087.
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
  "note_required",
  "דחייה חייבת נימוק",
  "חובה לדחייה בלבד",
  "אפשר להשאיר ריק, למעט דחייה",
  "אחיו של note_too_long",
  "והפך לשקר בשלישו",
  "השני מבין השניים שהמנהל מתקן בעצמו",
  "מלמדת לא להקליד",
  "0095",
];
const DIFF = [
  "noteInput.focus()",
  "לא נרשמה שורת יומן",
  "note_too_long",
  "syncNoteCount",
  "אפשר להשאיר ריק",
  "out?.error",
  "decider_required",
];
const OLD = [
  "clamp-note",
  "clampNote",
  "הרשימה התקצרה בזמן העבודה",
  "האחרון שיש בו פניות",
  "cnote",
  "const from = Math.floor(offset / PAGE) + 1",
  "clampNote === null",
  "מספר העמוד קפץ בלי שנאמר למה",
  "reclamped",
  "load(true)",
  "הרשימה מתקצרת בשרת",
  "ואינו רודף אחריו",
  "מעבר לסוף הרשימה",
  "const cases = data.cases",
  "offset > 0",
  "Math.ceil(total / PAGE)",
  "q-phone",
  "qPhone",
  "חופש לפי",
  "q_phone",
  "0093",
  "list-error",
  "why-input",
  "td.why",
  "רצף ההכרעות",
  "handsBit",
  "producedBit",
  "fillQueueCell",
  "fillTemplateCell",
  "fillCreatedCell",
  "מי הכריע",
  "fillHistoryNoteCell",
];

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
  const res = await fetch(u + "?cb=" + phase + Math.random().toString(36).slice(2), {
    headers: { "cache-control": "no-cache" },
  });
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
  const res = await fetch(u + "?cb=" + phase + Math.random().toString(36).slice(2), {
    headers: { "cache-control": "no-cache" },
  });
  const body = await res.text();
  out.control[u] = { status: res.status, bytes: Buffer.byteLength(body, "utf8") };
}

writeFileSync(new URL(`./http-${phase}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
const brief = Object.fromEntries(Object.entries(out.live).map(([u, v]) => [u, {
  status: v.status, bytes: v.bytes, replacement_chars: v.replacement_chars,
  double_encoded: v.double_encoded, new_zero_in_live: v.new_zero_in_live,
  new_equals_source: v.new_equals_source, diff_below_source: v.diff_below_source,
  diff_equals_source: v.diff_equals_source, old_unchanged: v.old_unchanged,
}]));
console.log(JSON.stringify(brief, null, 2));
console.log(JSON.stringify(out.control, null, 2));
