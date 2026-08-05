/**
 * Which path-mounted apps will build with the wrong asset paths?
 *
 * Every system here is served from a sub-path (/egod, /zchuyot, ...) by a
 * portal rewrite. Vite needs `base` set to that sub-path, or it emits
 * root-relative asset URLs and every asset 404s once deployed.
 *
 * ⚠️ This has now cost real time four separate ways: kupot went fully dark
 * after a deploy from the wrong directory, smel needed its asset paths
 * preserved by hand, and both zchuyot and egod had to be rebuilt with an
 * explicit --base flag on the command line because their configs omit it. A
 * flag you have to remember is a defect waiting for the one time you forget.
 *
 * This reports, per app, the mount path taken from the portal rewrites and
 * whether the vite config declares a matching base.
 *
 *   node scripts/qa/vite-base-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const portal = fs.readFileSync('portal/vercel.dist.json', 'utf8');

// mount path -> host project, from the rewrite table
const mounts = new Map();
for (const m of portal.matchAll(/"source":\s*"\/([a-z0-9-]+)"\s*,\s*"destination":\s*"https:\/\/([a-z0-9-]+)\.vercel\.app/g)) {
  mounts.set(m[1], m[2]);
}

const rows = [];
const unlinked = [];
for (const dir of fs.readdirSync('apps', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const root = path.join('apps', dir.name);
  const cfg = ['vite.config.ts', 'vite.config.js', 'vite.config.mts']
    .map((f) => path.join(root, f))
    .find((f) => fs.existsSync(f));
  if (!cfg) continue;

  const text = fs.readFileSync(cfg, 'utf8');
  const m = /(^|\s)base\s*:\s*["'`]([^"'`]*)["'`]/m.exec(text);
  const declared = m ? m[2] : null;

  /**
   * ⚠️ The first version of this guessed the mount by name similarity and
   * reported that all fourteen apps serve /torah/, because a fallback test
   * matched the first project whose name merely starts with a route. Nonsense
   * output, and it would have had someone paste the wrong base into every
   * config.
   *
   * The authoritative link is the one Vercel itself writes: .vercel/project.json
   * names the project, and the portal rewrite maps a route to that project.
   * Apps without that file are skipped and counted rather than guessed at.
   */
  const link = path.join(root, '.vercel', 'project.json');
  if (!fs.existsSync(link)) { unlinked.push(dir.name); continue; }
  let projectName;
  try { projectName = JSON.parse(fs.readFileSync(link, 'utf8')).projectName; } catch { continue; }

  let mount = null;
  for (const [route, project] of mounts) if (project === projectName) { mount = route; break; }
  if (!mount) { unlinked.push(`${dir.name} (project ${projectName} has no rewrite)`); continue; }

  const want = `/${mount}/`;
  rows.push({
    app: dir.name,
    mount: want,
    declared: declared === null ? '(none)' : declared,
    ok: declared === want,
  });
}

rows.sort((a, b) => Number(a.ok) - Number(b.ok));
console.log('app'.padEnd(28) + 'mount'.padEnd(14) + 'base in config'.padEnd(18) + 'ok');
rows.forEach((r) =>
  console.log(r.app.padEnd(28) + r.mount.padEnd(14) + r.declared.padEnd(18) + (r.ok ? 'yes' : 'NO')),
);
const bad = rows.filter((r) => !r.ok);
console.log(`\n${rows.length} path-mounted apps · ${bad.length} would build with the wrong asset paths`);
if (unlinked.length) {
  // Said out loud rather than silently dropped: a skipped app is not a passing one.
  console.log(`\n${unlinked.length} app(s) skipped — no Vercel link to resolve a mount from:`);
  unlinked.forEach((u) => console.log('  ' + u));
}
if (bad.length) {
  console.log('\nThese need `base` in the vite config so a plain build is correct:');
  bad.forEach((r) => console.log(`  ${r.app}  ->  base: "${r.mount}"`));
}
process.exit(bad.length ? 1 : 0);
