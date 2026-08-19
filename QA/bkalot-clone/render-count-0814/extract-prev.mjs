// חילוץ הגרסה שבייצור מ-HEAD. encoding:"buffer" ולא צינור PowerShell — צינור
// מוסיף BOM ומחליף תווים, והקובץ שנמדד היה נהיה קובץ אחר.
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";

const base = process.env.LOCALAPPDATA + "\\GitHubDesktop";
const app = readdirSync(base).filter((n) => n.startsWith("app-")).sort().reverse()[0];
const GIT = `${base}\\${app}\\resources\\app\\git\\cmd\\git.exe`;

const buf = execFileSync(GIT, ["show", "HEAD:apps/37-bkalot-clone/admin.html"], {
  cwd: "C:/Users/USER/Downloads/more30", maxBuffer: 1e8, encoding: "buffer",
});
writeFileSync(new URL("./prev/admin.html", import.meta.url), buf);
console.log("git " + app + " · prev bytes " + buf.length);
