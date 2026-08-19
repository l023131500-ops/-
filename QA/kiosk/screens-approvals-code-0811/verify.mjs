// QA for the last two screens of `STATUS.md` item 6's screen-by-screen pass —
// the **approvals picker** (both halves: 🆔 מזהי לקוח and 📚 קישורים מאושרים)
// and the **🔑 קוד גישה** dialog. 2026-08-11.
//
// `screens-links-clients-0811` graded the two sidebar screens and named these as
// what was left. This is that harness, reused rather than re-derived, with its
// two corrections kept:
//
//   * every selector is scoped — here to `.modal-bg`, because the console keeps
//     the device grid mounted underneath an open dialog, so an unscoped `.card p`
//     or `b` grades a device card and reports it as the picker;
//   * the injected control row is **per mode** — one grey cannot be a near-miss
//     on both a white modal and a near-black one.
//
// And its finding is carried forward as a check rather than a note: what that
// run caught was not a ratio under threshold but a *secondary* text that had
// become indistinguishable from the primary above it. The approvals row has the
// same shape — a name, then two lines under it — so the row is graded for
// hierarchy as well as for contrast.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8809;
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
// 1.4.3's own rule rather than a quoted constant — this pass renders `.code-chip`
// at 30px in one place and at 14px in another.
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
// folded into the foreground's alpha. Necessary here and not merely tidy: the
// client's code in the approvals row declares `background: var(--bg)` on itself,
// which is a *different* surface from the modal the line above it sits on.
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

/**
 * Every pixel Chromium actually painted inside one element's box.
 *
 * The checkbox is the whole point of this screen and `getComputedStyle` cannot
 * see it: it is drawn by the UA, so it has no `border-color` and no
 * `background-color` of its own to read. `launcher-contrast-0811` sampled
 * painted pixels for backdrops and warned that picking "whichever neighbouring
 * pixel looks like the border" is a way to get the answer you wanted — so this
 * hands back the **whole box** and the caller takes its extreme. That is a
 * one-sided test: the most extreme pixel in the control is an upper bound on
 * its boundary contrast, so it can miss a failure but cannot invent one.
 */
async function sampleBox(page, sel, nth = 0) {
  const rect = await page.evaluate(([s, i]) => {
    const e = document.querySelectorAll(s)[i];
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, [sel, nth]);
  if (!rect) return null;
  const b64 = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ b64, rect }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    const d = g.getImageData(Math.round(rect.x * k), Math.round(rect.y * k),
      Math.max(1, Math.round(rect.w * k)), Math.max(1, Math.round(rect.h * k))).data;
    const px = [];
    for (let i = 0; i < d.length; i += 4) px.push(`rgb(${d[i]}, ${d[i + 1]}, ${d[i + 2]})`);
    return px;
  }, { b64, rect });
}

// Re-inject the declaration and read it in a later tick — `.btn` carries
// `transition: .15s`, and a read inside the injection's own tick returns the
// colour the transition started from.
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

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
let shot = 0;
const name = () => `${HERE}${++shot < 10 ? '0' : ''}${shot}`;

// A `.modal-bg`-scoped read of one selector, graded at 1.4.3's threshold for its
// own size and weight. Every row on all three dialogs goes through this.
const grade = async (page, mode, screen, list) => {
  const out = {};
  for (const [key, sel, what] of list) {
    const el = await page.evaluate(PAINTED, `.modal-bg ${sel}`);
    if (!el) { fail(`${screen}: ${sel} לא נמצא`); continue; }
    out[key] = el;
    check(mode, screen, `${what} — "${el.text}"`, el.color, el.bg, threshold(el.size, el.weight), `${el.size}px/${el.weight}`);
  }
  return out;
};

// The check `screens-links-clients-0811` ended on, generalised: a line that is
// meant to be read as subordinate to the one above it must differ from it in
// colour or in size. Same colour *and* same size means the two read as one
// block, which is how a client's private note became a second line of the name.
const hierarchy = (mode, screen, label, primary, secondary) => {
  if (!primary || !secondary) return;
  if (primary.color === secondary.color && primary.size === secondary.size) {
    fail(`${screen}: ${label} — ${secondary.color} ${secondary.size}px, זהה לשורה שמעליה; שתיהן נקראות כטקסט אחד`);
  } else {
    console.log(`[${mode}] ${screen} · ${label}: ${primary.color} ${primary.size}px מול ${secondary.color} ${secondary.size}px ✅`);
  }
};

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    const card = page.locator('.device').first();

    // ── screen 3: 🆔 מזהי לקוח (the approvals picker) ─────────────
    await card.getByRole('button', { name: '🆔 מזהי לקוח' }).click();
    await page.waitForSelector('#ap-list label');

    const A = 'מזהי לקוח מאושרים';
    const a = await grade(page, mode, A, [
      ['h3', 'h3', 'כותרת הדיאלוג'],
      ['sub', 'p', 'שורת ההסבר מתחת לכותרת (--muted)'],
      ['cnt', '#cnt', 'מונה "כמה מתוך כמה" (13px)'],
      ['nm', '#ap-list label b', 'שם הלקוח'],
      ['code', '#ap-list label span[style*="monospace"]', 'מזהה הלקוח (13px monospace)'],
      ['url', '#ap-list label span[style*="display:block"]', 'כתובת האתר של הלקוח (12px)'],
      ['all', '#all', 'כפתור "סמן הכל"'],
      ['save', '#s', 'כפתור "שמירה"'],
      ['cancel', '#c', 'כפתור "ביטול"'],
    ]);
    // The `⛔ הלקוח מושבת` line is the only thing in this dialog saying a ticked
    // client will not actually come up, and it is `--warn-ink` — graded on its
    // own row because it renders for one client out of two.
    const off = await page.evaluate(PAINTED, '#ap-list label:nth-of-type(2) span[style*="--warn-ink"]');
    if (off) check(mode, A, `שורת "לקוח מושבת" (--warn-ink) — "${off.text}"`, off.color, off.bg, threshold(off.size, off.weight), `${off.size}px/${off.weight}`);
    else fail(`${A}: שורת הלקוח המושבת לא נמצאה`);
    // The hint under the list is the last paragraph in the dialog and the
    // smallest text in it (12px). `:last-of-type` and not the last `<p>` in the
    // document — the device grid stays mounted behind the dialog.
    const hintEl = await page.evaluate(PAINTED, '.modal-bg .modal p:last-of-type');
    if (hintEl) check(mode, A, `הערת הדומיינים מתחת לרשימה (12px) — "${hintEl.text}"`, hintEl.color, hintEl.bg, threshold(hintEl.size, hintEl.weight), `${hintEl.size}px/${hintEl.weight}`);

    hierarchy(mode, A, 'כתובת מול שם הלקוח', a.nm, a.url);
    hierarchy(mode, A, 'מזהה מול שם הלקוח', a.nm, a.code);

    // The checkbox itself. It is the only control on this screen that does the
    // screen's job — everything graded above is text describing it — and it is
    // 1.4.11's own example of a control whose boundary must reach 3:1. The
    // surface it sits on is the modal, read from the same painted pixels rather
    // than quoted, since `.modal` declares `#fff` in light and `var(--card)` in
    // dark and only one of those is a token.
    const surface = (await page.evaluate(PAINTED, '.modal-bg #ap-list label')).bg;
    for (const [i, what] of [[0, 'מסומנת'], [1, 'לא מסומנת']]) {
      const px = await sampleBox(page, '#ap-list input[type=checkbox]', i);
      if (!px) { fail(`${A}: תיבת סימון ${i} לא נמצאה`); continue; }
      let best = null, r = 0;
      for (const p of px) { const q = ratio(p, surface); if (q > r) { r = q; best = p; } }
      check(mode, A, `גבול תיבת הסימון (${what}) — הפיקסל הקיצוני בתיבה`, best, surface, 3, '1.4.11, דגימה');
      // The control's colour is the point of the fix, not only its ratio: a
      // checked box painted in Chromium's own blue passes 1.4.11 and still is
      // not this console's blue. Asserted on the ticked box, where the accent
      // is the fill; the unticked one is a UA grey in both modes and stays so.
      if (i === 0) {
        const want = mode === 'dark' ? 'rgb(126, 166, 255)' : 'rgb(42, 97, 232)';
        if (best !== want) fail(`${A}: תיבה מסומנת נצבעה ${best}, לא ‎--accent-control‎ (${want})`);
        else console.log(`[${mode}] תיבת סימון מסומנת — ‎--accent-control‎ ${best} ✅`);
      }
    }
    // The "before": `accent-color` removed, i.e. the UA default this replaced.
    // Recorded rather than asserted-to-fail — the point of this one is that it
    // *passed* 1.4.11 and was still the wrong blue, which a ratio cannot say.
    await page.addStyleTag({ content: ':root { accent-color: auto !important; }' });
    await page.waitForTimeout(120);
    const wasPx = await sampleBox(page, '#ap-list input[type=checkbox]', 0);
    let was = null, wr = 0;
    for (const p of wasPx) { const q = ratio(p, surface); if (q > wr) { wr = q; was = p; } }
    push(mode, A, 'גבול תיבת הסימון (מסומנת) — **לפני**, ברירת המחדל של הדפדפן', was, surface, 3, 'עבר גם לפני — הבעיה היא הגוון');
    await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());

    await page.locator('.modal').screenshot({ path: `${name()}-clients-approvals-${mode}.png` });
    await page.click('.modal #c');

    // ── screen 4: 📚 קישורים מאושרים ─────────────────────────────
    await card.getByRole('button', { name: '📚 קישורים מאושרים' }).click();
    await page.waitForSelector('#lk-list label');

    const K = 'קישורים מאושרים';
    const k = await grade(page, mode, K, [
      ['h3', 'h3', 'כותרת הדיאלוג'],
      ['sub', 'p', 'שורת ההסבר מתחת לכותרת (--muted)'],
      ['cnt', '#cnt', 'מונה "כמה מתוך כמה" (13px)'],
      ['nm', '#lk-list label b', 'שם הקישור'],
      ['url', '#lk-list label span[dir="ltr"]', 'כתובת הקישור (12px)'],
      ['save', '#s', 'כפתור "שמירה"'],
    ]);
    hierarchy(mode, K, 'כתובת מול שם הקישור', k.nm, k.url);

    await page.locator('.modal').screenshot({ path: `${name()}-link-approvals-${mode}.png` });
    await page.click('.modal #c');

    // ── screen 5: 🔑 קוד גישה ────────────────────────────────────
    await card.getByRole('button', { name: '🔑 קוד גישה' }).click();
    await page.waitForSelector('#ac-code');

    const G = 'קוד גישה למכשיר';
    await grade(page, mode, G, [
      ['h3', 'h3', 'כותרת הדיאלוג'],
      ['sub', 'p', 'שם המכשיר ומספר סידורי (--muted)'],
      ['code', '#ac-code', 'הקוד עצמו (code-chip @30px)'],
      ['why', '.modal p:last-of-type', 'פסקת ההסבר על דליפת קוד (13px)'],
      ['cp', '#cp', 'כפתור "העתקה"'],
      ['new', '#new', 'כפתור "הנפקת קוד חדש"'],
    ]);
    await page.locator('.modal').screenshot({ path: `${name()}-access-code-${mode}.png` });

    // The inline confirmation replaces the button row. Its warning sentence is
    // the last thing a person reads before an irreversible action, so it is
    // graded in the state it is actually read in, not as a rule in a stylesheet.
    await page.click('.modal #new');
    await page.waitForSelector('.modal #y');
    await grade(page, mode, G, [
      ['warn', '#ac-confirm p', 'אזהרת "הקוד הנוכחי יפסיק לעבוד" (--warn-ink)'],
      ['yes', '#y', 'כפתור "כן, הנפק קוד חדש"'],
      ['no', '#n', 'כפתור "ביטול" שליד האדום'],
    ]);
    await page.locator('.modal').screenshot({ path: `${name()}-access-code-confirm-${mode}.png` });

    // The "before" row, injected into this same DOM in this same run: without it
    // the table above is a list of numbers that cannot fail. Per mode — one grey
    // cannot be a near-miss on both a white modal and a near-black one.
    const BAD = { light: '#b9c3d4', dark: '#2a3550' }[mode];
    const badBg = (await page.evaluate(PAINTED, '.modal-bg h3')).bg;
    const bad = await page.evaluate(BEFORE, ['.modal-bg h3', '.modal h3 { color: ' + BAD + ' !important; }']);
    push(mode, G, 'כותרת הדיאלוג — ערך פסול שהוזרק (בקרת שפיות)', bad, badBg, 4.5);

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
