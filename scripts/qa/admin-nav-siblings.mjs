/**
 * §3 — inside the board, does every screen have a way in from its siblings?
 *
 * The nine /admin/<name> screens are served from the portal, and /admin itself
 * is a separate SPA that links to none of them (see admin-screens-reachable.mjs).
 * So once a person is standing on a board screen, the only thing that walks to
 * another board screen is the sibling bar — <nav class="nav"> at the top of each
 * page. A screen that appears in nobody's bar is a screen you can only reach by
 * typing its URL or by re-opening the account menu.
 *
 * That is not the same question admin-screens-reachable.mjs asks. That one asks
 * whether the hub links in; this one asks whether the board is connected to
 * itself. Both were true of /admin/pricing at different times, and the second
 * one is the one no HTTP status can answer.
 *
 * The screen list is parsed from portal/vercel.dist.json, not written here, so
 * a tenth screen is measured the day it gets a route.
 *
 * Reads local source only. No network, no writes.
 *
 *   node scripts/qa/admin-nav-siblings.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** route -> the html file the portal serves for it, straight from the routing. */
function screensFromRouting() {
  const cfg = JSON.parse(readFileSync(join(ROOT, "portal", "vercel.dist.json"), "utf8"));
  return (cfg.rewrites ?? [])
    .filter((r) => /^\/admin\/[a-z-]+$/.test(r.source) && r.destination.endsWith(".html"))
    .map((r) => ({ route: r.source, file: r.destination.replace(/^\//, "") }));
}

/** The board routes a screen's sibling bar walks to. Only <nav class="nav">. */
function barTargets(file) {
  const html = readFileSync(join(ROOT, "portal", "public", file), "utf8");
  const bar = /<nav class="nav">([\s\S]*?)<\/nav>/.exec(html);
  if (!bar) return null;
  return [...bar[1].matchAll(/href="(\/admin\/[a-z-]+)"/g)].map((m) => m[1]);
}

console.log("=== §3 · is the admin board connected to itself? ===");

const screens = screensFromRouting();
console.log(`    ${screens.length} screens declared in portal/vercel.dist.json\n`);

const bars = new Map();
let fail = 0;

for (const s of screens) {
  const targets = barTargets(s.file);
  if (targets === null) {
    fail++;
    console.log(`  FAIL  ${s.route}  << no <nav class="nav"> — a dead end once you are on it`);
    continue;
  }
  bars.set(s.route, targets);
  const self = targets.filter((t) => t === s.route);
  if (self.length) {
    fail++;
    console.log(`  FAIL  ${s.route}  << its own bar links to itself`);
  }
}

console.log("");

for (const s of screens) {
  const from = [...bars.entries()]
    .filter(([route, targets]) => route !== s.route && targets.includes(s.route))
    .map(([route]) => route);
  // A dangling pill is the mirror failure: a bar that walks to a route the
  // portal does not serve looks like reachability and is a 404.
  if (from.length === 0) {
    fail++;
    console.log(`  FAIL  ${s.route}  << on no sibling bar — URL-only from inside the board`);
  } else {
    console.log(`  PASS  ${s.route}  — linked from ${from.length}: ${from.join(" ")}`);
  }
}

const routes = new Set(screens.map((s) => s.route));
for (const [route, targets] of bars) {
  for (const t of targets) {
    if (!routes.has(t)) {
      fail++;
      console.log(`  FAIL  ${route}  << its bar links to ${t}, which the portal does not serve`);
    }
  }
}

console.log(`\n${screens.length - fail} of ${screens.length} screens reachable from a sibling · ${fail} problem(s)`);
process.exit(fail ? 1 : 0);
