// The device card at a phone width. 2026-08-11.
//
// `apps/35-kioskfleet/STATUS.md` item 7 ends on this, and states it as a layout
// question rather than a keyboard one: "`console.html` is the only one of the
// three pages whose layout has ever been driven at a phone width, and what the
// shots show below the sidebar is the device grid at 390px — `.device-grid`'s
// `minmax(300px, 1fr)` fits, but the button rows inside a card have never been
// measured there, and `clients-console-0811` already found a column of buttons
// running off a card's edge once."
//
// So this run measures the card itself at 390px. What each group is for:
//
//   1. **the page does not scroll sideways.** A horizontal scrollbar on a phone
//      is the symptom every other overflow here surfaces as, and it is the one
//      thing a person notices before any individual control.
//   2. **nothing escapes the card.** Every `.device` is compared against its own
//      content box — `scrollWidth` vs `clientWidth` — and then each of the
//      thirteen buttons in `.actions` is compared against the card's padding box
//      on both edges. The card-level check alone is not enough: an absolutely
//      positioned or negatively-margined child can sit outside it without moving
//      `scrollWidth`, and the RTL side is the one `clients-console-0811` lost.
//   3. **the two long URLs.** `.meta` renders `homeUrl` and `displayUrl` inside
//      `<span dir="ltr">`, which is one unbreakable token: a real customer URL
//      is longer than the stub's and there is no `overflow-wrap` on the box.
//      Measured against the card's content box, per span.
//   4. **the topbar.** It is `display: flex` with no `wrap`, holding a 26px `h1`
//      and two buttons, and it has never been laid out under 800px either.
//   5. **the touch targets** (WCAG 2.5.8) — `.btn-sm` is 33px, which clears the
//      24px minimum; asserted rather than assumed, because a button that wraps
//      to two lines grows and one that is squeezed does not shrink below it.
//   6. **the wide layout does not move.** Every assertion above is re-run at
//      1200px, where the console has always been correct, so a fix that is
//      scoped to the media query can be shown to be scoped to it.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: it already
// serves the real `server/public/` and answers `/console` with the real
// `console.html`, `css/style.css` and `js/app.js`, and its two devices differ in
// exactly the way this run needs (one has a `displayUrl` row and an access-code
// chip, the other has neither).
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8859;
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.mode} ${r.vp}: ${r.group} — ${r.what} (${r.value})`); };

// A sub-pixel epsilon. Layout arithmetic on a 390px viewport lands on
// fractional CSS pixels (the grid's `1fr`, the card's border), and a 0.5px
// difference is not an overflow anyone can see or that any browser scrolls for.
const EPS = 0.5;

// A long URL is the case the stub does not carry: `hadar.example.com` is 26
// characters and every real one is longer. This is injected into the live page
// rather than added to the stub, so the four other harnesses that read that
// stub's `DEVICES` by index are not disturbed.
const LONG_URL = 'https://www.ulam-hadar-simchas.co.il/events/2026/08/11/chatuna-cohen-levi';

async function measure(page) {
  return page.evaluate((eps) => {
    const out = { page: null, cards: [], buttons: [], urls: [], topbar: null, targets: [] };
    const de = document.documentElement;
    out.page = {
      scrollWidth: de.scrollWidth, innerWidth: window.innerWidth,
      over: de.scrollWidth - window.innerWidth,
    };
    const tb = document.querySelector('#content .topbar');
    if (tb) out.topbar = { scrollWidth: tb.scrollWidth, clientWidth: tb.clientWidth, over: tb.scrollWidth - tb.clientWidth };

    document.querySelectorAll('.device').forEach((card, i) => {
      const cs = getComputedStyle(card);
      const box = card.getBoundingClientRect();
      // The padding box: what a child is allowed to occupy. `clientLeft` is the
      // border, so this is the card's inner edge on each side.
      const inner = {
        left: box.left + card.clientLeft + parseFloat(cs.paddingLeft),
        right: box.right - card.clientLeft - parseFloat(cs.paddingRight),
      };
      out.cards.push({ i, scrollWidth: card.scrollWidth, clientWidth: card.clientWidth, over: card.scrollWidth - card.clientWidth, width: box.width });

      card.querySelectorAll('.actions .btn').forEach((b, j) => {
        const r = b.getBoundingClientRect();
        out.buttons.push({
          i, j, label: (b.textContent || '').trim(),
          spillEnd: inner.left - r.left,   // RTL: the card's end edge is on the left
          spillStart: r.right - inner.right,
          w: r.width, h: r.height,
        });
        out.targets.push({ i, j, label: (b.textContent || '').trim(), h: r.height, w: r.width });
      });

      card.querySelectorAll('.meta span[dir="ltr"]').forEach((s, j) => {
        const r = s.getBoundingClientRect();
        out.urls.push({
          i, j, text: (s.textContent || '').trim().slice(0, 40),
          spillEnd: inner.left - r.left, spillStart: r.right - inner.right, w: r.width,
        });
      });
    });
    return out;
  }, EPS);
}

function grade(m, mode, vp) {
  add({ mode, vp, group: 'page', what: 'no horizontal scroll', ok: m.page.over <= EPS, value: `scrollWidth ${m.page.scrollWidth} vs ${m.page.innerWidth} (+${m.page.over})` });
  if (m.topbar) add({ mode, vp, group: 'topbar', what: 'fits its own box', ok: m.topbar.over <= EPS, value: `scrollWidth ${m.topbar.scrollWidth} vs ${m.topbar.clientWidth} (+${m.topbar.over})` });
  for (const c of m.cards) {
    add({ mode, vp, group: 'card', what: `#${c.i} content fits`, ok: c.over <= EPS, value: `scrollWidth ${c.scrollWidth} vs ${c.clientWidth} (+${c.over}), card ${Math.round(c.width)}px` });
  }
  for (const b of m.buttons) {
    add({ mode, vp, group: 'button', what: `#${b.i}.${b.j} ${b.label} within card`, ok: b.spillEnd <= EPS && b.spillStart <= EPS, value: `end +${b.spillEnd.toFixed(1)} / start +${b.spillStart.toFixed(1)}, ${Math.round(b.w)}×${Math.round(b.h)}` });
  }
  for (const u of m.urls) {
    add({ mode, vp, group: 'url', what: `#${u.i}.${u.j} ${u.text} within card`, ok: u.spillEnd <= EPS && u.spillStart <= EPS, value: `end +${u.spillEnd.toFixed(1)} / start +${u.spillStart.toFixed(1)}, ${Math.round(u.w)}px` });
  }
  for (const t of m.targets) {
    add({ mode, vp, group: 'target', what: `#${t.i}.${t.j} ${t.label} ≥24px (2.5.8)`, ok: t.h >= 24 && t.w >= 24, value: `${Math.round(t.w)}×${Math.round(t.h)}` });
  }
}

const stub = spawn(process.execPath, [STUB, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
stub.stderr.on('data', (d) => process.stderr.write('[stub] ' + d));
await new Promise((r) => stub.stdout.once('data', r));

const browser = await chromium.launch();
let shot = 0;
try {
  for (const mode of ['light', 'dark']) {
    for (const vp of [390, 1200]) {
      const ctx = await browser.newContext({ viewport: { width: vp, height: 900 }, colorScheme: mode, locale: 'he-IL' });
      const page = await ctx.newPage();
      // The three off-site requests are blocked from this machine anyway; the
      // login pill's reservation is a CSS variable with its own fallback, which
      // is the state this measures.
      await page.route('**://*.googleapis.com/**', (r) => r.abort());
      await page.route('**://*.gstatic.com/**', (r) => r.abort());
      await page.route('**://more30.com/**', (r) => r.abort());
      // `app.js` boots only when a token is in storage (`if (TOKEN) boot()`), so
      // without this the login card renders and there is no device grid at all.
      await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
      await page.goto(`${BASE}/console`);
      await page.waitForSelector('.device .actions .btn', { timeout: 15000 });
      // `.btn` carries `transition: .15s` on all properties, so a read in the
      // tick the layout lands returns where the transition started
      // (button-boundary-0811, then content-focus-0811).
      await page.waitForTimeout(260);

      grade(await measure(page), mode, `${vp}px`);

      // The long-URL case. Injected into the live page — the same DOM the console
      // produced — rather than into the stub, so the other harnesses that read
      // that stub by index are untouched.
      await page.evaluate((u) => {
        const s = document.querySelector('.device .meta span[dir="ltr"]');
        if (s) s.textContent = u;
      }, LONG_URL);
      await page.waitForTimeout(60);
      const long = await measure(page);
      const worst = long.urls.reduce((a, b) => Math.max(a, b.spillEnd, b.spillStart), -Infinity);
      add({ mode, vp: `${vp}px`, group: 'url-long', what: 'a real-length URL stays in the card', ok: worst <= EPS, value: `worst spill +${worst.toFixed(1)} (${LONG_URL.length} chars)` });
      add({ mode, vp: `${vp}px`, group: 'url-long', what: 'and does not scroll the page', ok: long.page.over <= EPS, value: `scrollWidth ${long.page.scrollWidth} vs ${long.page.innerWidth}` });

      await page.evaluate((u) => {
        const s = document.querySelector('.device .meta span[dir="ltr"]');
        if (s) s.textContent = u;
      }, 'https://hadar.example.com/');
      await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-${vp}-${mode}.png`, fullPage: vp === 390 });

      // ── 7. the timestamp reads in the right order ────────────────
      // Not a width question, and nothing above could have seen it: the string
      // `toLocaleString('he-IL')` returns is correct, the DOM is correct, and
      // `innerText` is correct — only the *painted* order is wrong. It is the
      // screenshot at 390px that showed `4:40:00 ,11.8.2026`, the same defect
      // the OTA window had in `setupsteps.js`. So it is graded by geometry:
      // inside an LTR isolate the date is painted to the **left** of the time,
      // and without one the two digit runs are separate bidi runs in an RTL
      // paragraph and swap.
      const order = await page.evaluate(() => {
        // Ranges over the two digit runs wherever they sit, so the same probe
        // reads the fixed shape (a `<span dir="ltr">`) and the shipped one (a
        // bare text node) without knowing which it is looking at.
        const meta = document.querySelector('.device .meta');
        const walk = document.createTreeWalker(meta, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const d = /\d{1,2}\.\d{1,2}\.\d{4}/.exec(n.data);
          const t = /\d{1,2}:\d{2}:\d{2}/.exec(n.data);
          if (!d || !t) continue;
          const box = (m) => {
            const r = document.createRange();
            r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
            return r.getBoundingClientRect();
          };
          return { date: box(d).left, time: box(t).left, text: n.data.trim() };
        }
        return null;
      });
      add({ mode, vp: `${vp}px`, group: 'bidi', what: 'the timestamp was found', ok: !!order, value: order ? order.text : 'no digit run in .meta' });
      if (order) {
        add({
          mode, vp: `${vp}px`, group: 'bidi', what: 'date is painted before the time (right of it, in RTL)',
          ok: order.date < order.time, value: `date x=${order.date.toFixed(1)}, time x=${order.time.toFixed(1)}`,
        });
      }

      // The "before" row: unwrap the isolate in the same live page and the two
      // runs have to swap back. If they do not, the span is not what fixed it.
      const before = await page.evaluate(() => {
        const meta = document.querySelector('.device .meta');
        const spans = [...meta.querySelectorAll('span[dir="ltr"]')];
        const s = spans.find((x) => /\d{1,2}:\d{2}:\d{2}/.test(x.textContent));
        if (!s) return null;
        s.replaceWith(document.createTextNode(s.textContent));
        meta.normalize();
        const walk = document.createTreeWalker(meta, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const d = /\d{1,2}\.\d{1,2}\.\d{4}/.exec(n.data);
          const t = /\d{1,2}:\d{2}:\d{2}/.exec(n.data);
          if (!d || !t) continue;
          const box = (m) => {
            const r = document.createRange();
            r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
            return r.getBoundingClientRect();
          };
          return { date: box(d).left, time: box(t).left };
        }
        return null;
      });
      add({
        mode, vp: `${vp}px`, group: 'before',
        what: 'without the isolate the time is painted first (this row proves the bug existed)',
        ok: !!before && before.time < before.date,
        value: before ? `date x=${before.date.toFixed(1)}, time x=${before.time.toFixed(1)}` : 'not rebuilt',
      });
      await page.reload();
      await page.waitForSelector('.device .actions .btn', { timeout: 15000 });
      await page.waitForTimeout(120);

      // ── the control ──────────────────────────────────────────────
      // Every row above passes, so on its own this run cannot be told apart from
      // one that measured nothing. `.actions` is `flex-wrap: wrap`, and that one
      // declaration is what makes thirteen `.btn-sm` fit a 284px card — so
      // removing it in the same live page rebuilds exactly the shape
      // `clients-console-0811` found on the clients table, and the spill rows
      // have to go red. If they do not, the check cannot fail and the 244 above
      // mean nothing.
      await page.addStyleTag({ content: '.device .actions { flex-wrap: nowrap !important; }' });
      await page.waitForTimeout(120);
      const ctl = await measure(page);
      const worstBtn = ctl.buttons.reduce((a, b) => Math.max(a, b.spillEnd, b.spillStart), -Infinity);
      add({
        mode, vp: `${vp}px`, group: 'control',
        what: 'without flex-wrap the buttons leave the card (this row proves the check can fail)',
        ok: worstBtn > EPS, value: `worst spill +${worstBtn.toFixed(1)}px`,
      });
      add({
        mode, vp: `${vp}px`, group: 'control', what: 'and the card reports the overflow',
        ok: ctl.cards.some((c) => c.over > EPS), value: ctl.cards.map((c) => `#${c.i} +${c.over}`).join(' '),
      });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  stub.kill();
}

const bad = rows.filter((r) => !r.ok);
const md = [
  '| mode | width | group | what | value | ok |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.mode} | ${r.vp} | ${r.group} | ${r.what} | ${r.value} | ${r.ok ? '✅' : '❌'} |`),
].join('\n');
await writeFile(`${HERE}_table.md`, md + '\n');
console.log(`${rows.length - bad.length}/${rows.length} pass`);
if (bad.length) console.log(bad.map((r) => `  ${r.mode} ${r.vp} ${r.group}: ${r.what} → ${r.value}`).join('\n'));
