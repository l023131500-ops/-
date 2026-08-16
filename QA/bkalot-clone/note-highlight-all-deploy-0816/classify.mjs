// classify.mjs — src מול dist, לפני שהכתובת החיה נפגשת. מסווג כל סימן ל-
// NEW (0 ב-dist, ≥1 ב-src) / REMOVED (≥1 ב-dist, 0 ב-src) / DIFF / CONTROL,
// ומוציא dead — סימן שאינו קיים באף אחד מהשניים ולכן אינו יכול להכריע דבר.
//
// ⚠️ יש להריץ **לפני** stage-portal.ps1 ולא אחריו. ה-staging מעתיק את המקור
// אל dist, ומאותו רגע שני הקבצים זהים והסיווג נמחק: הרצה חוזרת אחרי staging
// מחזירה CONTROL על הכל ואפס NEW — תוצאה שנראית תקינה ואינה מודדת דבר.
// classify.json שב-commit הוא ההרצה שלפני ה-staging, וזו היחידה שמכריעה.
//
// ⚠️ ולכן הפעם יש שמירה ולא רק הערה (6849803): אם dist זהה ל-src, הסקריפט
// יוצא בקוד 2 ואינו כותב את classify.json מחדש.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { MARKERS, tally } from "./markers.mjs";

const SRC  = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html";
const DIST = "C:/Users/USER/Downloads/more30/portal/dist/bkalot-studio/admin.html";

const srcBuf = readFileSync(SRC), distBuf = readFileSync(DIST);
const src = srcBuf.toString("utf8"), dist = distBuf.toString("utf8");
const md5 = (b) => createHash("md5").update(b).digest("hex").toUpperCase().slice(0, 8);

if (md5(srcBuf) === md5(distBuf)) {
  console.error("REFUSED: dist זהה ל-src — ה-staging כבר רץ, ואין כאן מה לסווג.");
  process.exit(2);
}

const ts = tally(src), td = tally(dist);
const groups = { NEW: [], REMOVED: [], DIFF: [], CONTROL: [], DEAD: [] };
for (const m of MARKERS) {
  const s = ts[m.key], d = td[m.key];
  const g = (s === 0 && d === 0) ? "DEAD"
          : (d === 0 && s > 0) ? "NEW"
          : (s === 0 && d > 0) ? "REMOVED"
          : (s === d) ? "CONTROL" : "DIFF";
  groups[g].push({ key: m.key, src: s, dist: d });
}

const out = {
  src:  { path: SRC,  bytes: srcBuf.length,  md5: md5(srcBuf) },
  dist: { path: DIST, bytes: distBuf.length, md5: md5(distBuf) },
  groups,
};
writeFileSync(new URL("./classify.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
