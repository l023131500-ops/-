// חילוץ הגרסה שבייצור מ-git show HEAD, ב-execFileSync עם encoding:"buffer"
// ולא דרך צינור PowerShell: צינור מוסיף BOM והעברית שבקובץ נהרסת, ואז ההשוואה
// בין שתי הגרסאות הייתה מודדת קידוד ולא קוד.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const GIT = process.argv[2];
const out = new URL("./prev/", import.meta.url).pathname.slice(1);
mkdirSync(out, { recursive: true });

const buf = execFileSync(GIT, ["show", "HEAD:apps/37-bkalot-clone/admin.html"], {
  cwd: "C:/Users/USER/Downloads/more30", encoding: "buffer", maxBuffer: 64 * 1024 * 1024,
});
writeFileSync(out + "admin.html", buf);
console.log(JSON.stringify({
  bytes: buf.length,
  md5: createHash("md5").update(buf).digest("hex").toUpperCase(),
}));
