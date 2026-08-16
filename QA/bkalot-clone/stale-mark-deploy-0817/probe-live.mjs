// probe-live.mjs — סופר את אותם סימנים בדיוק בגוף שהכתובת החיה מחזירה.
//
// שתי כתובות, עם לוכסן ובלעדיו, כי rewrite שמכסה אחת ולא את השנייה נראה כמו
// פריסה שהצליחה. cachebust על כל קריאה — gannenet-dev-served-by-stale-sw
// ו-no-git-deploy-via-vercel-cli: שניות אחרי פריסה הכתובת עדיין מגישה את
// ה-HTML הקודם.
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tally } from "./markers.mjs";

const when = process.argv[2] || "probe";
const stamp = process.argv[3] || String(process.hrtime.bigint());
const URLS = [
  "https://more30.com/bkalot-studio",
  "https://more30.com/bkalot-studio/",
];

const out = { when, urls: {} };
for (const u of URLS) {
  const r = await fetch(`${u}?cachebust=${stamp}`, { headers: { "cache-control": "no-cache" } });
  const buf = Buffer.from(await r.arrayBuffer());
  const text = buf.toString("utf8");
  out.urls[u] = {
    status: r.status,
    bytes: buf.length,
    md5: createHash("md5").update(buf).digest("hex").toUpperCase().slice(0, 8),
    // deployed-html-double-encoded-cp1255 — תו החלפה או «×» בגוף עברי הוא
    // הסימן שהקידוד נשבר, וקובץ כזה מחזיר 200 ונראה בריא.
    replacement_chars: (text.match(/�/g) || []).length,
    times_char: (text.match(/×/g) || []).length,
    markers: tally(text),
  };
}
writeFileSync(new URL(`./live-${when}.json`, import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
