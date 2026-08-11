// The two installer-facing pages, read for painted order. 2026-08-11.
//
// `apps/35-kioskfleet/STATUS.md` item 7 ends on this and states it as a class
// rather than as one defect: "a correct string in an RTL paragraph is not a
// correct line — and computed-value harnesses are structurally blind to it.
// Anything mixing a Hebrew label with two digit runs is the shape to look at
// next; `install.html` and `kiosk-launcher.html` have never been read this way."
//
// Three times now the same bug has shipped: `06:00–04:00` in `setupsteps.js`
// (a window from the evening to the small hours), `4:40:00 ,11.8.2026` on the
// device card (the time before the date), and both were caught by a screenshot
// and by nothing else. So this run is a *probe*, not a spot check: it walks
// every visible text node on both pages and grades the painted order of every
// token against the order the Unicode bidi algorithm has to produce.
//
// Two groups, because the invariant differs and each is sound on its own:
//
//   A. **tokens with Hebrew between them.** A Hebrew letter between two Latin /
//      digit tokens forces them into separate bidi runs at the base level, so
//      in an RTL paragraph the later one is painted further **left**, always.
//      No judgement is involved, and `hall.example.com` cannot trip it.
//   B. **tokens separated only by neutrals** — `4:40:00`, `11.8.2026, 4:40:00`,
//      `04:00–06:00`, `127.0.0.1:4187`, `hall.example.com`. These are one
//      logical left-to-right value every time they occur here, so the painted
//      order has to be **increasing** left. This is the group the two shipped
//      defects sat in: a neutral between two digit runs takes the paragraph's
//      direction (N2) and the runs swap.
//
// Group C is the control. Every row above passing is indistinguishable from a
// probe that matched nothing, so the known-bad string is rebuilt in the live
// page and group B has to go red on it.
//
// The stub is inline and serves the two pages byte for byte out of
// `server/public/`, at **both depths** (`/kiosk/install` and
// `/kiosk/install/A7K2M9`) because both are the shipped shape. It answers
// `/api/launcher/*` with canned JSON rather than importing `launcher.js`: this
// run measures painting, not resolution, and `launcher-page-0811` already drives
// the real modules. The venue's host is deliberately `127.0.0.1:<port>` — a
// host **with a port**, i.e. two digit runs around a colon, rendered by the one
// `.choice small` that carries no `dir="ltr"` on the claim that a host has "no
// neutral character to reorder around".
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, '../../../apps/35-kioskfleet/server/public');
const PAGES = {
  install: fs.readFileSync(path.join(PUBLIC_DIR, 'install.html')),
  launcher: fs.readFileSync(path.join(PUBLIC_DIR, 'kiosk-launcher.html')),
};
const BASE = '/kiosk';          // production's prefix
const CODE = 'A7K2M9';          // the printed-card form of both links

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.page} ${r.mode}/${r.vp}: ${r.group} — ${r.what} (${r.value})`); };

// Sub-pixel: two tokens on one line are never a fraction of a pixel apart, and
// a Range rect on a wrapped line can land on a fractional x.
const EPS = 0.5;

// ── the stub ────────────────────────────────────────────────────────────────
let PORT = 0;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const inBase = url.pathname === BASE || url.pathname.startsWith(BASE + '/');
  const p = inBase ? url.pathname.slice(BASE.length) || '/' : url.pathname;

  const html = (buf) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(buf); };
  const json = (o) => { res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };

  if (p === '/install' || p.startsWith('/install/')) return html(PAGES.install);
  if (p === '/kiosk-launcher' || p.startsWith('/kiosk-launcher/')) return html(PAGES.launcher);

  if (p === '/api/launcher/resolve') {
    // The venue carries a **port**, which is the case the page's own comment
    // says cannot occur ("the host-only lines above have no neutral character
    // to reorder around"). A colon between two digit runs is exactly one.
    return json({
      device: { name: 'לובי ראשי' },
      kioskUrl: `http://127.0.0.1:${PORT}/site/hall`,
      displayUrl: `http://127.0.0.1:${PORT}/site/hall/2026/08/11`,
      allowedHost: '127.0.0.1',
      idleReturnSeconds: 90,
      clients: [
        { id: 1, name: 'אולם הדר', url: 'https://hadar.example.com/' },
        { id: 2, name: 'מסעדת גליל', url: 'https://galil.example.com/' },
      ],
      links: [{ id: 1, name: 'חתונת כהן־לוי', url: 'https://hadar.example.com/events/2026/08/11' }],
    });
  }
  if (p === '/api/launcher/open') return json({ url: `http://127.0.0.1:${PORT}/site/hall`, client: { id: 1, name: 'אולם הדר' } });

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
PORT = server.address().port;
const ORIGIN = `http://127.0.0.1:${PORT}`;

// ── the probe ───────────────────────────────────────────────────────────────
// Runs in the page. Everything it returns is geometry read from a Range over
// the live text node, because that is the only thing that sees this class of
// bug: the string, the DOM and `innerText` are all correct in every case.
const PROBE = () => {
  const HEB = /[֐-׿]/;
  const TOKEN = /[A-Za-z0-9]+/g;
  const out = [];

  const visible = (el) => {
    if (!el) return false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (n.classList && (n.classList.contains('hidden') || n.classList.contains('hide'))) return false;
    }
    return true;
  };

  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = n.data;
    if (!/[A-Za-z0-9]/.test(text) || !visible(n.parentElement)) continue;

    const toks = [];
    TOKEN.lastIndex = 0;
    for (let m; (m = TOKEN.exec(text));) {
      const r = document.createRange();
      r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      // `getClientRects()`, not `getBoundingClientRect()`. Both pages set
      // `word-break: break-all` on the boxes that hold a URL, so a token is
      // routinely **split across a line break** — and the bounding box of a
      // two-line range starts at the left edge of the *second* line, which
      // reads as a token painted 132px backwards. That is a false positive the
      // first run of this harness produced on `http://127.0.0.1:<port>/kiosk`.
      // So a token is compared from where it ends (its last rect) to where the
      // next one begins (its first rect).
      const rects = [...r.getClientRects()].filter((b) => b.width || b.height);
      if (!rects.length) continue;                 // collapsed whitespace / off-canvas
      toks.push({ t: m[0], i: m.index, end: m.index + m[0].length, head: rects[0], tail: rects[rects.length - 1] });
    }
    if (toks.length < 2) continue;

    const el = n.parentElement;
    const dir = getComputedStyle(el).direction;
    const where = (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''));

    for (let k = 0; k + 1 < toks.length; k++) {
      const a = toks[k], b = toks[k + 1];
      if (Math.round(a.tail.top) !== Math.round(b.head.top)) continue;  // different visual lines: x resets
      const between = text.slice(a.end, b.i);
      out.push({
        where, dir,
        group: HEB.test(between) ? 'A' : 'B',
        pair: `${a.t} ⟨${between.replace(/\s+/g, '␠')}⟩ ${b.t}`,
        line: text.trim().replace(/\s+/g, ' ').slice(0, 72),
        dx: b.head.left - a.tail.left,
      });
    }
  }
  return out;
};

let total = 0;
function grade(found, page, mode, vp) {
  let a = 0, b = 0;
  for (const f of found) {
    if (f.group === 'A') {
      // Hebrew between them ⇒ separate runs at the base level. In an RTL
      // paragraph the later token is painted further left; in an LTR one, right.
      const ok = f.dir === 'rtl' ? f.dx < -EPS : f.dx > EPS;
      a++;
      add({ page, mode, vp, group: 'A bidi-run order', what: `${f.where} ${f.pair}`, ok, value: `dir=${f.dir} dx=${f.dx.toFixed(1)} · ${f.line}` });
    } else {
      // Only neutrals between them ⇒ one logical left-to-right value. Painted
      // order must increase, in either paragraph direction.
      const ok = f.dx > EPS;
      b++;
      add({ page, mode, vp, group: 'B neutral-joined order', what: `${f.where} ${f.pair}`, ok, value: `dir=${f.dir} dx=${f.dx.toFixed(1)} · ${f.line}` });
    }
  }
  // A census, not an assertion. `launcher(code)` is one card with a six-box
  // input on it and legitimately has no line carrying two tokens, so a hard
  // per-view coverage row would fail on a page that is simply short. What
  // proves the probe is live is group C, which runs on every view, plus the
  // total asserted once at the end.
  total += a + b;
  add({ page, mode, vp, group: 'census', what: 'token pairs graded on this view', ok: true, value: `${a} in group A, ${b} in group B` });
}

// ── the driver ──────────────────────────────────────────────────────────────
const browser = await chromium.launch();
let shot = 0;
try {
  for (const mode of ['light', 'dark']) {
    for (const vp of [390, 1200]) {
      const ctx = await browser.newContext({ viewport: { width: vp, height: 900 }, colorScheme: mode, locale: 'he-IL' });
      const page = await ctx.newPage();
      await page.route('**://*.googleapis.com/**', (r) => r.abort());
      await page.route('**://*.gstatic.com/**', (r) => r.abort());

      // ── install.html, at the depth that carries the code ──────────────
      await page.goto(`${ORIGIN}${BASE}/install/${CODE}`);
      await page.waitForSelector('#code');
      grade(await page.evaluate(PROBE), 'install', mode, `${vp}px`);
      if (vp === 390) await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-install-${mode}.png`, fullPage: true });

      // and at the depth that does not — a different card is on screen there.
      await page.goto(`${ORIGIN}${BASE}/install`);
      await page.waitForSelector('#no-code:not(.hide)');
      grade(await page.evaluate(PROBE), 'install(no-code)', mode, `${vp}px`);

      // ── kiosk-launcher.html, both steps ───────────────────────────────
      await page.goto(`${ORIGIN}${BASE}/kiosk-launcher/${CODE}`);
      await page.waitForSelector('#step-choose:not(.hidden) .choice', { timeout: 15000 });
      await page.waitForTimeout(200);
      grade(await page.evaluate(PROBE), 'launcher(choose)', mode, `${vp}px`);
      if (vp === 390) await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-launcher-choose-${mode}.png`, fullPage: true });

      // The rate-limit sentence, which is built in JS and is the only Hebrew
      // line on either page that interpolates a number. Rendered by calling the
      // page's own error path rather than by quoting the string.
      await page.goto(`${ORIGIN}${BASE}/kiosk-launcher`);
      await page.waitForSelector('#code');
      await page.evaluate(() => {
        const el = document.getElementById('code-error');
        el.textContent = 'יותר מדי ניסיונות. נסו שוב בעוד 15 דקות';
        el.classList.remove('hidden');
      });
      grade(await page.evaluate(PROBE), 'launcher(code)', mode, `${vp}px`);
      if (vp === 390) await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-launcher-code-${mode}.png`, fullPage: true });

      // ── C. the control ────────────────────────────────────────────────
      // The exact shape `device-card-390-0811` found, rebuilt in this page's own
      // RTL card. Group B has to flag it; if it does not, every row above means
      // nothing.
      const control = (text, css) => page.evaluate(({ probe, text, css }) => {
        const p = document.createElement('p');
        p.className = 'qa-control sub';   // first, because `where` names the first class
        p.textContent = text;
        if (css) p.style.cssText = css;
        document.querySelector('#step-code').appendChild(p);
        const found = (new Function('return (' + probe + ')()'))();
        p.remove();
        return found.filter((f) => f.where.includes('qa-control'));
      }, { probe: PROBE.toString(), text, css });

      // C1 — group B. The exact shape `device-card-390-0811` found, rebuilt in
      // this page's own RTL card: the comma between the date and the time is a
      // neutral, takes the paragraph's direction (N2), and the two runs swap.
      const c1 = await control('עודכן לאחרונה 11.8.2026, 4:40:00', '');
      add({
        page: 'launcher(code)', mode, vp: `${vp}px`, group: 'C control (B)',
        what: 'the known-bad date+time line is flagged',
        ok: c1.some((f) => f.group === 'B' && f.dx < -EPS),
        value: c1.length ? c1.map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') : 'the control line produced no pair',
      });

      // C2 — group A, which matched **nothing** on either real page: no line on
      // `install.html` or `kiosk-launcher.html` puts Hebrew between two tokens.
      // So without these two rows the group is an assertion that never ran.
      //   positive: a real Hebrew-separated pair is emitted as group A and is
      //             painted right-to-left, i.e. graded correct.
      //   negative: the same string behind U+202D LEFT-TO-RIGHT OVERRIDE. A CSS
      //             `unicode-bidi: bidi-override` is **not** usable here — it
      //             overrides to the element's own `direction`, which is `rtl`,
      //             so it paints the pair exactly as the correct case does and
      //             discriminates nothing (measured; it was this harness's
      //             first attempt). The character does what the property cannot:
      //             the element still computes `direction: rtl`, and the pair is
      //             painted left-to-right.
      const c2ok = await control('שלב 3 מתוך 12 הושלם', '');
      const c2bad = await control('‭שלב 3 מתוך 12 הושלם', '');
      const aPairs = (r) => r.filter((f) => f.group === 'A');
      add({
        page: 'launcher(code)', mode, vp: `${vp}px`, group: 'C control (A)',
        what: 'a Hebrew-separated pair is emitted as group A and paints right-to-left',
        ok: aPairs(c2ok).length > 0 && aPairs(c2ok).every((f) => f.dx < -EPS),
        value: aPairs(c2ok).map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no group A pair emitted',
      });
      add({
        page: 'launcher(code)', mode, vp: `${vp}px`, group: 'C control (A)',
        what: 'and overriding the direction flags it (this row proves group A can fail)',
        ok: aPairs(c2bad).length > 0 && aPairs(c2bad).some((f) => f.dx > EPS),
        value: aPairs(c2bad).map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no group A pair emitted',
      });

      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

add({ page: '(all)', mode: '—', vp: '—', group: 'coverage', what: 'the probe graded something at all', ok: total > 0, value: `${total} token pairs across every view` });

const bad = rows.filter((r) => !r.ok);
await writeFile(`${HERE}_table.md`, [
  '| page | mode | width | group | what | value | ok |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.page} | ${r.mode} | ${r.vp} | ${r.group} | ${r.what} | ${r.value} | ${r.ok ? '✅' : '❌'} |`),
].join('\n') + '\n');
console.log(`${rows.length - bad.length}/${rows.length} pass`);
if (bad.length) console.log(bad.map((r) => `  ${r.page} ${r.mode} ${r.vp} ${r.group}: ${r.what} → ${r.value}`).join('\n'));
