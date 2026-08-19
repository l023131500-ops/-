/**
 * `install.html`, measured — #35 KioskFleet, 2026-08-11.
 *
 * `STATUS.md` "Next, in order" item 5. `kiosk-launcher.html` was measured in
 * `launcher-contrast-0811`; the two pages left unmeasured were `install.html`
 * and `index.html`. This is the first of those, and the one that is read by a
 * person holding a tablet: it carries the two values `EnrollActivity` asks for,
 * and everything on it is either copied out or followed as an instruction.
 *
 * It is the same kind of surface as the launcher and cannot be measured the way
 * the console was: **nothing here is opaque**. Every card, value box and button
 * is a translucent white (or black) over two radial gradients over `--navy`, so
 * `button-boundary-0811`'s "walk up to the first opaque background" lands on
 * `body`'s navy — the darkest thing on the page — and every ratio comes out
 * flattering. So the backdrop is **sampled from the pixels Chromium painted**
 * and translucent foregrounds are composited over that measured pixel, exactly
 * as `launcher-contrast-0811/verify.mjs` does. Borders are composited rather
 * than sampled because a 1px border on a fractional rect is antialiased and
 * picking whichever neighbouring pixel "looks like the border" is a way to get
 * the answer you wanted.
 *
 * Two things are measured here that the launcher has no equivalent of:
 *  - the **`.copy` buttons**, which are the only interactive controls on the
 *    page. `.btn`-style fills elsewhere in this fleet are their own boundary;
 *    here the button declares a real `border`, so that border *is* the boundary
 *    and 1.4.11 applies to it — in the resting state and on `:hover`, since the
 *    hover rule lightens the fill and therefore weakens the same edge.
 *  - the **step counter** (`ol.steps > li::before`), which is the only opaque
 *    fill on the page and the only thing carrying which step is which.
 *
 * Both depths are driven (`/kiosk/install` and `/kiosk/install/A7K2M9`) because
 * they are different screens: the second shows the code block, the first shows
 * the `.warn` telling the reader where a code comes from.
 *
 * The page hardcodes a dark palette and declares `color-scheme: dark`; it has no
 * light mode by design. Both `colorScheme` values are driven anyway and the
 * sampled surfaces are asserted identical, because that claim is only a comment.
 *
 * Run: node QA/kiosk/install-contrast-0811/verify.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../install-link-0811/stub-server.mjs', import.meta.url));
const PORT = 4187;

// The values these rules had before this step — re-injected in the same run, in
// the same DOM, so the "before" rows are measured rather than quoted.
const BEFORE = {
  '.copy border': 'rgba(255, 255, 255, 0.34)',
  '.copy:hover border': 'rgba(255, 255, 255, 0.34)',
};

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const parse = (s) => s.match(/[\d.]+/g).map(Number);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** A translucent colour over a measured opaque pixel. */
const over = (fg, bg) => {
  const f = parse(fg), b = parse(bg);
  const a = f.length > 3 ? f[3] : 1;
  return `rgb(${[0, 1, 2].map((i) => Math.round(f[i] * a + b[i] * (1 - a))).join(', ')})`;
};
const f2 = (n) => n.toFixed(2) + ':1';

/**
 * Text on this page is not always opaque — `.muted` and `table.errors th` are
 * `rgba(255,255,255,.72)`, which the launcher page had no equivalent of (there,
 * only the placeholder and the borders were translucent). A translucent *fore*
 * ground has to be composited over the measured backdrop for the same reason a
 * border does; handing the raw value to `lum()` would read the alpha channel as
 * a colour. `over()` is a no-op on an opaque value, so this is safe to apply to
 * every foreground rather than to the ones that happen to need it today.
 */
const ink = over;

const rows = [];
/** min = 0 marks an informational row: measured and printed, never failed. */
const check = (what, fg, bg, min, note = '') => {
  // `lum()` reads three channels, so a translucent value handed in here would be
  // graded as if it were opaque — flattering, and silent. Everything reaching
  // this point has either been sampled off the screenshot or run through
  // `over()`; anything else is a bug in the harness, not a result.
  for (const c of [fg, bg]) {
    const p = parse(c);
    if (p.length > 3 && p[3] < 1) throw new Error(`${what}: צבע לא-אטום הגיע למדידה — ${c}`);
  }
  const r = ratio(fg, bg);
  const ok = min === 0 ? null : r >= min;
  rows.push({ what, fg, bg, ratio: f2(r), min: min === 0 ? '—' : min + ':1', ok, note });
  if (ok === false) process.exitCode = 1;
  return r;
};

// --- the stub -------------------------------------------------------------
// Reused rather than copied: it already serves the real `server/public/` and
// resolves `/install/:code?` at both depths and both mounts, off the real
// `installlink.js`.
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
/** Computed style + viewport rect for a set of selectors, in one round trip. */
const READ = `(sels) => Object.fromEntries(sels.map((sel) => {
  const parts = sel.split('||');
  const el = document.querySelector(parts[0]);
  if (!el) return [sel, null];
  const s = getComputedStyle(el, parts[1] || undefined);
  const r = el.getBoundingClientRect();
  return [sel, {
    color: s.color,
    fontSize: parseFloat(s.fontSize),
    fontWeight: Number(s.fontWeight),
    border: s.borderTopColor,
    borderWidth: parseFloat(s.borderTopWidth),
    fill: s.backgroundColor,
    rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
    center: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
    inset: { x: r.left + Math.min(10, r.width / 4), y: r.top + Math.min(10, r.height / 4) },
  }];
}))`;

/** `READ` is source rather than a closure so it can be `eval`'d in the page. */
const read = (page, sels) => page.evaluate(({ src, s }) => eval(src)(s), { src: READ, s: sels });

/**
 * The painted pixel under each point. Text is made transparent first, so a
 * sample taken in the middle of a paragraph is that paragraph's backdrop rather
 * than a letter — and `-webkit-text-fill-color` too, since `color` alone leaves
 * a fill on some UA styles. The `::before` counters are covered by the same
 * rule, and only their glyph: their opaque `--accent` fill is left painted,
 * which is what makes the circle sampleable at all.
 */
async function samplePainted(page, points) {
  await page.addStyleTag({
    content: `*, *::placeholder, *::before, *::after {
      color: transparent !important; -webkit-text-fill-color: transparent !important;
      caret-color: transparent !important; text-shadow: none !important; }`,
  });
  await page.waitForTimeout(250);
  // Playwright hands back a Buffer (the `encoding` option is Puppeteer's), and a
  // Buffer does not survive the round trip into the page as a string.
  const b64 = (await page.screenshot()).toString('base64');
  const out = await page.evaluate(async ({ b64, points }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;   // device pixel ratio, whatever it is
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

/** Text threshold: WCAG large text is ≥24px, or ≥18.66px when bold. */
const textMin = (s) => (s.fontSize >= 24 || (s.fontSize >= 18.66 && s.fontWeight >= 700) ? 3 : 4.5);

const browser = await chromium.launch();
const surfaces = {};
try {
  for (const mode of ['dark', 'light']) {
    const first = mode === 'dark';
    const ctx = await browser.newContext({
      colorScheme: mode,
      viewport: { width: 800, height: 1400 },   // a tablet held portrait, which is the case
    });
    const page = await ctx.newPage();

    // ---------- screen 1: the install link, code and all ----------
    await page.goto(`${origin}/kiosk/install/A7K2M9`);
    await page.waitForFunction(() => document.getElementById('code').textContent !== '—');

    const S1 = [
      '.brand', 'h1', '#lede', '.card', '.value', '#server', '#code', '.copy',
      'ol.steps > li b', 'ol.steps > li .muted', '.expect', 'ol.steps > li||::before',
      'table.errors th', 'table.errors td',
    ];
    let st = await read(page, S1);
    // The `.value` box is a flex row with the copy button on its left edge (RTL),
    // so the generic `inset` point would land on the button rather than on the
    // box. Sampled just inside its own right edge instead, in its own padding.
    const valueInset = { x: st['.value'].rect.right - 6, y: st['.value'].rect.top + 6 };
    // The counter circle: 30px wide, `right: -16px; top: 0` relative to the li,
    // so it straddles the rail. Its centre in viewport coordinates.
    const li = st['ol.steps > li||::before'].rect;
    const dotCentre = { x: li.right + 16 - 15, y: li.top + 15 };

    let px = await samplePainted(page, [
      st['.brand'].center, st['h1'].center, st['#lede'].center, st['.card'].inset,
      valueInset, st['#server'].center, st['#code'].center, st['.copy'].center,
      st['ol.steps > li b'].center, st['ol.steps > li .muted'].center, st['.expect'].center,
      dotCentre, st['table.errors th'].center, st['table.errors td'].center,
      { x: 8, y: 8 },   // the page itself, outside every card
    ]);
    const [brandBg, h1Bg, ledeBg, cardBg, valueBg, serverBg, codeBg, copyBg,
      stepBBg, stepMutedBg, expectBg, dotBg, thBg, tdBg, pageBg] = px;
    surfaces[mode] = { cardBg, valueBg, copyBg, pageBg };

    if (first) {
      await page.screenshot({ path: `${HERE}01-with-code.png`, fullPage: true });

      check('`.brand` — שם המוצר', ink(st['.brand'].color, brandBg), brandBg, textMin(st['.brand']));
      check('`h1` — "התקנת מכשיר קיוסק"', ink(st['h1'].color, h1Bg), h1Bg, textMin(st['h1']));
      check('`#lede` — משפט ההסבר (`.muted`)', ink(st['#lede'].color, ledeBg), ledeBg, textMin(st['#lede']));

      // The two values the whole page exists to hand over.
      check('`#server` — כתובת השרת שמעתיקים', ink(st['#server'].color, serverBg), serverBg, textMin(st['#server']));
      check('`#code` — קוד הרישום (28px/700)', ink(st['#code'].color, codeBg), codeBg, textMin(st['#code']));

      // The only controls on the page. `.copy` declares a real border, so the
      // border is the boundary — measured against the fill inside it and the
      // `.value` box outside it both. A border that vanishes on one side has
      // vanished.
      //
      // The composite base is the button's **own** fill on both rows:
      // `background-clip` is `border-box` by default, so a translucent border is
      // painted over its own element's background, and that same composited
      // colour is what meets the `.value` box on the other side.
      check('`.copy` — התווית "העתקה"', ink(st['.copy'].color, copyBg), copyBg, textMin(st['.copy']));
      const copyEdge = over(st['.copy'].border, copyBg);
      check('`.copy` — מסגרת מול מילוי הכפתור (פקד)', copyEdge, copyBg, 3);
      check('`.copy` — מסגרת מול תיבת הערך (פקד)', copyEdge, valueBg, 3);

      // :hover lightens the fill and leaves the border where it is, so it is the
      // same edge measured against a nearer surface — a state, and 1.4.11 covers
      // states.
      await page.hover('.copy');
      await page.waitForTimeout(250);
      const hst = await read(page, ['.copy']);
      const hpx = await samplePainted(page, [hst['.copy'].center]);
      check('`.copy:hover` — מסגרת מול המילוי המובהר (פקד)', over(hst['.copy'].border, hpx[0]), hpx[0], 3);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(250);

      // The steps.
      check('`ol.steps > li b` — כותרת השלב', ink(st['ol.steps > li b'].color, stepBBg), stepBBg, textMin(st['ol.steps > li b']));
      check('`ol.steps > li .muted` — גוף השלב', ink(st['ol.steps > li .muted'].color, stepMutedBg), stepMutedBg, textMin(st['ol.steps > li .muted']));
      check('`.expect` — "מה אמור להופיע"', ink(st['.expect'].color, expectBg), expectBg, textMin(st['.expect']));
      // The counter is the only opaque fill on the page, and the only thing
      // saying which step is which.
      check('`li::before` — מספר השלב מול העיגול',
        ink(st['ol.steps > li||::before'].color, st['ol.steps > li||::before'].fill),
        st['ol.steps > li||::before'].fill, textMin(st['ol.steps > li||::before']));
      // Informational, and the reason is the row above it: the disc is not what
      // carries the step number — the white digit on it is, at 5.28:1. The disc
      // is `--accent`, the fleet's own brand colour, used identically on every
      // page here; moving it is a design change of the kind `more30-priority.md`
      // §6 asks for, not a contrast token. Printed rather than left silent so
      // the cost is a number for whoever revisits it.
      check('`li::before` — העיגול מול הכרטיס', dotBg, cardBg, 0, 'הספרה נושאת את מספר השלב, לא הדיסקית');

      // The error table.
      check('`table.errors th` — כותרות העמודות', ink(st['table.errors th'].color, thBg), thBg, textMin(st['table.errors th']));
      check('`table.errors td` — ההודעה ומה לעשות', ink(st['table.errors td'].color, tdBg), tdBg, textMin(st['table.errors td']));

      // ---------- separators: measured and printed, never failed ----------
      check('`.card` — מסגרת הכרטיס מול הרקע', over(st['.card'].border, pageBg), pageBg, 0,
        'מפריד בין משטחים — 1.4.11 פוטר');
      check('`.value` — מסגרת התיבה מול מילויה', over(st['.value'].border, valueBg), valueBg, 0,
        'תיבת תצוגה, לא פקד — הכפתור שבתוכה הוא הפקד');
      check('`.expect` — מסגרת מול המילוי', over(st['.expect'].border, expectBg), expectBg, 0,
        'מסגרת של הודעה, לא של פקד');

      // ---------- "before", in this DOM, in this run ----------
      await page.evaluate((b) => {
        const s = document.createElement('style');
        s.id = 'qa-before';
        s.textContent = `.copy { border-color: ${b['.copy border']} !important; }
                         .copy:hover { border-color: ${b['.copy:hover border']} !important; }`;
        document.head.appendChild(s);
      }, BEFORE);
      await page.waitForTimeout(300);
      const bst = await read(page, ['.copy']);
      const bpx = await samplePainted(page, [bst['.copy'].center]);
      const beforeEdge = over(bst['.copy'].border, bpx[0]);
      check('`.copy` — מסגרת **לפני** מול המילוי', beforeEdge, bpx[0], 3);
      // This one **passed before too**, and is graded rather than hidden because
      // that is the shape of the defect: the edge was sufficient against the
      // .value box outside it and vanished against the button's own fill inside
      // it. A "before" row demanded to fail on both sides would be claiming a
      // larger bug than the one that was there.
      check('`.copy` — מסגרת **לפני** מול תיבת הערך', beforeEdge, valueBg, 3,
        'עבר גם לפני — הפגם היה בצד הפנימי בלבד');
      await page.hover('.copy');
      await page.waitForTimeout(300);
      const bhst = await read(page, ['.copy']);
      const bhpx = await samplePainted(page, [bhst['.copy'].center]);
      check('`.copy:hover` — מסגרת **לפני** מול המילוי המובהר', over(bhst['.copy'].border, bhpx[0]), bhpx[0], 3);
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.getElementById('qa-before')?.remove());
      await page.waitForTimeout(300);
    }

    // ---------- screen 2: the same page with no code in the URL ----------
    await page.goto(`${origin}/kiosk/install`);
    await page.waitForSelector('#no-code:not(.hide)');
    st = await read(page, ['#no-code', '#no-code b', '#lede']);
    px = await samplePainted(page, [st['#no-code'].center, st['#no-code b'].center, st['#lede'].center]);
    if (first) {
      await page.screenshot({ path: `${HERE}02-no-code.png`, fullPage: true });
      check('`.warn` — "אין קוד רישום בכתובת הזו"', ink(st['#no-code'].color, px[0]), px[0], textMin(st['#no-code']));
      check('`.warn b` — המסלול בקונסולה', ink(st['#no-code b'].color, px[1]), px[1], textMin(st['#no-code b']));
      check('`#lede` — הנוסח השני (בלי קוד)', ink(st['#lede'].color, px[2]), px[2], textMin(st['#lede']));
      check('`.warn` — מסגרת מול המילוי', over(st['#no-code'].border, px[0]), px[0], 0,
        'מסגרת של הודעה, לא של פקד');
    }

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

// The page declares `color-scheme: dark` and hardcodes its palette. That is a
// claim about what a tablet does at 8am, so it is asserted rather than read.
const same = JSON.stringify(surfaces.dark) === JSON.stringify(surfaces.light);
rows.push({
  what: 'הדף כהה בשני מצבי המערכת (‎prefers-color-scheme‎)',
  fg: surfaces.dark.cardBg, bg: surfaces.light.cardBg,
  ratio: same ? 'זהה' : 'שונה', min: 'זהה', ok: same, note: 'משטחים נדגמו בשתי הרצות',
});
if (!same) process.exitCode = 1;

console.log('\n| מה נמדד | קדמת | רקע | יחס | סף | | הערה |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const mark = r.ok === null ? 'ℹ️' : r.ok ? '✅' : '❌';
  console.log(`| ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${mark} | ${r.note} |`);
}
const graded = rows.filter((r) => r.ok !== null);
console.log(`\n${graded.filter((r) => r.ok).length}/${graded.length} עוברים (שורות ה"לפני" אמורות ליפול), ${rows.length - graded.length} שורות מידע.`);
