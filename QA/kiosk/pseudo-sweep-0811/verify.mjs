// The blind spot `plan-ink-0811` named and could not close from one section.
// 2026-08-11.
//
// That run ended on this: "`getComputedStyle(el)` does not return a
// pseudo-element's colour, so **every** contrast harness under item 6 has been
// blind to `::before` and `::after` on every page it ever swept, not just this
// one." It fixed the one pseudo it was looking at. It did not answer the
// question the sentence raises — *how many others are there*, and are they
// readable — because it graded one section of one page.
//
// This run answers it by enumeration rather than by grepping the stylesheet.
// A grep finds rules; it does not find which rules **paint**, and it cannot see
// a rule that is in `install.html`'s own `<style>` rather than in `style.css`
// (one of the three is). So `ENUM` walks every element on every page and asks
// the browser for `getComputedStyle(el, '::before').content` — the set it
// returns is the set that exists, and everything in it is then graded.
//
// Scope is all four pages plus the console's seven owner screens, which is what
// "every page it ever swept" means. The console is included precisely because
// the expected answer there is **zero**: a sweep that reports nothing and a
// sweep whose selector missed look identical, so the console's zero is recorded
// beside the marketing page's three rather than left unstated.
//
// One harness correction, and it is the reason this file does not simply reuse
// `plan-ink-0811`'s `PAINTED`. That probe walks the **originating** element
// upward for the background, with the comment "a `::before` has no box of its
// own in that walk and cannot carry a background here (`.plan li::before` sets
// none)". True of that pseudo, false of the other two: both counter badges set
// `background: var(--accent)` on the pseudo itself. Reused unchanged, it grades
// white-on-`--card` and reports **1.00:1** in light mode — a defect that is not
// there. The uncorrected read is kept as a control row so the correction is
// visible rather than asserted.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8884;
const ADMIN_PORT = 8885;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_BASE = `http://127.0.0.1:${ADMIN_PORT}`;

// ── contrast, verbatim from `plan-ink-0811` ─────────────────────────────────
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const parse = (s) => { const n = s.match(/[\d.]+/g).map(Number); return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 }; };
const over = (fg, bg) => [fg.r * fg.a + bg.r * (1 - fg.a), fg.g * fg.a + bg.g * (1 - fg.a), fg.b * fg.a + bg.b * (1 - fg.a)];
const ratio = (fgs, bgs) => {
  const bg = parse(bgs), fg = parse(fgs);
  const [x, y] = [lum(over(fg, bg)), lum([bg.r, bg.g, bg.b])].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const f = (n) => n.toFixed(2) + ':1';
// 1.4.3's large-text carve-out. It decides one of the three rows here: the
// counter in `.step .n::before` is 800 at **18px**, which is under the 18.66px
// where bold becomes large text, so it is graded at 4.5:1 and not 3:1 — the
// same half-pixel distinction `plan-ink-0811` had to make for the ✓.
const threshold = (px, weight) => (px >= 24 || (px >= 18.66 && Number(weight) >= 700) ? 3 : 4.5);

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const push = (mode, screen, what, fg, bg, min, note = '') => {
  const r = ratio(fg, bg);
  rows.push({ mode, screen, what, fg, bg, ratio: f(r), raw: r, min: min + ':1', ok: r >= min, note });
  return rows[rows.length - 1];
};
const check = (...a) => { const row = push(...a); if (!row.ok) fail(`${a[1]}: ${a[2]} — ${row.ratio}`); return row; };
const assert = (mode, screen, what, ok, value) => {
  rows.push({ mode, screen, what, fg: '—', bg: '—', ratio: value, raw: 0, min: '—', ok, note: 'עובדה' });
  if (!ok) fail(`${screen}: ${what} — ${value}`);
};

// ── the enumerator ──────────────────────────────────────────────────────────
// Every element, both pseudos. `content` is the browser's own answer, so a rule
// this run's author never read is found the same way as one they did.
//
// Two things it deliberately does **not** do. It does not resolve
// `counter(step)` to a digit — Chromium returns the computed value, so the two
// counters report as `counter(step)` and the digit on screen is in the
// screenshot instead. And it does not skip `content: ""`: an empty string still
// paints if the pseudo has a background or a border, so it is reported with an
// explicit `(ריק)` and graded as non-text rather than dropped.
const ENUM = () => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    for (const pseudo of ['::before', '::after']) {
      const s = getComputedStyle(el, pseudo);
      const content = s.content;
      if (!content || content === 'none' || content === 'normal') continue;

      // visibility of the originating element, walked rather than read: a
      // dialog that is not open is `display:none` on an ancestor and its
      // pseudos still answer `getComputedStyle`.
      let vis = true, alpha = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') { vis = false; break; }
        alpha *= Number(cs.opacity);
      }

      // The background the pseudo is painted on. **The pseudo's own background
      // first** — this is the correction; `plan-ink-0811`'s probe starts the
      // walk at the originating element and would compose white on white here.
      let bg = null;
      const own = s.backgroundColor;
      const opaque = (c) => c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c);
      if (opaque(own)) bg = own;
      else for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (opaque(c)) { bg = c; break; }
      }
      if (!bg) bg = 'rgb(255, 255, 255)';

      const fg = s.color.match(/[\d.]+/g).map(Number);
      const a = (fg.length > 3 ? fg[3] : 1) * alpha;
      const cls = String(el.className || '').trim().split(/\s+/)[0];
      let section = '';
      for (let n = el; n; n = n.parentElement) if (n.id) { section = '#' + n.id + ' '; break; }

      out.push({
        where: section + el.tagName.toLowerCase() + (cls ? '.' + cls : '') + pseudo,
        content: content === '""' ? '(ריק)' : content.replace(/^"|"$/g, ''),
        color: `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, ${a})`,
        bg, ownBg: opaque(own) ? own : '—',
        size: parseFloat(s.fontSize), weight: s.fontWeight,
        visible: vis,
      });
    }
  }
  return out;
};

// `plan-ink-0811`'s `PAINTED`, byte-for-byte, kept only to produce the control
// row that shows what it answers for a pseudo that carries its own background.
const PAINTED_OLD = ([sel, pseudo]) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const s = getComputedStyle(e, pseudo || null);
  let n = e, bg = 'rgb(255, 255, 255)';
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
    n = n.parentElement;
  }
  const fg = s.color.match(/[\d.]+/g).map(Number);
  return { color: `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, ${fg.length > 3 ? fg[3] : 1})`, bg };
};

// Injected value, read two frames + 60ms later — the transition hazard
// `nontext-contrast-0811` found in its own harness. Reads the pseudo.
const INJECT = ([sel, css, pseudo]) => new Promise((done) => {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  requestAnimationFrame(() => setTimeout(() => {
    const c = getComputedStyle(document.querySelector(sel), pseudo || null).color;
    s.remove();
    done(c);
  }, 60));
});

// ── the driver ──────────────────────────────────────────────────────────────
const stub = spawn(process.execPath, [STUB, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
stub.stderr.on('data', (d) => process.stderr.write('[stub] ' + d));
await new Promise((r) => stub.stdout.once('data', r));
// Second instance with the `admin` flag `dialogs-rtl-admin-0811` added, for the
// eighth screen only. Two instances rather than one admin instance throughout:
// an admin sidebar has an extra item, and the seven screens above are graded as
// the customer actually sees them.
const adminStub = spawn(process.execPath, [STUB, String(ADMIN_PORT), 'admin'], { stdio: ['ignore', 'pipe', 'pipe'] });
adminStub.stderr.on('data', (d) => process.stderr.write('[admin stub] ' + d));
await new Promise((r) => adminStub.stdout.once('data', r));

const browser = await chromium.launch();
let shot = 0;
const name = () => `${HERE}${String(++shot).padStart(2, '0')}`;
const census = new Map();          // page → the pseudos it paints
const record = (page, found) => {
  const set = census.get(page) || new Map();
  for (const p of found.filter((x) => x.visible)) set.set(p.where + '|' + p.content, p);
  census.set(page, set);
};

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1000 }, locale: 'he-IL' });
    const page = await ctx.newPage();
    for (const host of ['**://more30.com/**', '**://fonts.googleapis.com/**', '**://fonts.gstatic.com/**']) await page.route(host, (r) => r.abort());
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));

    // ── 1. index.html — the marketing page. Two of the three rules live here.
    const M = 'index.html';
    await page.goto(BASE + '/');
    await page.waitForSelector('#how .step .n');
    assert(mode, M, 'מצב הצבע החיל את :root.dark כצפוי',
      await page.evaluate((m) => document.documentElement.classList.contains('dark') === (m === 'dark'), mode),
      await page.evaluate(() => 'html.class=' + (document.documentElement.className || '(ריק)')));
    record(M, await page.evaluate(ENUM));

    // ── 2. install.html — the third rule, and it is in the page's own <style>,
    // not in `style.css`. The page declares `color-scheme: dark` and has one
    // `:root`, so both passes render the same thing; graded twice anyway,
    // because "this page does not invert" is a claim worth the second read.
    const I = 'install.html';
    await page.goto(BASE + '/install.html');
    await page.waitForSelector('ol.steps > li');
    record(I, await page.evaluate(ENUM));

    // ── 3. kiosk-launcher.html — the page that renders in the hall.
    const L = 'kiosk-launcher.html';
    await page.goto(BASE + '/kiosk-launcher.html');
    await page.waitForSelector('body');
    await page.waitForTimeout(200);
    record(L, await page.evaluate(ENUM));

    // ── 4. the console, all seven screens an owner can reach. `route()`
    // rebuilds `#content` on every change, so one enumeration per screen.
    const C = 'console.html';
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device .actions .btn', { timeout: 15000 });
    await page.waitForTimeout(260);
    record(C, await page.evaluate(ENUM));
    // `:visible` and not `count()`: `#menu-admin` is in the sidebar for every
    // user and `hidden` for an owner, so an index-based walk stops on it —
    // which is the same wall `dialogs-rtl-admin-0811` hit from the other side.
    const nav = page.locator('.side nav button:visible');
    const n = await nav.count();
    for (let i = 0; i < n; i++) {
      await nav.nth(i).click();
      await page.waitForTimeout(320);
      record(C, await page.evaluate(ENUM));
    }
    assert(mode, C, 'נסרקו כל מסכי הקונסולה שבעל-מערכת מגיע אליהם', n >= 6, `${n} פריטי ניווט גלויים נלחצו`);

    // ── 5. ניהול-על, the eighth screen, which needs the admin stub — an owner
    // is redirected away from it (`viewAdmin()`), so it is not one of the
    // screens above and a zero over seven screens would not cover it.
    const A = 'console.html · ניהול-על';
    await page.goto(ADMIN_BASE + '/console');
    await page.waitForSelector('#menu-admin:not(.hidden)', { timeout: 15000 });
    await page.locator('#menu-admin').click();
    await page.waitForSelector('#content table', { timeout: 15000 });
    await page.waitForTimeout(260);
    record(A, await page.evaluate(ENUM));

    // ── grading ────────────────────────────────────────────────────────
    // Back to the two pages that carry the rules; every pseudo the enumeration
    // found on them is graded, by the selector it was found under.
    await page.goto(BASE + '/');
    await page.waitForSelector('#how .step .n');
    for (const p of (await page.evaluate(ENUM)).filter((x) => x.visible)) {
      check(mode, M, `${p.where} — "${p.content}"`, p.color, p.bg, threshold(p.size, p.weight), `${p.size}px/${p.weight}${p.ownBg !== '—' ? ' · רקע עצמי' : ''}`);
    }
    await page.locator('#how').screenshot({ path: `${name()}-how-${mode}.png` });

    // The control that makes the correction visible instead of asserted: the
    // same badge read the way every harness before this one read a pseudo.
    const old = await page.evaluate(PAINTED_OLD, ['#how .step .n', '::before']);
    push(mode, M, 'המספר בעיגול — כפי ש-‎PAINTED‎ הישן קרא אותו (בקרת תיקון)', old.color, old.bg, 4.5,
      mode === 'light' ? 'אמור ליפול — לבן על ‎--card‎' : 'עובר במקרה, ‎--card‎ כהה');

    // A value that must fail, injected into the pseudo itself — a run that
    // could not fail on generated content is exactly what is being closed here.
    const badBg = (await page.evaluate(ENUM)).find((x) => x.where.includes('.n::before')).bg;
    const bad = await page.evaluate(INJECT, ['#how .step .n',
      '.step .n::before { color: #7f9de0 !important; }', '::before']);
    push(mode, M, 'המספר בעיגול — ערך פסול שהוזרק לפסאודו (בקרת שפיות)', bad, badBg, 4.5);

    await page.goto(BASE + '/install.html');
    await page.waitForSelector('ol.steps > li');
    for (const p of (await page.evaluate(ENUM)).filter((x) => x.visible)) {
      check(mode, I, `${p.where} — "${p.content}"`, p.color, p.bg, threshold(p.size, p.weight), `${p.size}px/${p.weight}${p.ownBg !== '—' ? ' · רקע עצמי' : ''}`);
    }
    await page.locator('ol.steps').screenshot({ path: `${name()}-install-steps-${mode}.png` });

    await ctx.close();
  }
} finally {
  await browser.close();
  stub.kill();
  adminStub.kill();
}

// ── the census ──────────────────────────────────────────────────────────────
// The point of the run. Three rules exist in the source; what is asserted is
// the set the browser paints, page by page, including the two zeros.
const inventory = [];
for (const [pageName, set] of census) {
  inventory.push({ page: pageName, list: [...set.values()] });
  assert('—', pageName, 'מצאי תוכן-שנוצר (‎::before/::after‎) שנצבע בפועל', true,
    set.size ? [...set.keys()].map((k) => k.split('|')[0]).join(' · ') : '0 — אין תוכן שנוצר בעמוד הזה');
}
// The one thing a zero cannot prove on its own: that the enumerator works at
// all. It found something on `index.html`, so a zero elsewhere is a zero.
assert('—', '(הכל)', 'המונה מסוגל למצוא פסאודו בכלל (‎index.html‎ אינו ריק)',
  (census.get('index.html')?.size || 0) >= 2, `${census.get('index.html')?.size || 0} פסאודו ב-index.html`);
assert('—', '(הכל)', 'הקונסולה אינה צובעת תוכן שנוצר באף אחד משמונת המסכים',
  (census.get('console.html')?.size || 0) === 0 && (census.get('console.html · ניהול-על')?.size || 0) === 0,
  `${census.get('console.html')?.size || 0} פסאודו על פני 7 מסכים + ${census.get('console.html · ניהול-על')?.size || 0} בניהול-על`);

const table = [
  '| מצב | מסך | מה נמדד | קדמת | רקע | יחס | סף | הערה | |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.mode} | ${r.screen} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${r.note} | ${r.ok ? '✅' : '❌'} |`),
].join('\n');
await writeFile(`${HERE}_table.md`, table + '\n');
console.log(table);

const graded = rows.filter((r) => !/בקרת שפיות|בקרת תיקון|עובדה/.test(r.what + r.note));
const controls = rows.filter((r) => /בקרת שפיות|בקרת תיקון/.test(r.what));
console.log(`\n${graded.filter((r) => r.ok).length}/${graded.length} שורות נמדדות עוברות.`);
console.log(`${controls.length} שורות בקרה: ${controls.filter((r) => !r.ok).length} נפלו (צפוי: 3 — שפיות ×2, ותיקון-הרקע בבהיר בלבד).`);
if (!controls.some((r) => !r.ok)) fail('אף שורת בקרה לא נפלה — הבדיקה אינה מסוגלת ליפול.');
const bad = rows.filter((r) => !r.ok && !/בקרת/.test(r.what));
if (bad.length) console.log('\n' + bad.map((r) => `  ${r.mode} ${r.screen}: ${r.what} → ${r.ratio}`).join('\n'));
