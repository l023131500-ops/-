// The kiosk console's navigation, by keyboard. 2026-08-11.
//
// STATUS.md item 7 named this as the first thing to measure under the keyboard
// heading, and it was a *reading* off the markup, not a measurement:
//
//   <nav id="menu">
//     <a data-view="devices" class="active">🖥️ המכשירים שלי</a>
//     ...
//   <a id="logout-btn" class="btn btn-ghost btn-sm">התנתקות</a>
//
// An `<a>` with no `href` is not a link and is not focusable. So every one of
// the console's seven screens, plus logging out, was reachable by mouse only —
// WCAG 2.1.1 (Level A), and not a contrast question: no colour value makes an
// element that is not in the tab sequence reachable.
//
// What this run grades is therefore reachability first and the indicator
// second, and it needs both halves:
//
//   1. the tab sweep — press Tab from the top of the document and record what
//      `document.activeElement` actually is at each stop. Presence of the
//      target in that sequence is the finding; DOM order within it is asserted
//      too, because a nav whose items arrive in a scrambled order is 2.4.3.
//   2. **the control** — the previous markup, re-injected into the same live
//      page: every nav item and the logout control turned back into an `<a>`
//      with no `href`, same classes, same text. The sweep is re-run and every
//      one of them is required to be **absent**. That is the "before", measured
//      here rather than quoted, and it is the half that proves the check can
//      fail: a sweep that finds its targets proves nothing if it would also
//      find them when they are anchors.
//   3. activation — Enter *and* Space on a focused nav item must route. A
//      `<div tabindex=0>` would pass (1) and fail this; a `<button>` gets both
//      from the platform.
//   4. the indicator, on the surface it lands on. `focus-ring-0811` graded the
//      fields; these are the first controls here whose surface is `--navy`,
//      which does not invert, and the light `--focus-ring` gives only 3.30:1 on
//      it — hence `--focus-ring-navy`.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: the real
// `server/public/`, canned API only.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8826;
const BASE = `http://127.0.0.1:${PORT}`;
const MARGIN = 8;   // the outline sits OUTSIDE the border box, so the clip must too
const NEED = 3.0;   // WCAG 2.4.11
const MAX_TABS = 40;

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
  if (m.length > 3 && Number(m[3]) === 0) return null;   // transparent is not a cue
  return [Number(m[0]), Number(m[1]), Number(m[2])];
};
const fmt = (c) => (c ? `rgb(${c.join(', ')})` : '—');
const n2 = (x) => (x === null || x === undefined ? '—' : x.toFixed(2));

// The seven things that had to become reachable. `admin` carries `.hidden` for a
// non-admin session and is deliberately NOT expected in the sweep — an element
// that is `display: none` is correctly out of the tab order, and demanding it
// would make the check pass for the wrong reason on an admin session only.
const TARGETS = [
  { key: 'devices', label: '🖥️ המכשירים שלי' },
  { key: 'links', label: '🔗 ספריית קישורים' },
  { key: 'clients', label: '🆔 מזהי לקוח' },
  { key: 'enroll', label: '➕ הוספת מכשיר' },
  { key: 'guide', label: '📖 הוראות הפעלה' },
  { key: 'settings', label: '⚙️ הגדרות' },
];
const LOGOUT = { key: 'logout', label: '🚪 התנתקות', sel: '#logout-btn' };

// What the browser reports as focused, in a form that survives the console
// redrawing `#content` with innerHTML.
const KEYOF = `(el) => {
  if (!el || el === document.body || el === document.documentElement) return null;
  if (el.id === 'logout-btn') return 'logout';
  if (el.dataset && el.dataset.view) return 'nav:' + el.dataset.view;
  return (el.id ? '#' + el.id : el.tagName.toLowerCase()) + (el.className ? '.' + String(el.className).split(/\\s+/)[0] : '');
}`;

// `blur()` drops focus but does **not** move the sequential focus navigation
// starting point, which a click leaves on the element clicked — so the next Tab
// resumes from there and reaches an item near the top of the sidebar only after
// going all the way round the page. Focusing `body` moves the starting point
// itself; the attribute is removed again so the sweep does not count body as a
// stop of its own.
const reset = (page) => page.evaluate(() => {
  document.activeElement?.blur();
  window.scrollTo(0, 0);
  document.body.setAttribute('tabindex', '-1');
  document.body.focus();
  document.body.removeAttribute('tabindex');
});
const focusKey = (page) => page.evaluate(`(${KEYOF})(document.activeElement)`);

// Tab from the top of the document, and **stop when the sequence wraps**. The
// tab order is a ring: past the last control Chromium comes back to the first,
// so a fixed count of presses reports the early stops a second time — which is
// what made the control rows below claim the old markup was reachable, when
// what they had actually found was the second lap of the new markup.
const sweep = async (page) => {
  await reset(page);
  const seen = [];
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press('Tab');
    const k = await focusKey(page);
    if (seen.length && k && k === seen[0]) break;      // wrapped
    if (k) seen.push(k);
  }
  return seen;
};

// Tab **until** the target is focused rather than counting presses to it. The
// count is not knowable in advance: a stop whose key is null (the page itself,
// the more30 pill) is dropped from `seen`, so an index into that array is not a
// number of key presses — an off-by-one there landed every measurement on the
// *next* nav item and graded the wrong element.
const tabTo = async (page, key) => {
  await reset(page);
  for (let i = 1; i <= MAX_TABS; i++) {
    await page.keyboard.press('Tab');
    if (await focusKey(page) === key) return i;
  }
  return -1;
};

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
    bg: cs.backgroundColor,
  };
}, sel);

// The surface the ring lands on, read from the pixel actually painted there in
// the unfocused shot rather than from `--navy`: at `outline-offset: 2px` the
// ring sits outside the border box, and for the *active* item that is the navy
// beside an `--accent` fill rather than the fill itself.
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

// Focus is taken **by keyboard**, never by `el.focus()`. The rule under test is
// `:focus-visible`, and a scripted `focus()` on a button does not always match
// it — grading the ring after one would measure a rule that a real user's Tab
// press does not trigger, or miss one it does.
const measureRing = async (page, sel, key) => {
  await reset(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  const clip = await clipOf(page, sel);
  const off = await styleOf(page, sel);
  const offPng = await page.screenshot({ clip, animations: 'disabled' });

  const presses = await tabTo(page, key);
  const landed = await focusKey(page);
  await page.waitForTimeout(120);
  const on = await styleOf(page, sel);
  const onPng = await page.screenshot({ clip, animations: 'disabled' });

  const surface = await cornerOf(page, offPng);
  const painted = on.outlineStyle !== 'none' && parseFloat(on.outlineWidth) > 0;
  const ring = painted ? rgb(on.outlineColor) : null;
  const fill = rgb(off.bg) && rgb(on.bg) ? ratio(rgb(off.bg), rgb(on.bg)) : null;
  const ringR = ring ? ratio(ring, surface) : null;
  return {
    landed, presses, ring, ringR, fill, surface,
    best: Math.max(ringR ?? 0, fill ?? 0),
    width: painted ? on.outlineWidth : '0px',
    offset: painted ? on.outlineOffset : '—',
    moved: sha(offPng) !== sha(onPng),
    clip,
  };
};

// The control: the markup as it was. Same classes, same text, same order — only
// `<button type=button>` becomes `<a>` with no `href`. It returns what it did,
// because a control that silently did nothing reports the *fixed* markup as the
// old one and passes for exactly the wrong reason.
const regress = (page) => page.evaluate(() => {
  const swap = (el) => {
    const a = document.createElement('a');
    a.className = el.className;
    a.textContent = el.textContent;
    for (const k of Object.keys(el.dataset)) a.dataset[k] = el.dataset[k];
    if (el.id) a.id = el.id;
    el.replaceWith(a);
    return a;
  };
  const swapped = [...document.querySelectorAll('#menu button')].map(swap);
  const lo = document.querySelector('#logout-btn');
  if (lo && lo.tagName === 'BUTTON') swapped.push(swap(lo));
  // Scripted focus, beside the tab sweep: `Tab` skips both an unfocusable
  // element and a `tabindex="-1"` one, so the sweep alone cannot tell "not in
  // the order" from "not focusable at all". An `<a>` with no `href` is the
  // second, and this is what says so.
  const takesFocus = swapped.filter((a) => { a.focus(); return document.activeElement === a; }).length;
  document.activeElement?.blur();
  return { swapped: swapped.length, buttonsLeft: document.querySelectorAll('#menu button').length, takesFocus };
});

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
    await page.evaluate(() => document.fonts.ready);

    // ── 1. the tab sweep ────────────────────────────────────────────
    const seen = await sweep(page);
    const want = [...TARGETS.map((t) => 'nav:' + t.key), 'logout'];
    for (const t of [...TARGETS, LOGOUT]) {
      const k = t.sel ? 'logout' : 'nav:' + t.key;
      const at = seen.indexOf(k);
      rows.push({
        mode, group: 'מסלול ה-Tab', what: t.label, kind: 'אחרי',
        value: at >= 0 ? `עצירה #${at + 1} מתוך ${seen.length}` : 'לא נמצא במסלול', ok: at >= 0,
      });
      if (at < 0) fail(`${k} (${mode}): לא הגיע מסלול ה-Tab — ${MAX_TABS} הקשות, ${seen.length} עצירות`);
    }
    const order = want.map((k) => seen.indexOf(k)).filter((i) => i >= 0);
    const sorted = [...order].every((v, i) => i === 0 || v > order[i - 1]);
    rows.push({
      mode, group: 'מסלול ה-Tab', what: 'סדר הפריטים כסדר ה-DOM (2.4.3)', kind: 'אחרי',
      value: order.join(' → '), ok: sorted,
    });
    if (!sorted) fail(`סדר ה-Tab בסרגל אינו סדר ה-DOM (${mode}): ${order.join(',')}`);

    // ── 3. activation, both keys ────────────────────────────────────
    for (const [key, view] of [['Enter', 'links'], [' ', 'clients']]) {
      // Tabbed to, not `focus()`ed: a scripted focus proves nothing about the
      // key path, and it is the key path that was broken.
      await tabTo(page, 'nav:' + view);
      const on = await focusKey(page);
      await page.keyboard.press(key === ' ' ? 'Space' : key);
      await page.waitForTimeout(250);
      const active = await page.evaluate(() => document.querySelector('#menu .active')?.dataset.view);
      const ok = on === 'nav:' + view && active === view;
      rows.push({
        mode, group: 'הפעלה מהמקלדת', what: `${key === ' ' ? 'Space' : key} על ${view}`, kind: 'אחרי',
        value: `מיקוד ${on} → מסך פעיל ${active}`, ok,
      });
      if (!ok) fail(`${key} (${mode}): מיקוד ${on}, מסך פעיל ${active} — ציפינו ל-${view}`);
    }

    // ── 4. the indicator, on the navy ───────────────────────────────
    await page.locator('.side nav [data-view=devices]').click();
    await page.waitForSelector('.device');
    for (const [i, t] of TARGETS.entries()) {
      const sel = `.side nav [data-view=${t.key}]`;
      const m = await measureRing(page, sel, 'nav:' + t.key);
      rows.push({
        mode, group: 'סימון המיקוד', what: t.label, kind: 'אחרי',
        value: `טבעת ${n2(m.ringR)} · מילוי ${n2(m.fill)} · **${n2(m.best)}**`,
        note: `${fmt(m.ring)} על ${fmt(m.surface)} · ${m.width} · offset ${m.offset} · ${m.presses} הקשות`,
        ok: m.best >= NEED && m.moved && m.landed === 'nav:' + t.key,
      });
      if (m.landed !== 'nav:' + t.key) fail(`${t.key} (${mode}): ה-Tab נחת על ${m.landed}`);
      else if (m.best < NEED) fail(`${t.key} (${mode}): הסימון ${n2(m.best)}:1 — מתחת ל-${NEED}:1`);
      else if (!m.moved) fail(`${t.key} (${mode}): שום פיקסל לא זז בין לא-ממוקד לממוקד`);

      if (i === 0) {
        await page.screenshot({ path: `${name()}-nav-focus-${mode}.png`, clip: m.clip });
        await page.screenshot({ path: `${name()}-sidebar-${mode}.png`, clip: await clipOf(page, '.side') });
      }
    }

    // ── 2. the control: the markup as it was ────────────────────────
    const swap = await regress(page);
    await page.waitForTimeout(80);
    rows.push({
      mode, group: 'בקרה — ‎<a>‎ בלי ‎href‎', what: 'ההחלפה עצמה בוצעה', kind: 'לפני',
      value: `${swap.swapped} הוחלפו · ${swap.buttonsLeft} כפתורים נותרו · ${swap.takesFocus} קיבלו מיקוד ב-‎focus()‎`,
      // Eight, not seven: the six screens the sweep expects, plus `admin`
      // (`.hidden` for a non-admin session, and swapped anyway — it is the same
      // markup), plus logout.
      ok: swap.swapped === 8 && swap.buttonsLeft === 0 && swap.takesFocus === 0,
    });
    if (swap.swapped !== 8 || swap.buttonsLeft !== 0) fail(`בקרה (${mode}): ההחלפה לא בוצעה — ${swap.swapped} הוחלפו, ${swap.buttonsLeft} נותרו`);
    if (swap.takesFocus !== 0) fail(`בקרה (${mode}): ${swap.takesFocus} מהעוגנים קיבלו מיקוד ב-‎focus()‎`);
    const after = await sweep(page);
    for (const t of [...TARGETS, LOGOUT]) {
      const k = t.sel ? 'logout' : 'nav:' + t.key;
      const gone = !after.includes(k);
      rows.push({
        mode, group: 'בקרה — ‎<a>‎ בלי ‎href‎', what: t.label, kind: 'לפני',
        value: gone ? 'לא במסלול ה-Tab' : `נמצא בעצירה #${after.indexOf(k) + 1}`, ok: gone,
      });
      if (!gone) fail(`בקרה (${mode}): ${k} נמצא במסלול גם כ-<a> בלי href — הבדיקה אינה מסוגלת ליפול`);
    }
    rows.push({
      mode, group: 'בקרה — ‎<a>‎ בלי ‎href‎', what: 'שאר עצירות הדף (שדות, כפתורים)', kind: 'לפני',
      value: `${after.length} עצירות נותרו`, ok: after.length > 0,
    });
    if (!after.length) fail(`בקרה (${mode}): המסלול התרוקן לגמרי — הסרנו יותר ממה שהתכוונו`);

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | קבוצה | הפריט | סוג | הנמדד | הערה | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.group} | ${r.what} | ${r.kind} | ${r.value} | ${r.note || ''} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => r.kind === 'לפני');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות בקרה: ${ctrl.filter((r) => r.ok).length} אישרו שהמצב הקודם אינו נגיש למקלדת.`);
