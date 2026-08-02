/**
 * Prerender the landing route of a built Vite SPA into its own index.html.
 *
 * Why this exists. Five systems (torah, zchuyot, kupot, mechiron, egod) all sit
 * under Lighthouse 65 for the same reason, and it is not bundle size — those
 * were already cut. It is that the first response is `<div id="root"></div>`.
 * Nothing can paint until the JavaScript downloads, parses and renders, and on
 * Lighthouse's throttled mobile profile that alone is worth about two seconds
 * of FCP. QA/torah.md called this out and recommended solving it once for the
 * platform rather than per system. This is that once.
 *
 * What it does: serves the built output exactly as production does (same base
 * path, so absolute asset URLs resolve), opens the route in Chromium, waits for
 * React to finish, and writes the resulting markup into the `#root` div of the
 * index.html on disk. The first response then already contains the heading and
 * the copy.
 *
 * React 18 replaces rather than hydrates a non-empty container, so this is a
 * paint placeholder, not hydration. That is deliberate: hydration would demand
 * the markup match exactly and would break the moment a component reads
 * localStorage or the clock. Replacement only needs it to LOOK the same, which
 * is all FCP and LCP care about.
 *
 * Two things it must not do, and does not:
 *  - It never prerenders signed-in state. The browser it uses has no session,
 *    so what gets baked in is the signed-out view every first-time visitor sees
 *    anyway.
 *  - It never bakes in a theme. The `.dark` class goes on <html> by an inline
 *    script before paint, and Tailwind's dark variants are CSS keyed off that
 *    class, so the same markup is correct in both themes.
 *
 *   node scripts/prerender-spa.mjs <rootDir> <route>
 *   node scripts/prerender-spa.mjs _deploy/torah-more30 /torah/
 */
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (const a of args) {
  const m = /^--([^=]+)=(.*)$/.exec(a);
  if (m) flags.set(m[1], m[2]);
  else positional.push(a);
}
const [rootDirArg, routeArg] = positional;
if (!rootDirArg || !routeArg) {
  console.error('usage: node scripts/prerender-spa.mjs <rootDir> <route> [--seed-url=URL --seed-global=NAME]');
  process.exit(2);
}
const ROOT = normalize(rootDirArg);
const ROUTE = routeArg.endsWith('/') ? routeArg : routeArg + '/';

/**
 * Optional: fetch one JSON document and hand it to the page as a global before
 * any of its scripts run, then write the same value into the built HTML.
 *
 * This is the difference between a prerender that only helps FCP and one that
 * also moves LCP. Without it the capture either bakes live data the client's
 * first render cannot reproduce (hydration mismatch, React discards everything)
 * or bakes a data-free shell showing fallback text that then visibly changes.
 * Seeding one small object makes both sides render the same real content on the
 * first pass, so React can adopt the DOM that already painted.
 *
 * Deliberately one document, not a whole query cache: everything else on the
 * page keeps loading normally and is free to differ.
 */
const SEED_URL = flags.get('seed-url') || null;
const SEED_GLOBAL = flags.get('seed-global') || '__SEED__';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

const indexPath = join(ROOT, ROUTE.replace(/^\/|\/$/g, ''), 'index.html');

async function serve() {
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent(req.url.split('?')[0]);
      // Contain the path: a request cannot climb out of the served root.
      const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
      let file = join(ROOT, rel);
      let st = await stat(file).catch(() => null);
      if (st?.isDirectory()) {
        file = join(file, 'index.html');
        st = await stat(file).catch(() => null);
      }
      // SPA fallback, same as the production rewrite.
      if (!st) file = indexPath;
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port };
}

let seedValue = null;
if (SEED_URL) {
  const res = await fetch(SEED_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    console.error(`seed fetch failed: ${res.status} ${SEED_URL}`);
    process.exit(1);
  }
  const body = await res.json();
  // PostgREST answers a filtered select with an array; a seed is one document.
  seedValue = Array.isArray(body) ? body[0] ?? null : body;
  if (!seedValue) {
    console.error('seed fetch returned nothing; refusing to bake a page with no content');
    process.exit(1);
  }
  console.log(`seeded ${SEED_GLOBAL} from ${SEED_URL.split('?')[0]}`);
}

const { server, port } = await serve();
const url = `http://127.0.0.1:${port}${ROUTE}`;
console.log('prerendering ' + url);

const browser = await chromium.launch();
let markup = null;
try {
  const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  /**
   * Block the data layer during capture. This is what makes the output
   * hydratable rather than merely pretty.
   *
   * Left to fetch freely, the build-time browser gets rows back from Supabase
   * and bakes a populated list into the HTML. The client's very first render has
   * no data yet — react-query starts empty — so the trees differ structurally,
   * React throws #418 then #423, discards everything and client-renders anyway.
   * Measured: that path cost two console errors and bought nothing.
   *
   * With data blocked, the captured markup is the same empty/loading state the
   * client renders on its first pass, so hydration matches and the DOM that
   * painted early is kept. The static shell — heading, hero copy, nav — is
   * exactly what LCP measures, and it is unaffected by this.
   */
  if (seedValue !== null) {
    await page.addInitScript(
      ([name, json]) => {
        // eslint-disable-next-line no-new-func
        window[name] = JSON.parse(json);
      },
      [SEED_GLOBAL, JSON.stringify(seedValue)],
    );
  }

  /**
   * `--block-data=1` aborts per-page queries during capture. Off by default,
   * and the reason is measured.
   *
   * The idea was to make the bake hydratable: with queries unresolved both the
   * capture and the client's first render would show the same reserved
   * placeholders, React could adopt the painted DOM, and LCP would land with the
   * first paint instead of when React rebuilds. It does not hold up. An aborted
   * request does not leave react-query *pending* — it settles to *error*, so the
   * capture renders the empty branch while the client renders the pending one.
   * Different trees, React #418 then #423, root discarded. Measured on torah:
   * performance 66 -> 58 and TBT 360ms -> 700ms, because the page now pays for a
   * failed hydration on top of the render it was going to do anyway.
   *
   * Making hydration work here needs every query on the route serialised, not
   * just the tenant — real SSR. The flag is kept because it is the right tool
   * for a route whose above-the-fold content is genuinely static, and wrong for
   * this one.
   *
   * Auth is never blocked either way: it resolves to "no session", which is the
   * state a first-time visitor is in, and blocking it leaves apps that gate on
   * the session permanently blank.
   */
  if (flags.get('block-data') === '1') {
    await page.route('**/*', (route) => {
      const u = route.request().url();
      return /\/rest\/v1\/|\/functions\/v1\//.test(u) ? route.abort() : route.continue();
    });
  }

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for React to have produced something substantial, not merely a spinner
  // or an empty wrapper. Baking in a loading state would be worse than baking
  // in nothing: it would show a spinner that never resolves for a crawler.
  await page.waitForFunction(
    () => {
      const r = document.getElementById('root');
      return r && r.children.length > 0 && r.innerText.trim().length > 200;
    },
    { timeout: 30000 },
  );
  await page.waitForTimeout(1200);

  if (errors.length) {
    console.error('page errors during prerender, refusing to bake:', errors.slice(0, 3));
    process.exitCode = 1;
  } else {
    markup = await page.evaluate(() => document.getElementById('root').innerHTML);
  }
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}

if (!markup) {
  console.error('nothing captured; index.html left untouched');
  process.exit(1);
}

const html = await readFile(indexPath, 'utf8');

// Sentinels rather than "find the matching </div>": the baked markup contains
// hundreds of nested divs, so a regex cannot find the right closing tag. With
// explicit markers the previous bake is unambiguous, which is what makes
// re-running this idempotent instead of nesting one prerender inside the last.
const BAKED = /<div id="root" data-prerendered="1"><!--prerender-->[\s\S]*?<!--\/prerender--><\/div>/;
const EMPTY = /<div id="root">\s*<\/div>/;
const baked = `<div id="root" data-prerendered="1"><!--prerender-->${markup}<!--/prerender--></div>`;

let replaced;
if (BAKED.test(html)) replaced = html.replace(BAKED, baked);
else if (EMPTY.test(html)) replaced = html.replace(EMPTY, baked);
else {
  console.error('could not find an empty or previously baked <div id="root"> in ' + indexPath);
  process.exit(1);
}

if (seedValue !== null) {
  // The same value the capture ran against, so the client's first render
  // reproduces the baked markup exactly. `</script` is escaped because the JSON
  // is being embedded in a script element and a site name containing that
  // sequence would otherwise close the tag early.
  const json = JSON.stringify(seedValue).replace(/<\/script/gi, '<\\/script');
  const tag = `<script id="prerender-seed">window.${SEED_GLOBAL}=${json}</script>`;
  const SEED_TAG = /<script id="prerender-seed">[\s\S]*?<\/script>/;
  replaced = SEED_TAG.test(replaced)
    ? replaced.replace(SEED_TAG, tag)
    // Before the bundle, or the app would read the global after it needed it.
    : replaced.replace(/(<script type="module")/, `${tag}\n    $1`);
}

await writeFile(indexPath, replaced, 'utf8');
const kb = (n) => Math.round(n / 1024) + 'KB';
console.log(`baked ${kb(markup.length)} of markup into ${indexPath}`);
console.log(`index.html ${kb(html.length)} -> ${kb(replaced.length)}`);
