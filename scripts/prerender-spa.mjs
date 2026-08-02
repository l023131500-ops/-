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

const [, , rootDirArg, routeArg] = process.argv;
if (!rootDirArg || !routeArg) {
  console.error('usage: node scripts/prerender-spa.mjs <rootDir> <route>');
  process.exit(2);
}
const ROOT = normalize(rootDirArg);
const ROUTE = routeArg.endsWith('/') ? routeArg : routeArg + '/';

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
  /**
   * The capture runs with the network intact, and that is a compromise worth
   * stating rather than hiding.
   *
   * Ideally the data layer would be blocked so the baked markup matched the
   * client's first (empty) render and `hydrateRoot` could adopt the DOM instead
   * of rebuilding it — that is what would move LCP, not just FCP. It was tried
   * and measured: with /rest/v1 aborted, torah's #root ends up with two children
   * and zero characters of text. The app gates its whole render on data, so
   * there is no static shell to capture. Blocking /auth/v1 as well is worse
   * still — the page never renders at all and the capture times out.
   *
   * So what is baked is the fully populated page. It gives a genuine first
   * paint (FCP 3.2s -> 2.1s, measured) but React will replace it, so LCP does
   * not move. Closing that needs SSR with a serialised query cache. See
   * QA/torah.md; it is an architectural call, not a tuning one.
   */

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

await writeFile(indexPath, replaced, 'utf8');
const kb = (n) => Math.round(n / 1024) + 'KB';
console.log(`baked ${kb(markup.length)} of markup into ${indexPath}`);
console.log(`index.html ${kb(html.length)} -> ${kb(replaced.length)}`);
