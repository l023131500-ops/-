// Verifies gen-app-manifests.mjs reproduces the committed apps/<NN>-<slug>/app.json
// files EXACTLY, without ever writing into the real tree.
//
// Why this exists: the generator rewrites all 31 manifests, so a hand-edit to any
// app.json is a loaded gun — the next run silently reverts it. This harness copies
// the generator into a throwaway root, runs it there, and diffs the bytes back.
// Run: node scripts/qa/verify-app-manifests.mjs
import { mkdtempSync, mkdirSync, rmSync, cpSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GEN = resolve(ROOT, "scripts", "gen-app-manifests.mjs");

const tmp = mkdtempSync(join(tmpdir(), "app-manifests-"));
let failures = 0;
let compared = 0;
try {
  mkdirSync(join(tmp, "scripts"), { recursive: true });
  cpSync(GEN, join(tmp, "scripts", "gen-app-manifests.mjs"));
  execFileSync(process.execPath, [join(tmp, "scripts", "gen-app-manifests.mjs")], { stdio: "pipe" });

  for (const dir of readdirSync(join(tmp, "apps"))) {
    const generated = readFileSync(join(tmp, "apps", dir, "app.json"));
    const realPath = join(ROOT, "apps", dir, "app.json");
    if (!existsSync(realPath)) {
      console.log(`NEW      ${dir} — no committed app.json to compare`);
      continue;
    }
    compared++;
    const real = readFileSync(realPath);
    // Compare bytes first (catches a cp1255 re-encode on the Hebrew strings), then
    // fall back to an EOL-normalised compare so CRLF-vs-LF is reported as its own,
    // much weaker, class of difference.
    if (generated.equals(real)) {
      console.log(`OK       ${dir}`);
    } else if (generated.toString("utf8").replace(/\r\n/g, "\n") === real.toString("utf8").replace(/\r\n/g, "\n")) {
      console.log(`EOL-ONLY ${dir} — content identical, line endings differ`);
    } else {
      failures++;
      console.log(`DIFFERS  ${dir}`);
      const g = JSON.parse(generated.toString("utf8"));
      const r = JSON.parse(real.toString("utf8"));
      for (const k of new Set([...Object.keys(g), ...Object.keys(r)])) {
        const gv = JSON.stringify(g[k]);
        const rv = JSON.stringify(r[k]);
        if (gv !== rv) console.log(`           ${k}: generated=${gv} committed=${rv}`);
      }
    }
  }

  // The generator must not emit mojibake: every byte it writes should round-trip.
  const sixteen = readFileSync(join(tmp, "apps", "16-chatzor-connect", "app.json")).toString("utf8");
  const hasReplacementChar = sixteen.includes("�");
  console.log(`\n16 Hebrew round-trip: ${hasReplacementChar ? "FAIL (U+FFFD present)" : "OK"}`);
  if (hasReplacementChar) failures++;

  console.log(`\nCompared ${compared} manifests, ${failures} differing.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(failures === 0 ? 0 : 1);
