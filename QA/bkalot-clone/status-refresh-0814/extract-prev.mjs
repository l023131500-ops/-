import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const GIT = "C:/Users/USER/AppData/Local/GitHubDesktop/app-3.6.3/resources/app/git/cmd/git.exe";
const buf = execFileSync(GIT, ["show", "HEAD:apps/37-bkalot-clone/admin.html"], { cwd: "C:/Users/USER/Downloads/more30", maxBuffer: 1e8, encoding: "buffer" });
writeFileSync(new URL("./prev/admin.html", import.meta.url), buf);
console.log("prev bytes " + buf.length);
