/**
 * Does every path-mounted app declare the sub-path it is served from?
 *
 * Each of these systems is served from a sub-path (/egod, /zchuyot, ...) via a
 * portal rewrite. Vite needs `base` set to that sub-path, or the build emits
 * root-relative asset URLs and every asset 404s once deployed.
 *
 * ⚠️ This has cost real incidents: kupot went fully dark after a deploy, smel
 * needed its asset paths preserved by hand, and zchuyot and egod had to be
 * rebuilt with an explicit --base flag. A build that is only correct when
 * someone remembers a flag is a defect waiting for the one time they forget.
 *
 * ⚠️ The first version of this check guessed each mount by name similarity and
 * reported that all fourteen apps serve /torah/ — every row wrong. Anyone acting
 * on it would have pasted the wrong base into fourteen configs. The mapping now
 * comes from QA/platform/app-mounts.json, where every entry records how it was
 * established, and none of them is a guess. One app deploys under a completely
 * different name than its folder, so name similarity was never going to work.
 *
 *   node scripts/qa/vite-base-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const MAP = JSON.parse(fs.readFileSync('QA/platform/app-mounts.json', 'utf8'));
const expected = MAP.apps;

const rows = [];
const missing = [];

for (const [app, spec] of Object.entries(expected)) {
  /**
   * Not every path-mounted build lives under apps/. The control centre sits at
   * admin/ and was mounted under /admin with base "./" for eleven days without
   * this audit ever looking at it — a hardcoded apps/ prefix meant the one
   * config outside that folder could not be checked, and a check that cannot
   * see a file reports nothing rather than a failure. `root` names the folder
   * when it is not apps/<app>.
   */
  const root = spec.root ?? path.join('apps', app);
  if (!fs.existsSync(root)) { missing.push(`${app} (folder gone)`); continue; }

  const cfg = ['vite.config.ts', 'vite.config.js', 'vite.config.mts']
    .map((f) => path.join(root, f))
    .find((f) => fs.existsSync(f));
  if (!cfg) { missing.push(`${app} (no vite config)`); continue; }

  const text = fs.readFileSync(cfg, 'utf8');

  /**
   * Take the LAST base in the file, not the first.
   *
   * Two configs here declare base twice — a literal and then a variable whose
   * default wins. Reading the first one reported both as fixed while the build
   * still emitted the wrong paths, which only building and reading the output
   * revealed.
   */
  const literals = [...text.matchAll(/(^|\s)base\s*:\s*["'`]([^"'`]*)["'`]/gm)].map((m) => m[2]);

  /**
   * The env-default form appears three ways across these configs: inline with
   * `||`, inline with `??`, and hoisted into a `const base = ...` that is then
   * passed as shorthand. Matching only the first spelling reported chatzor as
   * having no base at all, when its build demonstrably emits the right prefix —
   * a false alarm, which is the failure mode that gets a check switched off.
   */
  const envDefault =
    /(^|\s)base\s*:\s*process\.env\.[A-Z_]+\s*(?:\|\||\?\?)\s*["'`]([^"'`]*)["'`]/m.exec(text) ||
    /const\s+base\s*=\s*process\.env\.[A-Z_]+\s*(?:\|\||\?\?)\s*["'`]([^"'`]*)["'`]/m.exec(text);

  const declared = envDefault
    ? envDefault[envDefault.length - 1]
    : literals.length
      ? literals[literals.length - 1]
      : null;

  rows.push({
    app,
    mount: spec.mount,
    declared: declared === null ? '(none)' : declared,
    ok: declared === spec.mount,
    how: spec.how,
    duplicate: literals.length + (envDefault ? 1 : 0) > 1,
  });
}

rows.sort((a, b) => Number(a.ok) - Number(b.ok) || a.app.localeCompare(b.app));
console.log('app'.padEnd(26) + 'mount'.padEnd(13) + 'base in config'.padEnd(15) + 'ok   how');
for (const r of rows) {
  console.log(
    r.app.padEnd(26) + r.mount.padEnd(13) + r.declared.padEnd(15) +
    (r.ok ? 'yes  ' : 'NO   ') + r.how + (r.duplicate ? '   <<< declares base more than once' : ''),
  );
}

const bad = rows.filter((r) => !r.ok);
console.log(`\n${rows.length} path-mounted apps · ${bad.length} would build with the wrong asset paths`);
if (missing.length) {
  // Named rather than dropped: a skipped app is not a passing one.
  console.log(`\n${missing.length} listed app(s) could not be checked:`);
  missing.forEach((m) => console.log('  ' + m));
}
console.log(
  '\nThis compares configs against a recorded mapping. It cannot tell you the\n' +
    'build output is right — only building and reading the emitted asset path can,\n' +
    'and that is how the duplicate-base cases were caught.',
);
process.exit(bad.length ? 1 : 0);
