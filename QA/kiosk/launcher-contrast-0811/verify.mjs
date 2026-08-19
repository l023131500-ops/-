/**
 * `kiosk-launcher.html`, measured — #35 KioskFleet, 2026-08-11.
 *
 * `STATUS.md` "Next, in order" item 5: every contrast pass so far
 * (`dark-inputs-0811` → `line-contrast-0811`) opened one dialog in the console.
 * `index.html`, `install.html` and this page have never been measured, and this
 * is the one that renders full-screen on a tablet in a hall — read at arm's
 * length, in daylight, by someone typing a six-character code off a printed
 * card.
 *
 * Why this page cannot be measured the way the console was. The console's
 * surfaces are opaque, so `button-boundary-0811`'s "walk up to the first opaque
 * background" gives the real backdrop. Here **nothing is opaque**: every card,
 * row and button is a translucent white over two radial gradients over
 * `--navy`. Walking up finds `body`'s `background-color` and reports the navy —
 * which is the *darkest* thing on the page, so every ratio would come out
 * flattering and the light-tinted corner would never be looked at.
 *
 * So the backdrop is **sampled from the pixels Chromium actually painted**: a
 * screenshot is taken with every glyph made transparent, handed back into the
 * page as an image, drawn to a canvas, and read with `getImageData`. That
 * carries the gradient and the whole alpha stack with it. Foregrounds that are
 * themselves translucent (the placeholder, every border) are then composited
 * over that measured pixel — exact arithmetic on a measured value, rather than a
 * second assumption stacked on the first.
 *
 * Borders are composited rather than sampled on purpose: a 1px border on a
 * fractional rect is antialiased, and picking whichever of three neighbouring
 * pixels "looks like the border" is a way to get the answer you wanted.
 *
 * The page hardcodes its own dark palette and declares `color-scheme: dark` —
 * it has no light mode by design (a full-screen white panel at 8am is glare
 * behind a code). Both `colorScheme` values are driven anyway, and the sampled
 * surfaces are asserted **identical**, because that claim is only in a comment.
 *
 * Run: node QA/kiosk/launcher-contrast-0811/verify.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../launcher-display-url-page-0811/stub-server.mjs', import.meta.url));

// The values these rules had before this step — re-injected in the same run, in
// the same DOM, so the "before" rows are measured rather than quoted.
const BEFORE = {
  '#code::placeholder': 'rgba(255, 255, 255, 0.3)',
  '#code border': 'rgba(255, 255, 255, 0.25)',
  '.choice border': 'rgba(255, 255, 255, 0.2)',
  '.btn-primary': '#2a61e8',
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
const server = spawn(process.execPath, [STUB], { stdio: ['ignore', 'pipe', 'inherit'] });
const fixture = await new Promise((resolve, reject) => {
  let buf = '';
  server.stdout.on('data', (c) => {
    buf += c;
    const i = buf.indexOf('{');
    if (i < 0) return;
    try { resolve(JSON.parse(buf.slice(i))); } catch { /* still arriving */ }
  });
  setTimeout(() => reject(new Error('stub did not print its fixture')), 10000);
});

// --- in-page helpers ------------------------------------------------------
/** Computed style + viewport rect for a set of selectors, in one round trip. */
const READ = `(sels) => Object.fromEntries(sels.map((sel) => {
  const el = document.querySelector(sel);
  if (!el) return [sel, null];
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return [sel, {
    color: s.color,
    fontSize: parseFloat(s.fontSize),
    fontWeight: Number(s.fontWeight),
    border: s.borderTopColor,
    borderWidth: parseFloat(s.borderTopWidth),
    fill: s.backgroundColor,
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
 * a fill on some UA styles. Placeholders and emoji are covered by the same rule.
 */
async function samplePainted(page, points) {
  await page.addStyleTag({
    content: `*, *::placeholder, *::before, *::after {
      color: transparent !important; -webkit-text-fill-color: transparent !important;
      caret-color: transparent !important; text-shadow: none !important; }`,
  });
  await page.waitForTimeout(250);            // .btn/.choice carry transition: .15s
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
  // `.btn` and `.choice` carry `transition: .15s` — all properties, `color`
  // included — so the colour transitions *back* from transparent when this style
  // is removed, and the next `getComputedStyle` returns a value part way there.
  // The first driven pass here read `#code-submit`'s label as
  // `rgba(255, 255, 255, 0.74)` for exactly this reason.
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
      viewport: { width: 800, height: 1180 },   // a tablet held portrait, which is the case
    });
    const page = await ctx.newPage();

    // ---------- screen 1: the code form ----------
    await page.goto(`${fixture.origin}/kiosk/kiosk-launcher`);
    await page.waitForSelector('#code');
    // The page focuses the input on load, so a read taken here would report the
    // **focus** ring as the resting border and the resting one — the state the
    // field is in the moment anybody taps anything else — would never be
    // measured at all. That is how it stayed at .25 through this whole build.
    await page.evaluate(() => document.querySelector('#code').blur());

    const S1 = ['#step-code', 'h1', '.sub', 'label[for=code]', '#code', '.foot', '.brand'];
    let st = await read(page, S1);
    let px = await samplePainted(page, [
      st['#step-code'].inset, st['h1'].center, st['.sub'].center,
      st['label[for=code]'].center, st['#code'].center, st['.foot'].center, st['.brand'].center,
    ]);
    const [cardBg, h1Bg, subBg, labelBg, inputBg, footBg, brandBg] = px;
    surfaces[mode] = { cardBg, inputBg, footBg };

    if (first) {
      check('כרטיס — `h1` "פתיחת קיוסק"', st['h1'].color, h1Bg, textMin(st['h1']));
      check('כרטיס — `.sub` משפט ההסבר', st['.sub'].color, subBg, textMin(st['.sub']));
      check('כרטיס — `label` "קוד גישה"', st['label[for=code]'].color, labelBg, textMin(st['label[for=code]']));
      check('`#code` — הטקסט שמוקלד', st['#code'].color, inputBg, textMin(st['#code']));
      check('`.brand` — שם המוצר', st['.brand'].color, brandBg, textMin(st['.brand']));
      check('`.foot` — השורה מתחת לכרטיס', st['.foot'].color, footBg, textMin(st['.foot']));

      // The placeholder is real text: it is the only thing on the screen saying
      // the code is six characters long, and it is read before anything is typed.
      const ph = await page.evaluate(() => {
        const s = document.createElement('span');
        document.body.appendChild(s);
        const v = getComputedStyle(document.querySelector('#code'), '::placeholder').color;
        s.remove();
        return v;
      });
      check('`#code::placeholder` — "XXXXXX"', over(ph, inputBg), inputBg, 4.5);
      // The empty form, which is the state the placeholder is read in and the
      // one `01` (taken after a refused code) cannot show.
      await page.screenshot({ path: `${HERE}04-empty-form.png` });

      // The input's own boundary — against the fill inside it and the card
      // outside it both. A border that vanishes on one side has vanished.
      //
      // The composite base is the element's **own** fill in both rows, not the
      // card: `background-clip` is `border-box` by default, so a translucent
      // border is painted over its own element's background and the same
      // composited colour is what meets the card on the other side.
      const codeEdge = over(st['#code'].border, inputBg);
      check('`#code` — מסגרת מול המילוי (פקד)', codeEdge, inputBg, 3);
      check('`#code` — מסגרת מול הכרטיס (פקד)', codeEdge, cardBg, 3);
      check('`#step-code` — מסגרת הכרטיס מול הרקע', over(st['#step-code'].border, footBg), footBg, 0,
        'מפריד בין משטחים — 1.4.11 פוטר');
    }

    // focus ring, and the button once it is enabled
    await page.fill('#code', 'ZZZZZZ');
    await page.focus('#code');
    st = await read(page, ['#code', '#code-submit']);
    px = await samplePainted(page, [st['#code'].center, st['#code-submit'].center]);
    if (first) {
      check('`#code:focus` — טבעת המיקוד מול המילוי', over(st['#code'].border, px[0]), px[0], 3);
      check('`#code:focus` — טבעת המיקוד מול הכרטיס', over(st['#code'].border, cardBg), cardBg, 3);
      check('`#code-submit` — "המשך" (טקסט)', st['#code-submit'].color, px[1], textMin(st['#code-submit']));
      check('`#code-submit` — מילוי הכפתור מול הכרטיס (גבול הפקד)', px[1], cardBg, 3);

      // ---------- "before", on this screen, in this DOM ----------
      await page.evaluate((b) => {
        const s = document.createElement('style');
        s.id = 'qa-before';
        s.textContent = `#code::placeholder { color: ${b['#code::placeholder']} !important; }
                         #code { border-color: ${b['#code border']} !important; }
                         .btn { font-size: 17px !important; }
                         .btn-primary { background: ${b['.btn-primary']} !important; }`;
        document.head.appendChild(s);
        document.querySelector('#code').blur();
      }, BEFORE);
      await page.waitForTimeout(300);      // .btn carries transition: .15s — a read
                                           // in the injection's own tick returns
                                           // where the transition started, which is
                                           // how `button-boundary-0811`'s harness
                                           // first reported the bug as absent.
      const bst = await read(page, ['#code', '#code-submit']);
      const bph = await page.evaluate(() => getComputedStyle(document.querySelector('#code'), '::placeholder').color);
      const bpx = await samplePainted(page, [bst['#code'].center, bst['#code-submit'].center]);
      check('`#code::placeholder` — **לפני** (הוזרק מחדש)', over(bph, bpx[0]), bpx[0], 4.5);
      check('`#code` — מסגרת **לפני** (הוזרקה מחדש)', over(bst['#code'].border, bpx[0]), bpx[0], 3);
      check('`#code-submit` — מילוי **לפני** מול הכרטיס', bpx[1], cardBg, 3);
      check('`#code-submit` — הטקסט **לפני** ב-17px', bst['#code-submit'].color, bpx[1], textMin(bst['#code-submit']),
        'עבר גם לפני — 17px נספר כטקסט רגיל, ולכן 4.5:1');
      await page.evaluate(() => document.getElementById('qa-before')?.remove());
      await page.waitForTimeout(300);
    }

    // ---------- the error alert ----------
    await page.click('#code-submit');
    await page.waitForSelector('#code-error:not(.hidden)');
    st = await read(page, ['#code-error']);
    px = await samplePainted(page, [st['#code-error'].center]);
    if (first) {
      check('`.alert` — טקסט השגיאה', st['#code-error'].color, px[0], textMin(st['#code-error']));
      check('`.alert` — מסגרת מול המילוי', over(st['#code-error'].border, px[0]), px[0], 0,
        'מסגרת של הודעה, לא של פקד');
      check('`.alert` — המילוי מול הכרטיס', px[0], cardBg, 0, 'הטקסט הוא הנשא, לא הצבע');
      await page.screenshot({ path: `${HERE}01-code-screen.png` });
    }

    // ---------- screen 2: the selection, on the device with all four row kinds ----------
    await page.goto(`${fixture.origin}/kiosk/kiosk-launcher/${fixture.deviceWithOwnLink.code}`);
    await page.waitForSelector('.choice');
    const kinds = ['.choice.shown', '.choice.venue', '.choice:not(.shown):not(.venue):not(.link)', '.choice.link'];
    const S2 = ['#step-choose', '.choice', '.choice b', '.choice small', '.devicename', '.btn-link', ...kinds.map((k) => k + ' .ico')];
    st = await read(page, S2);
    px = await samplePainted(page, [
      st['#step-choose'].inset, st['.choice'].center, st['.choice b'].center,
      st['.choice small'].center, st['.devicename'].center, st['.btn-link'].center,
      ...kinds.map((k) => st[k + ' .ico'].center),
    ]);
    const [card2, choiceBg, bBg, smallBg, devBg, linkBg, ...icoBg] = px;

    if (first) {
      check('`.choice b` — שם היעד', st['.choice b'].color, bBg, textMin(st['.choice b']));
      check('`.choice small` — הכתובת מתחת לשם', st['.choice small'].color, smallBg, textMin(st['.choice small']));
      check('`.devicename` — "מכשיר: …"', st['.devicename'].color, devBg, textMin(st['.devicename']));
      check('`.btn-link` — "הזנת קוד אחר"', st['.btn-link'].color, linkBg, textMin(st['.btn-link']));
      const choiceEdge = over(st['.choice'].border, choiceBg);
      check('`.choice` — מסגרת מול מילוי השורה (פקד)', choiceEdge, choiceBg, 3);
      check('`.choice` — מסגרת מול הכרטיס (פקד)', choiceEdge, card2, 3);
      check('`.choice` — מילוי השורה מול הכרטיס', choiceBg, card2, 0, 'המסגרת היא גבול הפקד, לא המילוי');
      kinds.forEach((k, i) => check(`\`${k} .ico\` — גוון הסוג מול מילוי השורה`, icoBg[i], choiceBg, 0,
        'הסמל נושא את ההבחנה, לא הגוון'));
      await page.screenshot({ path: `${HERE}02-selection-screen.png` });

      // ---------- the "nothing approved" state ----------
      await page.goto(`${fixture.origin}/kiosk/kiosk-launcher/${fixture.deviceFollowingMainSite.code}`);
      await page.waitForSelector('.empty:not(.hidden)');
      st = await read(page, ['.empty']);
      px = await samplePainted(page, [st['.empty'].center]);
      check('`.empty` — "לא אושרו מזהי לקוח ולא קישורים"', st['.empty'].color, px[0], textMin(st['.empty']));
      await page.screenshot({ path: `${HERE}03-nothing-approved.png` });

      // ---------- "before", same DOM, same run ----------
      await page.goto(`${fixture.origin}/kiosk/kiosk-launcher/${fixture.deviceWithOwnLink.code}`);
      await page.waitForSelector('.choice');
      await page.evaluate((b) => {
        const s = document.createElement('style');
        s.id = 'qa-before';
        s.textContent = `.choice { border-color: ${b['.choice border']} !important; }`;
        document.head.appendChild(s);
      }, BEFORE);
      await page.waitForTimeout(300);      // .choice carries transition: .15s
      const cst = await read(page, ['.choice', '#step-choose']);
      const cpx = await samplePainted(page, [cst['.choice'].center, cst['#step-choose'].inset]);
      const beforeEdge = over(cst['.choice'].border, cpx[0]);
      check('`.choice` — מסגרת **לפני** מול המילוי', beforeEdge, cpx[0], 3);
      check('`.choice` — מסגרת **לפני** מול הכרטיס', beforeEdge, cpx[1], 3);
      await page.evaluate(() => document.getElementById('qa-before')?.remove());
    }

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

// The page claims, in a comment, that it is dark at both settings. That is a
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
