// אותו הרכב כמו topic-no-invalid-ui-0814: 8154 מגיש את הגרסה שבייצור
// (git show HEAD, אחרי 5e867c7 — כלומר מה שנפרס ב-dpl_6Gmiodb7CQJAhAgQ4FPD248UDqgW)
// ו-8155 את הקובץ המתוקן. שניהם מדברים אל אותו edge חי ואל אותו מסד — ENDPOINT
// ב-index.html הוא כתובת מוחלטת — ולכן ההבדל שנמדד יכול להיות רק בין שתי
// גרסאות של המסך.
//
// prev מחולץ ב-execFileSync עם encoding:"buffer": צינור PowerShell מוסיף BOM
// והעברית נהרסת בדרך.
//
// נתיב ה-git נפתר ואינו מודבק: תיקיית app-<גרסה> של GitHub Desktop מתחלפת
// בעדכון אוטומטי, ונתיב קשיח מת באמצע ריצה (3.5.4 → 3.6.3).
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");

const GH = join(process.env.LOCALAPPDATA, "GitHubDesktop");
const APP = readdirSync(GH).filter((d) => d.startsWith("app-")).sort().reverse()[0];
const GIT = join(GH, APP, "resources", "app", "git", "cmd", "git.exe");

const prev = execFileSync(GIT, ["show", "HEAD:apps/37-bkalot-clone/index.html"], {
  cwd: ROOT, encoding: "buffer", maxBuffer: 32 * 1024 * 1024,
});
mkdirSync(join(HERE, "prev"), { recursive: true });
writeFileSync(join(HERE, "prev", "index.html"), prev);

const fixed = readFileSync(join(ROOT, "apps", "37-bkalot-clone", "index.html"));
const md5 = (b) => createHash("md5").update(b).digest("hex").toUpperCase();
const versions = {
  git: GIT,
  prev_bytes: prev.length, prev_md5: md5(prev),
  fixed_bytes: fixed.length, fixed_md5: md5(fixed),
};
writeFileSync(join(HERE, "versions.json"), JSON.stringify(versions, null, 2));
console.log(JSON.stringify(versions));

function serve(port, buf) {
  createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(buf);
  }).listen(port, () => console.log("listening " + port));
}
serve(8154, prev);
serve(8155, fixed);
