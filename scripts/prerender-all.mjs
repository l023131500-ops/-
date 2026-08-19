/**
 * Re-bake every prerendered landing route, with the flags each one actually
 * needs, from one place.
 *
 * Why this exists — measured, not theoretical. torah is prerendered *with a
 * tenant seed*: the row is fetched at build time, written into the HTML as
 * `window.__TENANT__`, and read synchronously on the client's first render.
 * Without it the baked markup shows the full feature grid (the capture browser
 * fetched the tenant live) while the client's first render has no tenant and
 * draws fewer cards — so everything below jumps.
 *
 * On 03/08 a rebuild re-ran `prerender-spa.mjs` without `--seed-url`. Nothing
 * failed. The page still looked right. Lighthouse caught it four hours later:
 *
 *     CLS 0.001  ->  0.578        (the bar is 0.1)
 *     shifting element: "מערכות נוספות מבית איגוד השיעורים"
 *
 * A flag you have to remember is a flag you will forget. The flags live here
 * now, next to the route, so a rebuild cannot silently drop one.
 *
 *   node scripts/prerender-all.mjs            # all of them
 *   node scripts/prerender-all.mjs torah      # one
 *
 * Secrets are never stored here: the seed URL is assembled at run time from the
 * app's own .env.local, the same file the app builds against.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

function env(file, key) {
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = new RegExp(`^${key}=(.*)$`).exec(line.trim());
    if (m) return m[1].trim().replace(/^"|"$/g, '');
  }
  return null;
}

/** torah gates its whole render on a tenant row, so the bake needs that row. */
function torahSeed() {
  const f = 'apps/01-torah-platform/.env.local';
  const url = env(f, 'VITE_SUPABASE_URL');
  const key = env(f, 'VITE_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  const select =
    'id,slug,type,name,display_name,status,custom_domain,tenant_branding(*),tenant_features(*)';
  return `${url}/rest/v1/tenants?slug=eq.igud&select=${select}&apikey=${key}`;
}

const TARGETS = [
  {
    key: 'torah',
    root: '_deploy/torah-more30',
    route: '/torah/',
    // Not optional. See the header — dropping this is a 0.578 CLS regression.
    seed: { global: '__TENANT__', url: torahSeed },
  },
  { key: 'egod', root: '_deploy/egod-more30', route: '/egod/' },
  { key: 'chatzor', root: '_deploy/chatzor-more30', route: '/chatzor/' },
  { key: 'zchuyot', root: '_deploy/zchuyot-more30', route: '/zchuyot/' },
  { key: 'mechiron', root: '_deploy/mechiron-more30/public', route: '/mechiron/' },
  // kupot is deliberately absent: its capture renders "0 topics / no results
  // found", and prerender-spa.mjs now refuses that shape. Its FCP is 2.7s and
  // was never the thing holding its score down.
];

const only = process.argv.slice(2);
const run = only.length ? TARGETS.filter((t) => only.includes(t.key)) : TARGETS;
if (only.length && run.length !== only.length) {
  const known = TARGETS.map((t) => t.key).join(', ');
  console.error(`unknown target. known: ${known}`);
  process.exit(2);
}

let failed = 0;
for (const t of run) {
  const args = ['scripts/prerender-spa.mjs', t.root, t.route];
  if (t.seed) {
    const url = t.seed.url();
    if (!url) {
      console.error(`${t.key}: seed required but could not be built from the app env — refusing to bake without it`);
      failed++;
      continue;
    }
    args.push(`--seed-url=${url}`, `--seed-global=${t.seed.global}`);
  }
  console.log(`\n--- ${t.key} ---`);
  try {
    execFileSync('node', args, { stdio: 'inherit' });
  } catch {
    console.error(`${t.key}: prerender failed`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} target(s) failed`);
  process.exit(1);
}
console.log('\nall targets baked');
