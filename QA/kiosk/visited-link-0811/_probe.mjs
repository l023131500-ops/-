// Probe, run before the harness was written: can a headless Playwright context
// show `:visited` at all? Every earlier kiosk run read colours with
// `getComputedStyle`, which returns the UNVISITED style by design — so a
// measurement of `:visited` is only worth anything if the browser under it can
// actually enter that state. If nothing here can make a link go magenta with an
// explicit `a:visited { color: #ff00ff }` rule, then no number the harness prints
// about `:visited` means anything, and that has to be said rather than papered
// over.
//
// Four routes are tried, because there are four different reasons the first one
// can come back negative and they are not the same finding:
//   self       — a link whose href IS the current document. Chromium treats
//                self-links as visited without consulting history at all, so this
//                isolates "can the renderer paint :visited" from "is anything
//                recorded in history".
//   context    — an ordinary `newContext()`, which is incognito-shaped.
//   persistent — `launchPersistentContext` on a real profile directory, which is
//                the only one of these with a History database on disk.
//   unpartitioned — the same, with the partitioned visited-link store switched
//                off, since Chromium 132 keys :visited by (link, top-level site,
//                frame origin) and a partition miss looks exactly like an empty
//                history.
//
// Kept in the run directory on purpose: it is the evidence for whatever the
// harness beside it is allowed to claim, and it is the thing to re-run if a
// future Chromium changes any of the above.
import { createServer } from 'node:http';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 8819;
const BASE = `http://127.0.0.1:${PORT}`;
const PROFILE = fileURLToPath(new URL('./_probe-profile', import.meta.url));

const page = (extra) => `<!doctype html><meta charset=utf-8><style>
  body { background: #ffffff; margin: 40px; }
  a { color: #2a61e8; font: 700 40px/1.4 system-ui, sans-serif; text-decoration: none; }
  a:visited { color: #ff00ff; }
</style>
<p><a id="v" href="/target">VVVVVV</a></p>
<p><a id="u" href="/never-opened">UUUUUU</a></p>
${extra || ''}`;

const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  if (req.url === '/target') return res.end('<!doctype html><meta charset=utf-8><h1>target</h1>');
  // `/self` links to itself, and to nothing else.
  if (req.url === '/self') return res.end(page('').replace('href="/target"', 'href="/self"'));
  res.end(page(''));
});
await new Promise((r) => server.listen(PORT, r));

// The painted ink: screenshot the element's box, decode it back inside the same
// page, and take the pixel furthest from the most common colour in the box. The
// most common colour in a box that is mostly paper IS the paper; the furthest
// pixel from it is the core of a glyph stem. Antialiased edges sit between the
// two, so the extreme is a one-sided read — it can under-report saturation, it
// cannot invent a colour that was never painted.
const painted = async (p, sel) => {
  const box = await p.locator(sel).boundingBox();
  const png = await p.screenshot({ clip: box });
  return p.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const tally = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] !== 255) throw new Error('non-opaque pixel in screenshot');
      const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
      tally.set(k, (tally.get(k) || 0) + 1);
    }
    let bg = null, best = -1;
    for (const [k, n] of tally) if (n > best) { best = n; bg = k.split(',').map(Number); }
    let ink = bg, far = -1;
    for (const k of tally.keys()) {
      const q = k.split(',').map(Number);
      const dist = (q[0] - bg[0]) ** 2 + (q[1] - bg[1]) ** 2 + (q[2] - bg[2]) ** 2;
      if (dist > far) { far = dist; ink = q; }
    }
    return `rgb(${ink.join(', ')})`;
  }, 'data:image/png;base64,' + png.toString('base64'));
};

const ROUTES = [
  { kind: 'self', persistent: false, args: [], selfLink: true },
  { kind: 'context', persistent: false, args: [] },
  { kind: 'persistent', persistent: true, args: [] },
  { kind: 'unpartitioned', persistent: true, args: ['--disable-features=PartitionVisitedLinkDatabase'] },
  // The last thing left to vary. Headless Chromium has historically run without
  // a history service, and the visited-link table is fed from it — so a headed
  // profile is the only remaining place the state could exist.
  { kind: 'headed', persistent: true, args: [], headed: true },
];

const report = [];
for (const r of ROUTES) {
  await rm(PROFILE, { recursive: true, force: true });
  const opts = { viewport: { width: 600, height: 400 }, args: r.args, headless: !r.headed };
  const browser = r.persistent ? null : await chromium.launch({ args: r.args, headless: !r.headed });
  const ctx = r.persistent ? await chromium.launchPersistentContext(PROFILE, opts) : await browser.newContext(opts);
  const p = ctx.pages()[0] || await ctx.newPage();
  let err = '';
  try {
    if (r.selfLink) {
      await p.goto(BASE + '/self');
      await p.waitForSelector('#v');
    } else {
      await p.goto(BASE + '/');
      // Clicked, not `goto`-ed: a partitioned entry is keyed by the page the
      // link was followed from, so an address-bar-shaped navigation is not
      // necessarily the same entry.
      await p.locator('#v').click();
      await p.waitForURL('**/target');
      // The History write is asynchronous and the visited-link table is fed from
      // it, so a `goBack()` in the same tick can read a store that has not been
      // told yet. One second, then re-navigate rather than `goBack()` — a back
      // navigation can restore a cached rendering.
      await p.waitForTimeout(1000);
      await p.goto(BASE + '/');
      await p.waitForSelector('#v');
    }
    report.push({
      kind: r.kind,
      visited: await painted(p, '#v'),
      unvisited: await painted(p, '#u'),
      computed: await p.evaluate(() => getComputedStyle(document.querySelector('#v')).color),
    });
  } catch (e) {
    err = String(e.message || e).split('\n')[0];
    report.push({ kind: r.kind, visited: '—', unvisited: '—', computed: '—', err });
  }
  if (r.persistent) await ctx.close(); else await browser.close();
}
await rm(PROFILE, { recursive: true, force: true });
server.close();

console.log('\n| מסלול | הקישור שנלחץ | קישור שלא נלחץ | getComputedStyle | ‎:visited‎ נצבע |');
console.log('|---|---|---|---|---|');
let any = false;
for (const r of report) {
  const works = r.visited === 'rgb(255, 0, 255)';
  any ||= works;
  console.log(`| ${r.kind} | \`${r.visited}\` | \`${r.unvisited}\` | \`${r.computed}\` | ${works ? '✅ כן' : `❌ לא${r.err ? ' — ' + r.err : ''}`} |`);
}
console.log(`\n${any ? 'לפחות מסלול אחד צובע ‎:visited‎ — מדידה אפשרית.' : 'אף מסלול לא צובע ‎:visited‎ בדפדפן הזה.'}`);
