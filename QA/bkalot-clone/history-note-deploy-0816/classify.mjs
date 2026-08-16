// סיווג מוקדם: כמה כל מסומן מופיע במקור ובייצור, לפני שנקבע מי NEW מי DIFF ומי
// בקרה. תקלת 0087 — שתי ריצות משתי גרסאות של אותו כלי — נמנעת בכך שהסיווג נקבע
// כאן פעם אחת, ו-probe.mjs נכתב אחריו ורץ פעמיים בדיוק כפי שהוא.
import { readFileSync, writeFileSync } from "node:fs";
const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const LIVE = await (await fetch("https://more30.com/bkalot-studio/admin?cb=classify" + Math.random().toString(36).slice(2), { headers: { "cache-control": "no-cache" } })).text();
const CAND = [
  "fillHistoryNoteCell", "td.why", "השרת אינו מחזיר את הנימוק", "לא נכתב נימוק על המעבר הזה",
  "<th>למה</th>", "תווים, כפי שנשמרו", "note_too_long", "overflow-wrap",
  "fillHistoryWhoCell", "Object.hasOwn", "מי הכריע", "רצף ההכרעות",
  "handsBit", "producedBit", "fillQueueCell", "fillTemplateCell", "fillCreatedCell",
];
const count = (h, n) => h.split(n).length - 1;
const rows = CAND.map((m) => ({ marker: m, src: count(SRC, m), live: count(LIVE, m) }));
const out = { src_bytes: Buffer.byteLength(SRC, "utf8"), live_bytes: Buffer.byteLength(LIVE, "utf8"), rows };
writeFileSync(new URL("./classify.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
