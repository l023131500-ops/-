/**
 * §2 + §3 + §5 — does `core.projects.admin_url` describe reality?
 *
 * §3 asks the super-admin board to carry a "נהל מערכת זו" link per system, and
 * §5 asks specifically that bkalot be shown "כולל כניסה לניהול". Both read one
 * column: `core.projects.admin_url`. Eleven of the twenty-one public systems
 * hold NULL there, which the board can only render as "no admin exists".
 *
 * That is a claim about production, and nothing had ever measured it. bkalot is
 * the proof it can be wrong in the direction that matters: its deployed
 * `app.js` sets the nav's "ניהול" link to `https://more30.com/admin/rights`,
 * and the row still says NULL. A missing record reads exactly like a missing
 * feature, and the two need opposite work.
 *
 * ── what counts as an admin entry
 * The live page as a visitor gets it, plus the site's own JS bundles — every
 * one of these systems is a bundled SPA or writes its nav from script, so
 * reading the served HTML alone would report zero links for most of them.
 *
 * ── the one exclusion, and why it is not a convenience
 * `auth-button.js` is the shared login pill injected into all of them, and it
 * links to `/admin` for whoever is an admin. Counting it would mark all
 * twenty-one systems as having their own admin entry — a 100% pass that means
 * nothing. It is skipped by name, and any hit found only there is reported as
 * `shared-pill` rather than silently dropped.
 *
 * Reads production only. No auth, no writes, no charge.
 *
 *   node scripts/qa/admin-entry-probe.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ORIGIN = "https://more30.com";
const OUT = join(ROOT, "QA", "platform", "admin-entry-0807.json");

/** The systems and what the database currently claims about each one. */
const SYSTEMS = JSON.parse(readFileSync(join(ROOT, "QA", "platform", "admin-entry-input.json"), "utf8"));

/** Anything that would take a person to a management screen. */
const ADMIN_RE =
  /(?:https?:\/\/[a-z0-9.-]*more30\.com)?\/(?:[a-z0-9-]+\/)*(?:admin|console|gabai|nihul|manage)(?:[a-z0-9/_-]*)/gi;

/**
 * The first run of this script reported `/admin/users`, `/admin/generate_link`,
 * `/admin/oauth/clients` and `/admin/custom-providers` on six unrelated systems
 * — including ones with no admin screen at all. They are not ours: they are
 * GoTrue's server-side admin REST surface, shipped inside `supabase-js`, and
 * every system that authenticates carries them. Counting them would have turned
 * "this system has an admin" into "this system uses Supabase".
 */
const GOTRUE = /^\/admin\/(users|generate_link|oauth\/clients|custom-providers|factors|sso)/;

/** `/api/...` is a machine surface. A person cannot be sent there to manage anything. */
const isRoute = (h) => !GOTRUE.test(h) && !/^\/api\//.test(h.replace(/^https?:\/\/[^/]+/, ""));

const MAX_BUNDLES = 8;
const MAX_BYTES = 4_000_000;

async function get(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "more30-qa" }, redirect: "follow" });
    const text = r.ok ? await r.text() : "";
    return { status: r.status, text: text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text };
  } catch (e) {
    return { status: 0, text: "", error: String(e.message ?? e) };
  }
}

const hits = (text) => new Set([...String(text).matchAll(ADMIN_RE)].map((m) => m[0]).filter(isRoute));

/**
 * Does the recorded URL actually serve an admin screen?
 *
 * "200" answers nothing here: every one of these mounts is an SPA whose host
 * returns the shell for any path under it, so a typo and a real route look
 * identical. So the recorded path is fetched next to a sibling that certainly
 * does not exist, and only a *difference* between the two counts as a route.
 */
async function servesOwnDocument(base, recorded) {
  if (!recorded) return null;
  // kupot records an API path plus a header, not an address a person opens.
  // Feeding that to a fetch would measure the wrong thing and report a failure
  // about a record that is right.
  if (/\s/.test(recorded.trim())) return { serves: null, why: "not an address — a machine surface, recorded as such" };
  if (!/^(\/|https?:\/\/)/.test(recorded)) return null;
  const at = new URL(recorded, base).toString();
  const nonsense = new URL(recorded.replace(/\/$/, "") + "-qa-does-not-exist", base).toString();
  const [real, ghost] = [await get(at), await get(nonsense)];
  if (real.status !== 200) return { serves: false, why: `returns ${real.status}` };
  if (!ghost.text) return { serves: true, why: "200, and the sibling does not answer at all" };
  return real.text === ghost.text
    ? { serves: false, why: "identical to a path that does not exist — SPA shell, not a route" }
    : { serves: true, why: "differs from a path that does not exist" };
}

/** Same-origin scripts the page itself pulls in — the shared pill excluded by name. */
function scriptsOf(html, base) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/gi)) {
    let src = m[1];
    if (/auth-button\.js/i.test(src)) continue;
    if (/^https?:\/\//i.test(src)) {
      if (!src.includes("more30.com")) continue;
    } else {
      src = new URL(src, base).toString();
    }
    out.push(src);
    if (out.length >= MAX_BUNDLES) break;
  }
  return out;
}

console.log("=== §2+§3+§5 · does core.projects.admin_url describe production? ===\n");

const rows = [];
for (const sys of SYSTEMS) {
  const base = sys.live_url.endsWith("/") ? sys.live_url : sys.live_url + "/";
  const page = await get(sys.live_url);

  const found = new Set();
  let pillOnly = false;

  if (page.text) {
    for (const h of hits(page.text)) found.add(h);
    for (const src of scriptsOf(page.text, base)) {
      const js = await get(src);
      for (const h of hits(js.text)) found.add(h);
    }
    // Did the shared pill alone account for an /admin mention on this page?
    if (!found.size && /auth-button\.js/i.test(page.text)) pillOnly = true;
  }

  const list = [...found].sort();
  const recorded = sys.admin_url;
  // A recorded value counts as confirmed when production mentions it — either
  // as written, or as the absolute form of the same path.
  const confirmed =
    !!recorded &&
    list.some((h) => h === recorded || h.endsWith(recorded) || recorded.endsWith(h));

  // Not linked from the landing page is not the same as not there. Ask the
  // recorded URL directly before calling a record wrong.
  const direct = confirmed ? null : await servesOwnDocument(base, recorded);

  let verdict;
  if (recorded && (confirmed || direct?.serves !== false)) verdict = "recorded-and-live";
  else if (recorded) verdict = "recorded-not-seen";
  else if (list.length) verdict = "live-not-recorded";
  else verdict = pillOnly ? "shared-pill" : "none-found";

  rows.push({
    number: sys.number,
    slug: sys.slug,
    path: sys.path,
    live_url: sys.live_url,
    status: page.status,
    recorded,
    found: list,
    direct,
    verdict,
  });

  const tag = { "recorded-and-live": "PASS", "live-not-recorded": "GAP ", "recorded-not-seen": "WARN", "shared-pill": "----", "none-found": "----" }[verdict];
  console.log(
    `  ${tag}  ${String(sys.number).padStart(2, "0")} ${(sys.path ?? sys.slug).padEnd(10)} ` +
      `recorded=${recorded ?? "—"}${direct ? ` [${direct.why}]` : ""}  found=${list.length ? list.join(", ") : "—"}`,
  );
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), origin: ORIGIN, rows }, null, 2), "utf8");

const by = (v) => rows.filter((r) => r.verdict === v).length;
console.log(
  `\n${rows.length} public systems · ${by("recorded-and-live")} recorded and live · ` +
    `${by("live-not-recorded")} live but unrecorded · ${by("recorded-not-seen")} recorded but not seen · ` +
    `${by("shared-pill") + by("none-found")} no admin entry found`,
);
console.log(`evidence: ${OUT.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
