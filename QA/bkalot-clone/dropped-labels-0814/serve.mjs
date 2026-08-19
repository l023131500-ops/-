// שני שרתים סטטיים באותה ריצה: 8148 מגיש את הגרסה שבייצור (git show HEAD)
// ו-8149 את הקובץ המתוקן. שניהם מדברים אל אותו edge חי — ENDPOINT ב-index.html
// הוא כתובת מוחלטת — ולכן ההבדל שנמדד יכול להיות רק בין שתי גרסאות של המסך.
//
// prev מחולץ ב-execFileSync עם encoding:"buffer": צינור PowerShell מוסיף BOM
// והעברית נהרסת בדרך.
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const GIT = "C:\\Users\\USER\\AppData\\Local\\GitHubDesktop\\app-3.6.3\\resources\\app\\git\\cmd\\git.exe";

const prev = execFileSync(GIT, ["show", "HEAD:apps/37-bkalot-clone/index.html"], {
  cwd: ROOT, encoding: "buffer", maxBuffer: 32 * 1024 * 1024,
});
mkdirSync(join(HERE, "prev"), { recursive: true });
writeFileSync(join(HERE, "prev", "index.html"), prev);

const fixed = readFileSync(join(ROOT, "apps", "37-bkalot-clone", "index.html"));
console.log(JSON.stringify({ prev_bytes: prev.length, fixed_bytes: fixed.length }));

function serve(port, buf) {
  createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(buf);
  }).listen(port, () => console.log("listening " + port));
}
serve(8148, prev);
serve(8149, fixed);
