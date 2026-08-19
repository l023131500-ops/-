/**
 * Does /<mount>/ serve the system, or does it fall through to the portal?
 *
 * Found on mthbram: more30.com/mthbram/ renders the portal home page — the
 * "עולם הסטארטאפים" showcase — while more30.com/mthbram/lessons correctly
 * renders the system. A visitor who lands on the system's own root URL is
 * silently handed a different site, and nothing 404s, so every asset probe and
 * uptime check passes.
 *
 * The cause is in portal/vercel.dist.json. A mount normally has two rules:
 *   { "source": "/x",         ... }
 *   { "source": "/x/:path*",  ... }
 * `:path*` does not match the empty segment left by a trailing slash, so "/x/"
 * matches neither and lands on the portal's SPA catch-all. The mounts that
 * work have a third, explicit { "source": "/x/", ... } rule.
 *
 * This compares the HTML actually served at /x against /x/ for every mount in
 * the rewrite table. It reads raw HTML rather than driving a browser: the
 * question is which document the edge returns, and that is settled before any
 * JavaScript runs.
 *
 * Run: node scripts/qa/trailing-slash-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(
  fs.readFileSync(path.resolve(here, "../../portal/vercel.dist.json"), "utf8"),
);

const mounts = [
  ...new Set(
    table.rewrites
      .map((r) => /^\/([a-z0-9-]+)\/:path\*$/.exec(r.source)?.[1])
      .filter(Boolean),
  ),
].sort();

const hasSlashRule = (m) => table.rewrites.some((r) => r.source === `/${m}/`);

/** Title + first bundle path identify which document was served. */
async function fingerprint(url) {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" } });
    const html = await res.text();
    return {
      status: res.status,
      title: (/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "").trim(),
      asset: (/<script[^>]+src="([^"]+)"/i.exec(html)?.[1] ?? "").trim(),
    };
  } catch (e) {
    return { status: 0, title: `network: ${e.message}`, asset: "" };
  }
}

/**
 * The portal's own SPA bundle. A page serving this from a system's URL means
 * the request fell through the rewrite table to the portal's catch-all.
 *
 * ⚠️ "Different document at /x/ than at /x" is NOT the test, and reading it
 * that way flags chatzor and chizukim as broken when they are correct: those
 * two deliberately route the bare /x to the portal's system.html brochure page
 * and serve the app at /x/. Only the portal SPA bundle appearing where a
 * system should be is a fault.
 */
const PORTAL_SPA = /^\/assets\/index-[\w-]+\.js$/;

console.log(`${mounts.length} mounts in the rewrite table\n`);
console.log(
  `${"mount".padEnd(12)} ${"slashRule".padEnd(10)} ${"/x".padEnd(26)} ${"/x/".padEnd(26)} verdict`,
);

const broken = [];
for (const m of mounts) {
  const bare = await fingerprint(`https://more30.com/${m}`);
  const slash = await fingerprint(`https://more30.com/${m}/`);
  const fellThrough = PORTAL_SPA.test(slash.asset);
  if (fellThrough) broken.push({ m, bare, slash });
  console.log(
    `${m.padEnd(12)} ${String(hasSlashRule(m)).padEnd(10)} ${bare.title.slice(0, 24).padEnd(26)} ${slash.title.slice(0, 24).padEnd(26)} ${fellThrough ? "FALLS THROUGH TO PORTAL" : "ok"}`,
  );
}

console.log(
  `\n${broken.length} of ${mounts.length} mounts serve the portal's own SPA at /<mount>/`,
);
for (const b of broken) {
  console.log(`  ${b.m.padEnd(12)} /${b.m}/ -> "${b.slash.title}"  ${b.slash.asset}`);
}
process.exit(broken.length ? 1 : 0);
