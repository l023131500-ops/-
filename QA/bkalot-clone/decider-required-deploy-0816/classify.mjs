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
  // מועמדי NEW — נולדו ב-53a3e5a
  "decider_required", "הסשן לא מסר מי מכריע", "לא נרשמה שורת יומן",
  "צאו והתחברו מחדש ונסו שוב", "0092 הכרעות", "מספר שלם בטוח",
  // מועמדי DIFF — קיימים בייצור והוזכרו שוב בהערה החדשה
  "invalid_session", "token_required", "0076", "הסשן פג", "שערי הקלט",
  // מועמדי בקרה
  "note_too_long", "why-input", "syncNoteCount", "td.why", "רצף ההכרעות",
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
console.log(JSON.stringify(out, null, 2));
