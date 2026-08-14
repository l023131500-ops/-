// בודק קובץ יחיד מול שלוש רשימות המסומנים. נקרא פעם אחת לכל גרסה:
// המקור, prev (הגרסה שבייצור), ו-portal/dist לפני ואחרי ה-staging.
//
// הקריאה היא ב-readFileSync ולא בצינור PowerShell: צינור מוסיף BOM והופך
// בייטים, ואז ההשוואה מודדת את הצינור ולא את הקובץ.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { report, NEW, REMOVED, OLD } from "./markers.mjs";

const p = process.argv[2];
const b = readFileSync(p);
const t = b.toString("utf8");
console.log(p);
console.log("bytes=" + b.length, "md5=" + createHash("md5").update(b).digest("hex").toUpperCase());
const m = report(t);
console.log("new:", m.new);
console.log("removed:", m.removed);
console.log("old:", m.old);
// ספירה מפורשת: מסומן שאינו מופע יחיד פוסל את עצמו כראיה.
console.log("counts:", [...NEW, ...REMOVED, ...OLD]
  .map((s) => JSON.stringify(s) + "=" + (t.split(s).length - 1)).join(" | "));
