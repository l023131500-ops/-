// חילוץ הגרסה שבייצור (a3a3405^) ל-prev/admin.html.
// execFileSync עם encoding:"buffer" ולא צינור PowerShell — צינור מוסיף BOM
// והופך בייטים, ואז ההשוואה מודדת את הצינור ולא את הקובץ.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";

const base = process.env.LOCALAPPDATA + "\\GitHubDesktop";
const app = readdirSync(base).filter((d) => d.startsWith("app-")).sort().pop();
const git = `${base}\\${app}\\resources\\app\\git\\cmd\\git.exe`;

const buf = execFileSync(git, ["show", "a3a3405^:apps/37-bkalot-clone/admin.html"], {
  cwd: process.cwd(),
  encoding: "buffer",
  maxBuffer: 1 << 26,
});
mkdirSync("prev", { recursive: true });
writeFileSync("prev/admin.html", buf);
console.log("prev/admin.html", buf.length, "bytes via", git);
