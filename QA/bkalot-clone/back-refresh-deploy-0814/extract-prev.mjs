// מחלץ את admin.html כפי שהוא בגרסה שבייצור (13516f0^) לקובץ. execFileSync עם
// encoding:"buffer" ולא צינור PowerShell — צינור מוסיף BOM והופך את הבייטים,
// ואז ההשוואה מודדת את הצינור ולא את הקובץ.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const GIT = process.env.GITBIN;
const out = execFileSync(GIT, ["show", "13516f0^:apps/37-bkalot-clone/admin.html"], {
  encoding: "buffer",
  maxBuffer: 64 * 1024 * 1024,
  cwd: "C:/Users/USER/Downloads/more30",
});
writeFileSync(process.argv[2], out);
console.log("prev bytes:", out.length);
