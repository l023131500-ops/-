// QA for the screen-by-screen contrast pass — **ספריית קישורים** and **מזהי
// לקוח**, the two console screens `STATUS.md` item 6 names first. 2026-08-11.
//
// Everything from `nontext-contrast-0811` onward graded whatever one dialog the
// step happened to touch. The console's own *screens* — the ones reached from
// the sidebar — were never graded as screens, so a colour that only appears on
// one of them has never been read by anything. These two are the pair that share
// a shape (a "new X" card over a table of existing ones), so they are one pass.
//
// Method is `index-contrast-0811`'s, and the stub is `warn-ink-0811`'s, reused
// rather than copied: it serves the real `server/public/`. Two departures:
//
//   * the background is read from **the surface actually painted** behind each
//     node, and `opacity` on any ancestor is folded into the foreground's alpha
//     before compositing. A quoted token would be right for the card rows and
//     wrong for the page-level heading.
//   * one client is given an internal note through `page.route`, not by editing
//     the shared stub. `loadClients()` renders `<div class="serial">` only for a
//     client that has one, and that row is the only reason this screen paints
//     that class — but the stub is imported by four other harnesses and its
//     fixture is theirs.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8806;
const BASE = `http://127.0.0.1:${PORT}`;

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
// 1.4.3's own rule rather than a quoted constant — this screen renders the same
// `.code-chip` class at 15px that `style.css` declares at 20px/700.
const threshold = (px, weight) => (px >= 24 || (px >= 18.66 && Number(weight) >= 700) ? 3 : 4.5);

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const push = (mode, screen, what, fg, bg, min, note = '') => {
  const r = ratio(fg, bg);
  rows.push({ mode, screen, what, fg, bg, ratio: f(r), raw: r, min: min + ':1', ok: r >= min, note });
  return rows[rows.length - 1];
};
const check = (...a) => { const row = push(...a); if (!row.ok) process.exitCode = 1; return row; };

// The surface actually painted behind the node, plus every ancestor `opacity`
// folded into the foreground's alpha. `.field label` here sits on `.card`,
// `.topbar h1` sits on the page, and one quoted value would be wrong for one of
// them.
const PAINTED = (sel) => {
  const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!e) return null;
  const s = getComputedStyle(e);
  let n = e, bg = 'rgb(255, 255, 255)', alpha = 1;
  for (let p = e; p; p = p.parentElement) alpha *= Number(getComputedStyle(p).opacity);
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
    n = n.parentElement;
  }
  const fg = s.color.match(/[\d.]+/g).map(Number);
  const a = (fg.length > 3 ? fg[3] : 1) * alpha;
  return {
    color: `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, ${a})`, bg,
    text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34),
    size: parseFloat(s.fontSize), weight: s.fontWeight,
  };
};

// A border/ring is graded against **both** surfaces it touches: one that
// vanishes on either side has vanished.
const EDGE = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const s = getComputedStyle(e);
  let n = e.parentElement, outside = 'rgb(255, 255, 255)';
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { outside = c; break; }
    n = n.parentElement;
  }
  return { edge: s.borderTopColor, inside: s.backgroundColor, outside };
};

// Re-inject the declaration and read it in a later tick — `.btn` carries
// `transition: .15s`, and a read inside the injection's own tick returns the
// colour the transition started from (`nontext-contrast-0811`'s harness bug).
const BEFORE = ([sel, css]) => new Promise((done) => {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  requestAnimationFrame(() => setTimeout(() => {
    const c = getComputedStyle(document.querySelector(sel)).color;
    s.remove();
    done(c);
  }, 60));
});

const CLIENTS = [
  { id: 21, name: 'אולם הדר', code: '1234', siteUrl: 'https://hadar.example.com', allowedHost: 'hadar.example.com', notes: 'משלם מראש — לחדש ב-1/9', active: 1 },
  { id: 22, name: 'גן ורדים', code: '5678', siteUrl: 'https://vradim.example.com', allowedHost: 'vradim.example.com', notes: '', active: 0 },
];

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
let shot = 0;
const name = () => `${HERE}${++shot < 10 ? '0' : ''}${shot}`;

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    // The stub's own clients carry no note, and `.serial` is painted only for a
    // client that has one. Overriding the response leaves the shared fixture
    // alone; everything else on the screen is the stub's.
    await page.route('**/api/clients', (route) => (route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ clients: CLIENTS }) })
      : route.continue()));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    // The fix promotes `.serial`'s base out of `.device` and leaves the
    // monospace scoped there. The device card is the surface that must not
    // move, so it is asserted rather than claimed — `S/N:` is a serial number
    // and reads as one; the client note is Hebrew prose and does not.
    const sn = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('.device .serial'));
      return { color: s.color, size: s.fontSize, mono: /mono/i.test(s.fontFamily) };
    });
    const wantInk = mode === 'dark' ? 'rgb(154, 168, 191)' : 'rgb(92, 106, 128)';
    if (sn.color !== wantInk || sn.size !== '12px' || !sn.mono) {
      fail(`כרטיס המכשיר זז: S/N הוא ${sn.color} ${sn.size} mono=${sn.mono}`);
    } else {
      console.log(`[${mode}] כרטיס המכשיר — S/N נשאר ${sn.color} ${sn.size} monospace ✅`);
    }

    // ── screen 1: ספריית קישורים ─────────────────────────────────
    await page.click('a[data-view="links"]');
    await page.waitForSelector('#l-list table');

    const L = 'ספריית קישורים';
    // Every selector is scoped to `#content`. `console.html` carries a hidden
    // login card with its own `.field label`, and an unscoped selector reads
    // that one — i.e. grades the login screen and reports it as this one.
    for (const [sel, what] of [
      ['#content .topbar h1', 'כותרת המסך'],
      ['#content .card h3', 'כותרת הכרטיס'],
      ['#content .card p', 'פסקת ההסבר (--muted)'],
      ['#content .field label', 'תווית שדה (--label-ink)'],
      ['#l-list th', 'כותרת עמודה בטבלה (--muted 13px)'],
      ['#l-list td b', 'שם הקישור בטבלה'],
      ['#l-list td[dir="ltr"]', 'כתובת הקישור (12px)'],
      ['#l-hl .hl-empty', 'אין דומיינים — הודעת האזהרה'],
      ['#l-create', 'כפתור "שמור קישור"'],
      ['#l-list .btn-danger', 'כפתור "מחק"'],
    ]) {
      const el = await page.evaluate(PAINTED, sel);
      if (!el) { fail(`${L}: ${sel} לא נמצא`); continue; }
      check(mode, L, `${what} — "${el.text}"`, el.color, el.bg, threshold(el.size, el.weight), `${el.size}px/${el.weight}`);
    }
    // The allowed-host cell is the third `td`, and it is the one carrying an
    // inline `--muted` at 12px — the smallest text this screen paints.
    const host = await page.evaluate(PAINTED, '#l-list tr:nth-child(2) td:nth-child(3) ');
    if (host && host.text) check(mode, L, `דומיינים מותרים (12px, --muted) — "${host.text}"`, host.color, host.bg, threshold(host.size, host.weight), `${host.size}px/${host.weight}`);

    const input = await page.evaluate(PAINTED, '#l-name');
    check(mode, L, 'טקסט בשדה קלט', input.color, input.bg, 4.5, `${input.size}px/${input.weight}`);
    const ph = await page.evaluate(() => {
      const e = document.querySelector('#l-name');
      return { color: getComputedStyle(e, '::placeholder').color, bg: getComputedStyle(e).backgroundColor, size: parseFloat(getComputedStyle(e).fontSize), weight: getComputedStyle(e).fontWeight };
    });
    check(mode, L, 'טקסט מציין (placeholder) בשדה', ph.color, ph.bg, threshold(ph.size, ph.weight), `${ph.size}px/${ph.weight}`);

    const fb = await page.evaluate(EDGE, '#l-name');
    check(mode, L, 'מסגרת השדה מול הכרטיס', fb.edge, fb.outside, 3, '1.4.11');
    check(mode, L, 'מסגרת השדה מול מילוי השדה', fb.edge, fb.inside, 3, '1.4.11');

    await page.locator('#content').screenshot({ path: `${name()}-links-${mode}.png` });

    // ── screen 2: מזהי לקוח ──────────────────────────────────────
    await page.click('a[data-view="clients"]');
    await page.waitForSelector('#c-list table');

    const C = 'מזהי לקוח';
    for (const [sel, what] of [
      ['#content .topbar h1', 'כותרת המסך'],
      ['#c-list th', 'כותרת עמודה בטבלה (--muted 13px)'],
      ['#c-list .code-chip', 'מזהה הלקוח (code-chip @15px)'],
      ['#c-list td b', 'שם הלקוח'],
      ['#c-list .serial', 'ההערה הפנימית מתחת לשם'],
      ['#c-list tr:nth-child(2) td:nth-child(4)', 'עמודת הסטטוס'],
      ['#c-list .btn-light', 'כפתור "עריכה"'],
      ['#c-list .btn-danger', 'כפתור "מחק"'],
    ]) {
      const el = await page.evaluate(PAINTED, sel);
      if (!el) { fail(`${C}: ${sel} לא נמצא`); continue; }
      check(mode, C, `${what} — "${el.text}"`, el.color, el.bg, threshold(el.size, el.weight), `${el.size}px/${el.weight}`);
    }
    // The disabled client's row: `⛔ מושבת` is the only thing on this screen
    // saying a code has been taken out of service, and it is plain `--ink`
    // rather than a chip, so it is graded on its own row.
    const off = await page.evaluate(PAINTED, '#c-list tr:nth-child(3) td:nth-child(4)');
    if (off) check(mode, C, `שורת לקוח מושבת — "${off.text}"`, off.color, off.bg, threshold(off.size, off.weight), `${off.size}px/${off.weight}`);

    // The internal note has to stay distinguishable from the name above it, or
    // it reads as a second line of the client's name. Same reasoning as
    // `label-ink-0811`'s label-vs-hint check.
    const note = await page.evaluate(PAINTED, '#c-list .serial');
    const nm = await page.evaluate(PAINTED, '#c-list td b');
    if (note && nm) {
      if (note.color === nm.color && note.size === nm.size) {
        fail(`${C}: ההערה הפנימית זהה לשם הלקוח (${note.color}, ${note.size}px) — היא נקראת כשורה שנייה של השם`);
      } else {
        console.log(`[${mode}] הערה ${note.color} ${note.size}px · שם ${nm.color} ${nm.size}px ✅`);
      }
    }

    await page.locator('#content').screenshot({ path: `${name()}-clients-${mode}.png` });

    // The "before" row, injected into this same DOM in this same run: without
    // it the table above is a list of numbers that cannot fail. The value is
    // **per mode** — one grey cannot be a near-miss on both a white card and a
    // near-black one, and a control row that only fails in light would leave the
    // dark half of the table unproven.
    const BAD = { light: '#b9c3d4', dark: '#2a3550' }[mode];
    const badBg = (await page.evaluate(PAINTED, '#c-list th')).bg;
    const bad = await page.evaluate(BEFORE, ['#c-list th', `th { color: ${BAD} !important; }`]);
    push(mode, C, 'כותרת עמודה — ערך פסול שהוזרק (בקרת שפיות)', bad, badBg, 4.5);

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מסך | מה נמדד | קדמת | רקע | יחס | סף | גודל/משקל | |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.screen} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
const before = rows.filter((r) => /בקרת שפיות/.test(r.what));
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${before.length} שורות בקרה (אמורות ליפול): ${before.filter((r) => !r.ok).length} נפלו.`);
if (before.some((r) => r.ok)) fail('שורת הבקרה עברה — הבדיקה אינה מסוגלת ליפול.');
