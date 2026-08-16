// סיווג מוקדם: כמה כל מסומן מופיע במקור (a49f7b4) וכמה בייצור, לפני שנקבע מי
// NEW, מי DIFF ומי בקרה. תקלת 0087 — שתי ריצות משתי גרסאות של אותו כלי — נמנעת
// בכך שהסיווג נקבע כאן פעם אחת, ו-probe.mjs נכתב אחריו ורץ פעמיים בדיוק כפי
// שהוא, בלי שינוי ביניהן.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const LIVE = await (await fetch(
  "https://more30.com/bkalot-studio/admin?cb=classify" + Math.random().toString(36).slice(2),
  { headers: { "cache-control": "no-cache" } },
)).text();

const CAND = [
  // מועמדי NEW — נולדו ב-a49f7b4
  "note_matched",
  "זה הנימוק שהתאים",
  "מונח החיפוש נוסע פנימה",
  "const q = lastFilters.q;",
  'call("case", q ? { id, q } : { id })',
  "מה שהוקלד בחיפוש נמצא בטקסט הזה",
  "הסימן מתאר ואינו מסנן",
  "0097",
  "p_q null בכל פתיחה",
  "והשורה שנלחצה אינה תשובה לה",
  // מועמדי DIFF — קיימים בייצור והלבנה החדשה משתמשת בהם שוב
  "Object.hasOwn",
  's.className = "stale"',
  "lastFilters",
  "td.append",
  "0096",
  "q-phone",
  // מועמדי בקרה — מסומני ה-NEW של 4da7665 (מה שהלבנה הקודמת פרסה) ועוד ותיקים
  "noteMatchBit",
  "נמצאה לפי הנימוק",
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

const count = (h, n) => h.split(n).length - 1;
const rows = CAND.map((m) => ({ marker: m, src: count(SRC, m), live: count(LIVE, m) }));
const out = {
  src_bytes: Buffer.byteLength(SRC, "utf8"),
  live_bytes: Buffer.byteLength(LIVE, "utf8"),
  rows,
};
writeFileSync(new URL("./classify.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
for (const r of rows) console.log(`${r.src === 0 || r.live === 0 ? "*" : " "} src=${r.src}\tlive=${r.live}\t${r.marker}`);
console.log("bytes", out.src_bytes, out.live_bytes);
