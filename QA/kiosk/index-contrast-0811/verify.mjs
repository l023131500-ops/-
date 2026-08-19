/**
 * `index.html`, measured — #35 KioskFleet, 2026-08-11.
 *
 * `STATUS.md` "Next, in order" item 5, and the last of the three `public/`
 * pages: `kiosk-launcher.html` was measured in `launcher-contrast-0811`,
 * `install.html` in `install-contrast-0811`, and this is the marketing page —
 * the one a stranger lands on and decides from.
 *
 * It is a **third** kind of surface, and neither earlier method covers it alone:
 *  - the hero, the nav and the CTA band are translucent/gradient over `--navy`,
 *    exactly like the launcher — so `button-boundary-0811`'s "walk up to the
 *    first opaque background" lands on the wrong thing and flatters everything.
 *  - the sections below are the **console's** opaque tokens (`--card`, `--bg`,
 *    `--ink`, `--muted`) out of the same `css/style.css`, and unlike the other
 *    two pages this one **inverts**: it toggles `:root.dark` from
 *    `prefers-color-scheme` in the head. So both modes are real screens here and
 *    both are graded, where on the other two pages the second mode was only
 *    asserted identical.
 *
 * So the backdrop is sampled from the pixels Chromium painted (which is right
 * for both kinds), foregrounds and borders are composited over that measured
 * pixel, and `opacity` is folded into the foreground's alpha — `.cta-band p`
 * declares `opacity:.92` inline, and `getComputedStyle().color` does not know
 * about it.
 *
 * The two `style="background:#fff"` sections are the reason this page could not
 * be assumed fine from the console's numbers: they are hardcoded white and do
 * not invert, while the text on them is `--ink`/`--muted`, which do.
 *
 * Run: node QA/kiosk/index-contrast-0811/verify.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../install-link-0811/stub-server.mjs', import.meta.url));
const PORT = 4189;

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const parse = (s) => s.match(/[\d.]+/g).map(Number);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** A translucent colour over a measured opaque pixel. `extra` folds in `opacity`. */
const over = (fg, bg, extra = 1) => {
  const f = parse(fg), b = parse(bg);
  const a = (f.length > 3 ? f[3] : 1) * extra;
  return `rgb(${[0, 1, 2].map((i) => Math.round(f[i] * a + b[i] * (1 - a))).join(', ')})`;
};
const f2 = (n) => n.toFixed(2) + ':1';

const rows = [];
/** min = 0 marks an informational row: measured and printed, never failed. */
const check = (mode, what, fg, bg, min, note = '') => {
  // `lum()` reads three channels, so a translucent value handed in here would be
  // graded as if it were opaque — flattering, and silent.
  for (const c of [fg, bg]) {
    const p = parse(c);
    if (p.length > 3 && p[3] < 1) throw new Error(`${what}: צבע לא-אטום הגיע למדידה — ${c}`);
  }
  const r = ratio(fg, bg);
  const ok = min === 0 ? null : r >= min;
  rows.push({ mode, what, fg, bg, ratio: f2(r), min: min === 0 ? '—' : min + ':1', ok, note });
  if (ok === false) process.exitCode = 1;
  return r;
};

// --- the stub -------------------------------------------------------------
// Reused rather than copied: it already serves the real `server/public/` at both
// mounts, and `/` is `index.html` there exactly as `src/index.js` declares it.
const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
const origin = await new Promise((resolve, reject) => {
  let buf = '';
  server.stdout.on('data', (c) => {
    buf += c;
    const m = buf.match(/http:\/\/127\.0\.0\.1:\d+/);
    if (m) resolve(m[0]);
  });
  setTimeout(() => reject(new Error('stub did not announce its port')), 10000);
});

// --- in-page helpers ------------------------------------------------------
const READ = `(sels) => Object.fromEntries(sels.map((sel) => {
  const parts = sel.split('||');
  const el = document.querySelector(parts[0]);
  if (!el) return [sel, null];
  const s = getComputedStyle(el, parts[1] || undefined);
  const r = (parts[1] ? el : el).getBoundingClientRect();
  return [sel, {
    color: s.color,
    opacity: parseFloat(s.opacity),
    fontSize: parseFloat(s.fontSize),
    fontWeight: Number(s.fontWeight),
    border: s.borderTopColor,
    borderWidth: parseFloat(s.borderTopWidth),
    // The ring these buttons are drawn with is \`box-shadow: inset\`, not a
    // border, so it is nowhere in \`borderTopColor\`. Chromium serialises the
    // colour first; the geometry after it is not what is being graded.
    ring: /inset/.test(s.boxShadow) ? (s.boxShadow.match(/^(rgba?\\([^)]*\\)|#[0-9a-f]+)/i) || [])[0] || null : null,
    fill: s.backgroundColor,
    rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
    center: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
    inset: { x: r.left + Math.min(12, r.width / 4), y: r.top + Math.min(12, r.height / 4) },
  }];
}))`;
const read = (page, sels) => page.evaluate(({ src, s }) => eval(src)(s), { src: READ, s: sels });

/**
 * The painted pixel under each point, with every glyph made transparent first so
 * a sample in the middle of a paragraph is that paragraph's backdrop rather than
 * a letter. `opacity` is *not* neutralised: an element painted at .92 really is
 * what the eye receives, and it is folded into the foreground instead.
 */
async function samplePainted(page, points) {
  await page.addStyleTag({
    content: `*, *::placeholder, *::before, *::after {
      color: transparent !important; -webkit-text-fill-color: transparent !important;
      caret-color: transparent !important; text-shadow: none !important; }`,
  });
  await page.waitForTimeout(250);
  const b64 = (await page.screenshot()).toString('base64');
  const out = await page.evaluate(async ({ b64, points }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    return points.map((p) => {
      const d = g.getImageData(Math.round(p.x * k), Math.round(p.y * k), 1, 1).data;
      return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
    });
  }, { b64, points });
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('style')].pop();
    if (t && t.textContent.includes('-webkit-text-fill-color')) t.remove();
  });
  await page.waitForTimeout(250);
  return out;
}

/** WCAG large text is ≥24px, or ≥18.66px when bold. */
const textMin = (s) => (s.fontSize >= 24 || (s.fontSize >= 18.66 && s.fontWeight >= 700) ? 3 : 4.5);

// Every selector read in one round trip, with the point each one's backdrop is
// sampled at. `pt` defaults to the element's centre.
const TARGETS = [
  // --- the navy strip at the top -----------------------------------------
  ['.nav .brand', 'שם המוצר בסרגל'],
  ['.nav-links a', 'קישורי הניווט'],
  // --- the hero -----------------------------------------------------------
  ['.hero h1', 'הכותרת הראשית'],
  ['.hero p.lead', 'פסקת הפתיחה'],
  ['.hero-badges b', 'המספר/המילה המודגשת בתגים', 'inset'],
  ['.hero-badges div', 'הטקסט שמתחת לתג', 'bottomInset'],
  // --- a section on the page background (does invert) ---------------------
  ['#what h2', 'כותרת מקטע על רקע העמוד'],
  ['#what .sub', 'תת-הכותרת על רקע העמוד'],
  ['.feature h3', 'כותרת יכולת (בכרטיס)'],
  ['.feature p', 'גוף היכולת (בכרטיס)'],
  // --- a section with a hardcoded white background (does NOT invert) ------
  ['#features h2', 'כותרת מקטע על ‎.section-alt‎'],
  ['#features .sub', 'תת-הכותרת על ‎.section-alt‎'],
  // --- the steps ----------------------------------------------------------
  ['.step h3', 'כותרת שלב'],
  ['.step p', 'גוף שלב'],
  ['.step .n||::before', 'מספר השלב בעיגול'],
  // --- pricing, also on hardcoded white -----------------------------------
  ['#pricing h2', 'כותרת המחירים על ‎.section-alt‎'],
  ['.plan h3', 'שם התוכנית'],
  ['.plan .price', 'המחיר'],
  ['.plan .price small', '"/חודש"'],
  ['.plan li', 'שורת תכולה'],
  // --- the CTA band and the footer ----------------------------------------
  ['.cta-band h2', 'כותרת רצועת הסיום'],
  ['.cta-band p', 'הפסקה ברצועת הסיום (‎opacity:.92‎)'],
  ['.footer p', 'שורת הפוטר'],
  ['.footer a', 'הקישור ל-more30 בפוטר'],
];

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({
      colorScheme: mode,
      // Tall enough that the whole page is inside one viewport: the backdrop is
      // sampled off a viewport screenshot, so anything below the fold would be
      // sampled at coordinates that are not on the image.
      viewport: { width: 1280, height: 4600 },
    });
    const page = await ctx.newPage();
    // Neither reaches this machine (NetFree blocks one, the other is more30.com)
    // and a hanging request would make the run non-deterministic. The fallback
    // font stack is declared in style.css, which is the point of that comment.
    await page.route('**://**', (r) => (r.request().url().startsWith(origin) ? r.continue() : r.abort()));

    await page.goto(`${origin}/kiosk/`, { waitUntil: 'load' });
    await page.waitForSelector('.cta-band');
    await page.waitForTimeout(300);

    const st = await read(page, TARGETS.map((t) => t[0]));
    const missing = TARGETS.filter((t) => !st[t[0]]).map((t) => t[0]);
    if (missing.length) throw new Error('נעלמו מהדף: ' + missing.join(', '));

    const pointFor = ([sel, , how]) => {
      const s = st[sel];
      if (how === 'inset') return s.inset;
      // The `<b>` is `display:block` above the label, so the div's centre lands
      // on the bold line rather than on the text this row is about.
      if (how === 'bottomInset') return { x: s.inset.x, y: s.rect.bottom - 6 };
      return s.center;
    };
    const px = await samplePainted(page, TARGETS.map(pointFor));

    if (mode === 'light') await page.screenshot({ path: `${HERE}01-light.png`, fullPage: true });
    else await page.screenshot({ path: `${HERE}02-dark.png`, fullPage: true });

    TARGETS.forEach(([sel, what], i) => {
      const s = st[sel];
      // `.step .n::before` paints its own opaque `--accent` disc, so the digit's
      // backdrop is that fill and not whatever is behind the li.
      const bg = sel.includes('::before') ? s.fill : px[i];
      check(mode, `\`${sel}\` — ${what}`, over(s.color, bg, s.opacity), bg, textMin(s));
    });

    // ---------- the controls (WCAG 1.4.11) ----------------------------------
    // `.btn` declares `border: none`, so for a filled button the **fill** is the
    // boundary; `.btn-ghost` declares a real border and that border is it.
    const C = ['.hero .btn-primary', '.hero .btn-ghost', '.nav .btn-ghost', '.plan .btn-light', '.cta-band .btn-ghost'];
    const cst = await read(page, C);
    // Sampled just **outside** each button — the surface its edge meets — rather
    // than at its centre, which is the button itself.
    const cpx = await samplePainted(page, C.map((sel) => ({
      x: cst[sel].rect.left - 8, y: cst[sel].center.y,
    })));
    C.forEach((sel, i) => {
      const s = cst[sel];
      const outside = cpx[i];
      const label = `\`${sel}\``;
      // A button carrying an inset ring (`--btn-light-edge`, `.hero .btn-primary`)
      // has that ring as its boundary, not its fill — grading the fill would
      // report `button-boundary-0811`'s fix as the bug it already fixed. The ring
      // itself is measured in its own row below.
      if (s.ring) {
        const fill = over(s.fill, outside);
        check(mode, `${label} — התווית`, over(s.color, fill, s.opacity), fill, textMin(s));
        check(mode, `${label} — טבעת ‎inset‎ מול הסביבה (פקד)`, over(s.ring, fill), outside, 3);
        check(mode, `${label} — טבעת ‎inset‎ מול מילוי הכפתור (פקד)`, over(s.ring, fill), fill, 3);
      } else if (s.borderWidth > 0 && parse(s.border)[3] !== 0) {
        // The border is painted over the button's own (here transparent) fill,
        // which composites down to the surface behind it.
        const edge = over(s.border, over(s.fill, outside));
        check(mode, `${label} — מסגרת הכפתור מול הסביבה (פקד)`, edge, outside, 3);
        check(mode, `${label} — התווית`, over(s.color, over(s.fill, outside), s.opacity), over(s.fill, outside), textMin(s));
      } else {
        const fill = over(s.fill, outside);
        check(mode, `${label} — מילוי הכפתור מול הסביבה (פקד)`, fill, outside, 3);
        check(mode, `${label} — התווית`, over(s.color, fill, s.opacity), fill, textMin(s));
      }
    });
    // ---------- "before", in this DOM, in this run --------------------------
    // The three values these rules carried before this step, re-injected rather
    // than quoted, so the rows that are supposed to fail are measured failing.
    await page.evaluate(() => {
      const s = document.createElement('style');
      s.id = 'qa-before';
      s.textContent = `.section-alt { background: #fff !important; }
                       .btn-ghost { border-color: rgba(255,255,255,.35) !important; }
                       .hero .btn-primary { box-shadow: none !important; }`;
      document.head.appendChild(s);
    });
    await page.waitForTimeout(300);
    const B = ['#features h2', '#features .sub', '.nav .btn-ghost', '.hero .btn-primary'];
    const bst = await read(page, B);
    const bpx = await samplePainted(page, [
      bst['#features h2'].center, bst['#features .sub'].center,
      { x: bst['.nav .btn-ghost'].rect.left - 8, y: bst['.nav .btn-ghost'].center.y },
      { x: bst['.hero .btn-primary'].rect.left - 8, y: bst['.hero .btn-primary'].center.y },
    ]);
    // Only the mode each defect was in. `#features` was white-on-white in dark
    // only (in light the hardcoded #fff and --card are the same colour, which is
    // why it survived this long), and the nav's ghost border failed in light
    // only — the strip is translucent over the page background, so what is behind
    // it inverts. Claiming either in both modes would be claiming a larger bug
    // than the one that was there.
    if (mode === 'dark') {
      check(mode, '`#features h2` — **לפני** (‎#fff‎ קשיח)', over(bst['#features h2'].color, bpx[0]), bpx[0], 3);
      check(mode, '`#features .sub` — **לפני** (‎#fff‎ קשיח)', over(bst['#features .sub'].color, bpx[1]), bpx[1], 4.5);
    }
    if (mode === 'light') {
      check(mode, '`.nav .btn-ghost` — מסגרת **לפני** (‎.35‎)',
        over(bst['.nav .btn-ghost'].border, over(bst['.nav .btn-ghost'].fill, bpx[2])), bpx[2], 3);
    }
    check(mode, '`.hero .btn-primary` — מילוי **לפני**, בלי טבעת', over(bst['.hero .btn-primary'].fill, bpx[3]), bpx[3], 3);
    await page.evaluate(() => document.getElementById('qa-before')?.remove());
    await page.waitForTimeout(250);

    // ---------- the skip link, which only exists while focused --------------
    await page.evaluate(() => document.querySelector('.skip').focus());
    await page.waitForTimeout(200);
    const sk = await read(page, ['.skip']);
    check(mode, '`.skip:focus` — "דילוג לתוכן הראשי"',
      over(sk['.skip'].color, sk['.skip'].fill, sk['.skip'].opacity), sk['.skip'].fill, textMin(sk['.skip']));

    // ---------- informational: brand surfaces, not carriers -----------------
    const info = await read(page, ['.feature .ico', '.plan li||::before', '.plan.featured']);
    const infoPx = await samplePainted(page, [info['.feature .ico'].center, info['.plan.featured'].inset]);
    check(mode, '`.feature .ico` — ריבוע האמוג\'י מול הכרטיס', info['.feature .ico'].fill, infoPx[0], 0,
      'משטח מותג נושא אמוג\'י — לא נושא מידע בעצמו');
    check(mode, '`.plan li::before` — ה-✓ מול הכרטיס',
      over(info['.plan li||::before'].color, infoPx[1]), infoPx[1], 0,
      'תבליט רשימה — הטקסט שלצידו נושא את המידע');

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מה נמדד | קדמת | רקע | יחס | סף | | הערה |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  const mark = r.ok === null ? 'ℹ️' : r.ok ? '✅' : '❌';
  console.log(`| ${r.mode} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${mark} | ${r.note} |`);
}
const graded = rows.filter((r) => r.ok !== null);
console.log(`\n${graded.filter((r) => r.ok).length}/${graded.length} עוברים, ${rows.length - graded.length} שורות מידע.`);
