/**
 * §3 + §5 — can the admin actually *reach* the admin screens?
 *
 * more30.com/admin is two things served under one path. The hub itself
 * (`admin/src/App.tsx`, Vercel project `nihul-more30`) answers `/admin`, and
 * nine standalone screens answer `/admin/<name>` from the portal — the rewrites
 * in `portal/vercel.dist.json` are checked before the `/admin/:path*` fall-
 * through, so both live at the same address and neither knows about the other.
 *
 * That split is invisible in the source and it is exactly where a screen goes
 * missing: a page can be deployed, correct, and returning 200, and still be
 * reachable only by someone who already knows the URL to type. §5 says the
 * bkalot rights catalogue must be reachable "כולל כניסה לניהול"; a screen
 * nothing links to does not satisfy that, and no HTTP check would notice.
 *
 * So this asks the question a person would ask, not the one a status code
 * answers: starting from /admin, is there a link to each screen?
 *
 * The screen list is parsed from vercel.dist.json rather than written here —
 * a hardcoded list would keep passing after someone adds the tenth screen.
 *
 * Reads production only. No writes, no auth, no charge.
 *
 *   node scripts/qa/admin-screens-reachable.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ORIGIN = "https://more30.com";

/** The screens the portal claims at /admin/<name>, straight from the routing. */
function screensFromRouting() {
  const cfg = JSON.parse(readFileSync(join(ROOT, "portal", "vercel.dist.json"), "utf8"));
  return (cfg.rewrites ?? [])
    .filter((r) => /^\/admin\/[a-z-]+$/.test(r.source) && r.destination.endsWith(".html"))
    .map((r) => r.source);
}

const get = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": "more30-qa" } });
  return { status: r.status, text: r.ok ? await r.text() : "" };
};

/**
 * Every /admin/<name> the hub can send a person to. The hub is a Vite SPA, so
 * its links live in the bundle and not in the served HTML — reading only the
 * HTML would report zero links for any SPA and call every screen orphaned.
 */
async function hubTargets() {
  const page = await get(`${ORIGIN}/admin`);
  if (!page.text) return { ok: false, targets: new Set(), why: `hub returned ${page.status}` };
  const bundles = [...page.text.matchAll(/<script[^>]+src="([^"]+\.js)"/g)]
    .map((m) => m[1])
    .filter((s) => s.includes("/admin/")); // the hub's own code, not injected scripts
  const targets = new Set();
  const scan = (t) => {
    for (const m of t.matchAll(/\/admin\/[a-z-]+/g)) targets.add(m[0]);
  };
  scan(page.text);
  for (const b of bundles) {
    const js = await get(b.startsWith("http") ? b : ORIGIN + b);
    scan(js.text);
  }
  return { ok: true, targets, bundles: bundles.length };
}

console.log("=== §3+§5 · are the admin screens reachable from /admin? ===");

const screens = screensFromRouting();
console.log(`    ${screens.length} screens declared in portal/vercel.dist.json`);

const hub = await hubTargets();
if (!hub.ok) {
  console.log(`  FAIL  ${hub.why}`);
  process.exit(1);
}
console.log(`    hub bundles read: ${hub.bundles}\n`);

let pass = 0, fail = 0;
for (const s of screens) {
  // Served at all? A link to a 404 is not reachability either.
  const live = await get(ORIGIN + s);
  const linked = hub.targets.has(s);
  if (live.status === 200 && linked) {
    pass++;
    console.log(`  PASS  ${s}  — served, and the hub links to it`);
  } else {
    fail++;
    const why = live.status !== 200
      ? `returns ${live.status}`
      : "served, but nothing on /admin links to it — URL-only";
    console.log(`  FAIL  ${s}  << ${why}`);
  }
}

console.log(`\n${pass} reachable · ${fail} not`);
process.exit(fail ? 1 : 0);
