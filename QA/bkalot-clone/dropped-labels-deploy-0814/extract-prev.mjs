// מחלץ את הגרסה שבייצור (ההורה של a6eb793) לקובץ, ב-execFileSync עם
// encoding:"buffer" ולא דרך צינור PowerShell — צינור מוסיף BOM והופך בייטים,
// ואז ההשוואה מודדת את הצינור ולא את הקובץ.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const GIT = "C:\\Users\\USER\\AppData\\Local\\GitHubDesktop\\app-3.6.3\\resources\\app\\git\\cmd\\git.exe";
const buf = execFileSync(GIT, ["show", "a6eb793^:apps/37-bkalot-clone/index.html"], {
  cwd: "C:\\Users\\USER\\Downloads\\more30",
  encoding: "buffer",
  maxBuffer: 64 * 1024 * 1024,
});
mkdirSync(new URL("./prev/", import.meta.url), { recursive: true });
writeFileSync(new URL("./prev/index.html", import.meta.url), buf);
console.log("prev bytes=" + buf.length, "md5=" + createHash("md5").update(buf).digest("hex").toUpperCase());
