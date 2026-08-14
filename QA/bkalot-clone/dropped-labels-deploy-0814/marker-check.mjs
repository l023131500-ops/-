// בודק קובץ יחיד מול שלוש רשימות המסומנים. נקרא פעם אחת לכל גרסה:
// המקור, prev (הגרסה שבייצור), ו-portal/dist לפני ואחרי ה-staging.
//
// הקריאה היא ב-readFileSync ולא בצינור PowerShell: צינור מוסיף BOM והופך
// בייטים, ואז ההשוואה מודדת את הצינור ולא את הקובץ.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { report } from "./markers.mjs";

const p = process.argv[2];
const b = readFileSync(p);
console.log(p);
console.log("bytes=" + b.length, "md5=" + createHash("md5").update(b).digest("hex").toUpperCase());
const m = report(b.toString("utf8"));
console.log("new:", m.new);
console.log("removed:", m.removed);
console.log("old:", m.old);
