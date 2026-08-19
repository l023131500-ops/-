/**
 * core.issues #86 — "six live public systems with no admin screen in source".
 *
 * #86 has been carried as one number since 07/08, and the number is what made it
 * look like one job: build six screens. It is not one job, and this run measures
 * why before a single screen gets written.
 *
 * An admin screen is a reader. Two things decide whether it can exist at all:
 * **which Supabase project holds the rows**, and **whether there are rows**. Both
 * were measured on 09/08 and both split the six unevenly.
 *
 * The project ref is read from two places, and they are kept apart on purpose.
 * smel and chizukim write it into the client as a **literal** — nadlanApi.ts,
 * lib/supabase.ts, server/routes.ts — so it ships to production exactly as it
 * reads on disk. orech carries none: it takes NEXT_PUBLIC_SUPABASE_URL from the
 * environment, and .env.example (committed, no secret in it) names the project.
 * A scan for literals alone reports orech as clean, which is why it is not the
 * only question asked. Three of the six land outside the hub either way:
 *
 *   smel      csjekrvukbdznetsrodj   literal in source
 *   chizukim  csjekrvukbdznetsrodj   literal in source
 *   orech     bieebmnmkffwbqlsfozh   .env.example + core.projects
 *
 * Nothing here reads .env.local. It holds live service_role keys and API keys
 * for four providers, and a QA script that opens it is one console.log away from
 * being the leak it was written to prevent (#88).
 *
 * This account administers one Supabase project — uhnrgujbdxhhmoxcjria, the hub
 * (measured: the projects list returns it and nothing else). So for those three
 * there is no table to point a reader at from here, no policy to write and no
 * RPC to add. That is the same shape as #62 (galil, project mwljkonwdeuaahsigjdp)
 * and it belongs to NEEDS_USER, not to the build queue. Naming it now is the
 * point: three of #86's six were never mine to close.
 *
 * The other three sit in the hub, and there the second question decides the
 * order — what would the screen show today:
 *
 *   kesef     schema kesef        283 rows, and 259 of them are authorities
 *   imud      public.otvedaf_books  2 rows written by the product itself
 *   studio    public.studio_*       4 templates; projects, brands, users empty
 *
 * kesef is the one with something to manage right now. It is also the one with
 * almost no source in this tree (apps/34-kesef is a single app.json), so its
 * screen has nothing to graft onto and everything to read.
 *
 * What this script does NOT claim: that the three foreign projects are empty or
 * broken. They were not read — no credentials for them exist here, and guessing
 * at their contents is exactly the invented datum the iron rules forbid. It also
 * does not re-measure admin_url; that is #86's own evidence and the board
 * already draws it (portal/public/admin-systems.html, adminEntry).
 *
 *   node scripts/qa/admin-gap-what-to-manage.mjs
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = 'QA/platform/admin-gap-0809';
const HUB = 'uhnrgujbdxhhmoxcjria';

/** The six of #86, with the source dir core.projects.repo resolves to. */
const SIX = [
  { app: 'chizukim', num: '17', dir: 'apps/17-chizukim-transcribe' },
  { app: 'imud',     num: '04', dir: 'apps/04-imud-torani' },
  { app: 'kesef',    num: '34', dir: 'apps/34-kesef' },
  { app: 'orech',    num: '18', dir: 'apps/18-torah-editor-mvp' },
  { app: 'smel',     num: '12', dir: 'apps/12-smel-ndln' },
  { app: 'studio',   num: '26', dir: 'apps/26-modaot-studio' },
];

/**
 * Measured against the hub on 09/08 through the project's own connection, and
 * written here rather than fetched: reading the kesef schema needs more than the
 * anon key that the browser-facing QA scripts carry, and a number nobody can see
 * in the file is a number nobody can check.
 */
const MEASURED = {
  at: '2026-08-09',
  projects_this_account_administers: [HUB],
  /** core.projects.supabase_project — where each system is registered to store. */
  registered_project: {
    chizukim: 'csjekrvukbdznetsrodj',
    imud: HUB,
    kesef: HUB,
    orech: 'bieebmnmkffwbqlsfozh',
    smel: 'csjekrvukbdznetsrodj',
    studio: HUB,
  },
  hub_stores: {
    kesef: {
      schema: 'kesef', rows: 283,
      detail: { authority: 259, data_source: 12, chart_of_accounts: 8, term_normalization: 4 },
      empty_tables: 34,
    },
    imud: { schema: 'public', rows: 2, detail: { otvedaf_books: 2 }, empty_tables: 1 },
    studio: {
      schema: 'public', rows: 4,
      detail: { studio_templates: 4 },
      empty_tables: 3,
    },
  },
};

const SRC_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.mjs', '.json']);
const SKIP = /(^|[\\/])(node_modules|\.next|\.git|dist|build|\.vercel)([\\/]|$)/;

const walk = (dir, out = []) => {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e);
    if (SKIP.test(p)) continue;
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, out);
    else if (SRC_EXT.has(path.extname(p))) out.push(p);
  }
  return out;
};

const REF = /https:\/\/([a-z]{20})\.supabase\.co/g;

console.log('\n#86 — what would each admin screen read?\n');

/** Every ref the file names, without keeping a byte of the file itself. */
const refsIn = (file) => {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return []; }
  return [...text.matchAll(REF)].map((m) => m[1]);
};

const rows = SIX.map((sys) => {
  const files = walk(sys.dir);
  const inSource = new Map();
  for (const f of files) {
    for (const ref of refsIn(f)) inSource.set(ref, (inSource.get(ref) || 0) + 1);
  }
  const inEnvExample = [...new Set(refsIn(path.join(sys.dir, '.env.example')))];

  const registered = MEASURED.registered_project[sys.app];
  const all = new Set([...inSource.keys(), ...inEnvExample, registered].filter(Boolean));
  const foreign = [...all].filter((r) => r !== HUB);
  const store = MEASURED.hub_stores[sys.app] || null;

  const row = {
    app: sys.app, number: sys.num, dir: sys.dir, source_files: files.length,
    refs_in_source: Object.fromEntries(inSource),
    refs_in_env_example: inEnvExample,
    registered_project: registered,
    foreign_refs: foreign,
    reachable_from_here: foreign.length === 0,
    hub_store: store,
  };
  const how = inSource.size ? 'literal in source'
    : inEnvExample.length ? '.env.example' : 'core.projects only';
  const where = foreign.length
    ? `project ${foreign.join(', ')} — not administered here (${how})`
    : store
      ? `hub · ${store.schema} · ${store.rows} rows`
      : 'hub · no store measured';
  console.log(`  ${sys.app.padEnd(9)} #${sys.num}  ${String(files.length).padStart(3)} src  ${where}`);
  return row;
});

const checks = [];
const say = (ok, what) => { checks.push({ ok, what }); console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); };

console.log('');

const blocked = rows.filter((r) => !r.reachable_from_here);
const mine = rows.filter((r) => r.reachable_from_here);

say(blocked.length > 0,
    'at least one of the six stores its rows outside the project this account administers');
say(blocked.every((r) => r.foreign_refs.length === 1),
    'every blocked system names exactly one foreign project — no ambiguity about which');
say(blocked.map((r) => r.app).sort().join(',') === 'chizukim,orech,smel',
    'the blocked three are chizukim · orech · smel, and they are named by measurement');
say(mine.every((r) => MEASURED.hub_stores[r.app]),
    'every system that is reachable from here has a measured store, so none is a guess');
// The reason this script does not stop at grepping the source for a literal.
const orech = rows.find((r) => r.app === 'orech');
say(Object.keys(orech.refs_in_source).length === 0 && !orech.reachable_from_here,
    'orech names no project in source and is still blocked — a literal-only scan would clear it');
say(!rows.some((r) => r.reachable_from_here && r.foreign_refs.length),
    'no system is counted as reachable while still carrying a foreign ref');
// The point of the whole run: #86 stops being one number.
say(blocked.length + mine.length === 6 && blocked.length !== 6 && mine.length !== 6,
    '#86 splits — it is not one job for six systems');

const withRows = mine.filter((r) => MEASURED.hub_stores[r.app].rows > 0)
  .sort((a, b) => MEASURED.hub_stores[b.app].rows - MEASURED.hub_stores[a.app].rows);
say(withRows[0]?.app === 'kesef',
    'the first screen to build is kesef — it holds the most rows nobody can see (283)');

const failed = checks.filter((c) => !c.ok);
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/_results.json`, JSON.stringify({
  at: new Date().toISOString(),
  issue: 86,
  measured: MEASURED,
  systems: rows,
  blocked_on_credentials: blocked.map((r) => ({ app: r.app, project: r.foreign_refs[0] })),
  buildable_here: withRows.map((r) => ({ app: r.app, rows: MEASURED.hub_stores[r.app].rows })),
  checks,
  failures: failed.length,
}, null, 2));

console.log(`\n  ${checks.length - failed.length}/${checks.length} checks pass`);
console.log(`  blocked on credentials: ${blocked.map((r) => r.app).join(', ') || 'none'}`);
console.log(`  buildable here, by rows: ${withRows.map((r) => `${r.app} (${MEASURED.hub_stores[r.app].rows})`).join(', ')}`);
console.log(`  results: ${OUT}/_results.json\n`);
process.exit(failed.length ? 1 : 0);
