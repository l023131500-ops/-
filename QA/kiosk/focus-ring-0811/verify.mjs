// The keyboard focus indicator in the kiosk console. 2026-08-11.
//
// Every contrast run in `QA/kiosk/*` so far graded the console at rest: what a
// colour is when nothing is focused. Not one of them pressed Tab. And the two
// rules that decide what a keyboard user sees both open with `outline: none`:
//
//   .field input:focus, .field select:focus, .field textarea:focus {
//     outline: none; border-color: var(--accent); background: var(--field-bg-focus); }
//   .hl-new:focus { outline: none; ... }
//
// So the UA's focus ring is suppressed on every field in the console — the login
// form included — and what replaces it is a border-colour swap. That swap is the
// whole indicator, and it is measured here for the first time:
//
//   light  `#858e9e` → `#2a61e8`   the two states of the border
//   dark   `#61708f` → `#2a61e8`   ← the same target colour, on a paler border
//
// WCAG 2.4.7 (Level A) asks that the focus indicator be visible; 2.4.11 (AA in
// 2.2) puts a number on it — 3:1 between the focused and unfocused states of the
// indicator area. What this run grades is therefore not "is a colour readable"
// but **how far the control moves when it takes focus**, which is a different
// measurement from every earlier one here and needs the unfocused state sampled
// as well as the focused one.
//
// The grade is the **best** cue available on each control, not the outline alone:
// the border swap and the fill swap are real cues too, and grading only the ring
// would let a control pass on a ring while claiming credit the border earns, or
// fail while a visible fill change is on screen. Each of the three is printed
// beside the row so the number can be checked rather than believed.
//
// The control rows re-inject `outline: none` and require the same row to come out
// **under** 3:1. That is the "before", measured in this run rather than quoted —
// and it is the half that proves the check is able to fail at all, since a border
// swap of *some* size exists in both states and a pixel diff alone would pass
// before and after.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: the real
// `server/public/`, canned API only.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8824;
const BASE = `http://127.0.0.1:${PORT}`;
const MARGIN = 8;   // the outline sits OUTSIDE the border box, so the clip must too
const NEED = 3.0;   // WCAG 2.4.11

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);

const chan = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * chan(r / 255) + 0.7152 * chan(g / 255) + 0.0722 * chan(b / 255);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const rgb = (s) => {
  const m = String(s).match(/-?[\d.]+/g);
  if (!m) return null;
  // A fully transparent colour is not a cue. `outline-color` computes to the
  // element's `color` when the outline is `none`, so without this an unpainted
  // ring would be graded as if it were on screen.
  if (m.length > 3 && Number(m[3]) === 0) return null;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
};
const fmt = (c) => (c ? `rgb(${c.join(', ')})` : '—');
const n2 = (x) => (x === null ? '—' : x.toFixed(2));

// The surface the ring lands on, read from the pixel actually painted there in
// the UNFOCUSED shot rather than from the token: with `outline-offset: 2px` the
// ring sits outside the border box, on whatever is behind the control — a card,
// a modal, the page, or the sunken row of the domain list — and one quoted value
// would be right for some of those and wrong for the rest. Same reason
// `button-boundary-0811` walked the DOM; here the pixel is simpler and truer,
// because the clip already contains it.
const cornerOf = (page, png) => page.evaluate(async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, 1, 1).data;
  if (d[3] !== 255) throw new Error('non-opaque pixel in screenshot');
  return [d[0], d[1], d[2]];
}, 'data:image/png;base64,' + png.toString('base64'));

// Page coordinates, computed in the page and expanded by MARGIN, rather than
// `elementHandle.screenshot()`: that one clips to the border box, which is
// exactly the region an `outline` is NOT in. The same clip is used for both
// states, so the two shots are comparable by construction.
const clipOf = (page, sel) => page.evaluate(([s, m]) => {
  const r = document.querySelector(s).getBoundingClientRect();
  return {
    x: Math.max(0, r.x + window.scrollX - m),
    y: Math.max(0, r.y + window.scrollY - m),
    width: r.width + 2 * m,
    height: r.height + 2 * m,
  };
}, [sel, MARGIN]);

const styleOf = (page, sel) => page.evaluate((s) => {
  const cs = getComputedStyle(document.querySelector(s));
  return {
    outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth,
    outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset,
    border: cs.borderTopColor, bg: cs.backgroundColor,
  };
}, sel);

// One control, both states. Nothing is asserted here — the caller grades, so the
// control rows can run the identical path with a declaration injected.
const measure = async (page, sel) => {
  await page.evaluate((s) => {
    document.activeElement?.blur();
    document.querySelector(s).scrollIntoView({ block: 'center' });
  }, sel);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  const clip = await clipOf(page, sel);
  const off = await styleOf(page, sel);
  const offPng = await page.screenshot({ clip, animations: 'disabled' });

  await page.evaluate((s) => document.querySelector(s).focus(), sel);
  await page.waitForTimeout(120);
  const on = await styleOf(page, sel);
  const onPng = await page.screenshot({ clip, animations: 'disabled' });
  await page.evaluate(() => document.activeElement?.blur());

  const surface = await cornerOf(page, offPng);
  const ringPainted = on.outlineStyle !== 'none' && parseFloat(on.outlineWidth) > 0;
  const ring = ringPainted ? rgb(on.outlineColor) : null;

  const cues = {
    // The ring is graded against what it is drawn ON, because it does not
    // replace anything — it appears where there was surface.
    ring: ring ? ratio(ring, surface) : null,
    // The border and the fill are graded between their own two states: they
    // were there before, so what a person sees is the change.
    border: rgb(off.border) && rgb(on.border) ? ratio(rgb(off.border), rgb(on.border)) : null,
    fill: rgb(off.bg) && rgb(on.bg) ? ratio(rgb(off.bg), rgb(on.bg)) : null,
  };
  const best = Math.max(...Object.values(cues).map((v) => v ?? 0));
  return {
    cues, best, surface, ring,
    width: ringPainted ? on.outlineWidth : '0px',
    offset: ringPainted ? on.outlineOffset : '—',
    moved: sha(offPng) !== sha(onPng),
    offPng, onPng,
  };
};

const CONTROLS = [
  { key: 'l-name', what: 'שם הקישור', screen: 'ספריית קישורים', sel: '#l-name', view: 'links', ready: '#l-create' },
  { key: 'hl-new', what: 'תיבת הדומיין החדש (‎.hl-new‎)', screen: 'ספריית קישורים', sel: '.hl-new', view: 'links', ready: '#l-create' },
  { key: 'e-link', what: 'בחירת קישור מהספרייה (‎select‎)', screen: 'הוספת מכשיר', sel: '#e-link', view: 'enroll', ready: '#e-create' },
  { key: 'e-idle', what: 'שניות חזרה אוטומטית (‎number‎)', screen: 'הוספת מכשיר', sel: '#e-idle', view: 'enroll', ready: '#e-create' },
  { key: 'cp', what: 'סיסמה נוכחית (‎password‎)', screen: 'הגדרות', sel: '#cp', view: 'settings', ready: '#chp' },
  {
    key: 'login-user', what: 'שם משתמש במסך הכניסה', screen: 'מסך הכניסה', sel: '#login-user',
    view: 'devices', ready: '.device',
    // The login card is the one screen a person reaches before any session, so
    // it is the one where an invisible focus ring costs the most — and it is
    // hidden behind `.hidden` once a token exists. Revealed the same way
    // `visited-link-0811` reached it.
    after: (page) => page.evaluate(() => document.querySelector('#login-view').classList.remove('hidden')),
  },
];

const KILL_RING = `.field input:focus, .field select:focus, .field textarea:focus, .hl-new:focus { outline: none !important; }`;

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

let n = 0;
const name = () => `${HERE}${++n < 10 ? '0' : ''}${n}`;

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1000 } });
    await ctx.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    const page = await ctx.newPage();
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    for (const c of CONTROLS) {
      await page.locator(`.side nav a[data-view=${c.view}]`).click();
      await page.waitForSelector(c.ready);
      if (c.after) await c.after(page);

      const m = await measure(page, c.sel);
      rows.push({
        mode, screen: c.screen, what: c.what, kind: 'הסימון',
        ring: m.cues.ring, border: m.cues.border, fill: m.cues.fill, best: m.best,
        px: m.width, ok: m.best >= NEED,
        note: `טבעת ${fmt(m.ring)} על ${fmt(m.surface)} · offset ${m.offset}`,
      });
      if (m.best < NEED) fail(`${c.key} (${mode}): הסימון החזק ביותר הוא ${n2(m.best)}:1 — מתחת ל-${NEED}:1`);
      if (!m.moved) fail(`${c.key} (${mode}): שום פיקסל לא זז בין לא-ממוקד לממוקד`);

      // ── the control: the declaration this step replaced, re-measured ──
      await page.evaluate((css) => {
        const s = document.createElement('style');
        s.id = 'qa-focus-control';
        s.textContent = css;
        document.head.appendChild(s);
      }, KILL_RING);
      const b = await measure(page, c.sel);
      rows.push({
        mode, screen: c.screen, what: `${c.what} — **בקרה** (‎outline:none‎)`, kind: 'לפני',
        ring: b.cues.ring, border: b.cues.border, fill: b.cues.fill, best: b.best,
        px: b.width, ok: b.best < NEED,
        note: b.moved ? 'פיקסלים כן זזו — ולכן ‎diff‎ לבדו אינו מודד את זה' : 'שום פיקסל לא זז',
      });
      if (b.best >= NEED) fail(`${c.key} (${mode}): הבקרה עברה — הבדיקה אינה מסוגלת ליפול`);
      await page.evaluate(() => document.querySelector('#qa-focus-control')?.remove());

      // The screenshot is of the focused state, which is the thing being claimed.
      await page.evaluate((s) => document.querySelector(s).focus(), c.sel);
      await page.waitForTimeout(120);
      await page.screenshot({ path: `${name()}-${c.key}-${mode}.png`, clip: await clipOf(page, c.sel) });
      await page.evaluate(() => document.activeElement?.blur());
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מסך | הפקד | סוג | טבעת | מסגרת | מילוי | הטוב ביותר | עובי | הערה | |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.screen} | ${r.what} | ${r.kind} | ${n2(r.ring)} | ${n2(r.border)} | ${n2(r.fill)} | **${n2(r.best)}** | ${r.px} | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => r.kind === 'לפני');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות בקרה: ${ctrl.filter((r) => r.ok).length} נפלו מתחת ל-${NEED}:1 בלי הטבעת.`);
