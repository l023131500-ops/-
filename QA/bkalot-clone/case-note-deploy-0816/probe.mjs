// פריסה: האם הסימן «זה הנימוק שהתאים» — ומולו הקריאה ששולחת את מונח החיפוש
// פנימה — הגיעו אל הכתובת החיה.
//
// הצד השני של המדידה של a49f7b4, ולא ניסוח שני שלה: שם המסך נמדד משני שרתים
// סטטיים מקומיים (8138 גרסת HEAD, 8137 עץ העבודה), וכאן אותם מסומנים בדיוק
// צריכים להתהפך מ-0 בייצור אל שוויון עם המקור.
//
// הסיווג נקבע ב-classify.mjs לפני שהקובץ הזה נכתב, ומספריו הם מה שקבע מי יושב
// היכן — נמדד ולא הונח:
//
// NEW (9)  — 0 בייצור, ≥1 במקור. אלה שקונים את הפריסה. שלושת הראשונים הם
//            המוצר עצמו (השדה שהמסך קורא, הנוסח שהוא מצייר וכותרת הבלוק),
//            אחריהם שתי שורות הקוד של openCase, ואחריהן ה-title והתיעוד.
//            ⚠️ מועמד עשירי נבדק ונפסל ב-classify: «והשורה שנלחצה אינה תשובה
//            לה» מחזיר src=0 מפני שהוא שבור על פני שתי שורות הערה במקור —
//            מסומן שמחזיר 0 בשני הצדדים אינו בקרה אלא מדידה שלא נעשתה, והיה
//            נקרא כמו הצלחה.
// DIFF (7) — קיימים בייצור ובמספר שונה. ארבעה מהם הם השימוש האמיתי:
//            Object.hasOwn 12→14 (הכרעה (4)), s.className = "stale" 18→19
//            (הסימן עצמו), td.append 17→18 (השורה שמוסיפה אותו) ו-lastFilters
//            3→7 (הכרעה (1)). שלושת האחרים אינם קוד אלא נוכחות של טקסט —
//            0096 3→4, q-phone 5→6 ו«נמצאה לפי הנימוק» 2→3 גדלו מפני
//            שהתיעוד החדש מזכיר אותם בשמם.
//            ⚠️ «נמצאה לפי הנימוק» סווג מחדש: הוא היה מועמד בקרה (זה מה
//            ש-4da7665 פרס), ו-classify מדד 2→3. מסומן שגדל ונספר כבקרה היה
//            מפיל את old_unchanged ונקרא כמו פריסה שנכשלה.
// OLD (54) — בקרה: אותו מספר בדיוק בשתי הגרסאות, ולכן הם מראים שמסומני NEW
//            נבדקו מול קובץ שהתקבל ולא מול תשובה ריקה. ששת הראשונים הם מה
//            שנשאר ממסומני ה-NEW של 4da7665 — מה שהלבנה הקודמת פרסה הוא
//            הבקרה של זו. matched_in_note נשאר 3 אף שהוא השדה המקביל בדיוק
//            בשורת הרשימה, ולכן הוא הבקרה הצמודה ביותר שיש.
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
  "note_matched",
  "זה הנימוק שהתאים",
  "מונח החיפוש נוסע פנימה",
  "const q = lastFilters.q;",
  'call("case", q ? { id, q } : { id })',
  "מה שהוקלד בחיפוש נמצא בטקסט הזה",
  "הסימן מתאר ואינו מסנן",
  "0097",
  "p_q null בכל פתיחה",
];
const DIFF = [
  "Object.hasOwn",
  's.className = "stale"',
  "lastFilters",
  "td.append",
  "0096",
  "q-phone",
  "נמצאה לפי הנימוק",
];
const OLD = [
  "noteMatchBit",
  "matched_in_note",
  "הוא נמצא בנימוק שנכתב ביומן ההכרעות",
  "פתחו את הפנייה כדי לקרוא אותו",
  "ראשון מבין הסימנים ולא אחרון",
  "meta.append",
  "0091",
  "0093",
  "note_required",
  "דחייה חייבת נימוק",
  "חובה לדחייה בלבד",
  "אפשר להשאיר ריק, למעט דחייה",
  "אחיו של note_too_long",
  "והפך לשקר בשלישו",
  "השני מבין השניים שהמנהל מתקן בעצמו",
  "מלמדת לא להקליד",
  "0095",
  "decidedBit",
  "noteInput.focus()",
  "לא נרשמה שורת יומן",
  "note_too_long",
  "syncNoteCount",
  "out?.error",
  "decider_required",
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
  "qPhone",
  "חופש לפי",
  "q_phone",
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
