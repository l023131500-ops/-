// סיווג מוקדם: כמה כל מסומן מופיע במקור וכמה בייצור, לפני שנקבע מי NEW, מי DIFF
// ומי בקרה. תקלת 0087 — שתי ריצות משתי גרסאות של אותו כלי — נמנעת בכך שהסיווג
// נקבע כאן פעם אחת, ו-probe.mjs נכתב אחריו ורץ פעמיים בדיוק כפי שהוא.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const LIVE = await (await fetch(
  "https://more30.com/bkalot-studio/admin?cb=classify" + Math.random().toString(36).slice(2),
  { headers: { "cache-control": "no-cache" } },
)).text();

const CAND = [
  // מועמדי NEW — נולדו ב-4a66637
  "note_required", "דחייה חייבת נימוק", "חובה לדחייה בלבד",
  "אפשר להשאיר ריק, למעט דחייה", "אחיו של note_too_long",
  "והפך לשקר בשלישו", "השני מבין השניים שהמנהל מתקן בעצמו",
  "מלמדת לא להקליד", "0095",
  // מועמדי DIFF — קיימים בייצור והלבנה החדשה משתמשת בהם שוב
  "noteInput.focus()", "לא נרשמה שורת יומן", "note_too_long", "syncNoteCount",
  "אפשר להשאיר ריק", "out?.error",
  // מועמדי בקרה — מסומני ה-NEW וה-DIFF של f8f2dfc/e2ea093 ועוד ותיקים
  "clamp-note", "clampNote", "הרשימה התקצרה בזמן העבודה", "האחרון שיש בו פניות",
  "cnote", "const from = Math.floor(offset / PAGE) + 1", "clampNote === null",
  "מספר העמוד קפץ בלי שנאמר למה", "reclamped", "load(true)",
  "הרשימה מתקצרת בשרת", "ואינו רודף אחריו", "מעבר לסוף הרשימה",
  "const cases = data.cases", "offset > 0", "Math.ceil(total / PAGE)",
  "q-phone", "qPhone", "חופש לפי", "q_phone", "0093",
  "list-error", "decider_required", "why-input", "td.why", "רצף ההכרעות",
  "handsBit", "producedBit", "fillQueueCell", "fillTemplateCell",
  "fillCreatedCell", "מי הכריע", "fillHistoryNoteCell",
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
