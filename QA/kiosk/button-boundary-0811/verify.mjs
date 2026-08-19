// QA for the button-boundary step (WCAG 1.4.11), 2026-08-11.
//
// The previous step (QA/kiosk/nontext-contrast-0811) fixed the *field* border
// and `.btn-danger`'s text, and recorded what it deliberately left: the buttons
// themselves are light fills on a light card, so the control's own boundary is
// invisible. This measures the ring that closes that.
//
// Everything is read out of `getComputedStyle` in a real Chromium against the
// real `server/public/` (`stub-server.mjs` cans only the API), at both
// `colorScheme` values driven through `emulateMedia` — the OS preference, which
// is how a person arrives at the dark console.
//
// The background a ring is measured against is the one **actually painted
// behind the button**, found by walking up the DOM until a non-transparent
// background — not the card colour assumed from the stylesheet. Buttons here
// sit on `.modal`, on `.device`, on `.card` and on the page itself, and a value
// quoted from the token would be right for some of them and wrong for the rest.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8796;
const BASE = `http://127.0.0.1:${PORT}`;

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const f = (n) => n.toFixed(2) + ':1';

const rows = [];
const check = (mode, what, fg, bg, min, expect = true) => {
  const r = ratio(fg, bg);
  const ok = r >= min;
  rows.push({ mode, what, fg, bg, ratio: f(r), min: min + ':1', ok });
  if (ok !== expect) process.exitCode = 1;
  return r;
};
// The state before this change: the fill *was* the only boundary the button
// had. It is expected to fail in light mode and to **pass** in dark — a light
// fill on a dark card is its own boundary, so the defect was light-mode only.
// Asserting that per-mode rather than "before always fails" is what keeps this
// from overstating what the change fixes.
const before = (mode, what, fg, bg, min) => check(mode, what, fg, bg, min, mode === 'dark');

// Reads a button the way the eye sees it: the ring colour out of the computed
// box-shadow, the fill, and the first opaque background painted behind it.
const READ = (el) => {
  const s = getComputedStyle(el);
  let n = el.parentElement, behind = 'rgb(255, 255, 255)';
  while (n) {
    const b = getComputedStyle(n).backgroundColor;
    if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) { behind = b; break; }
    n = n.parentElement;
  }
  const m = s.boxShadow.match(/rgba?\([^)]+\)/);
  return { ring: m ? m[0] : null, fill: s.backgroundColor, ink: s.color, behind, text: el.textContent.trim().slice(0, 14) };
};

const server = spawn(process.execPath, [HERE + 'stub-server.mjs', String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 950 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device', { timeout: 8000 });

    // --- on the devices screen: .btn-light on the toolbar card, .btn-danger on
    //     a device card. Two different surfaces behind the same two classes.
    const refresh = await page.locator('#refresh').evaluate(READ);
    check(mode, `.btn-light ("${refresh.text}") — טבעת מול המשטח מאחוריה`, refresh.ring, refresh.behind, 3);
    check(mode, `.btn-light ("${refresh.text}") — טבעת מול מילוי הכפתור`, refresh.ring, refresh.fill, 3);
    before(mode, '.btn-light — לפני: המילוי מול המשטח (הגבול היחיד שהיה)', refresh.fill, refresh.behind, 3);

    const trash = await page.locator('.device').first().getByRole('button', { name: '🗑️' }).evaluate(READ);
    check(mode, '.btn-danger (🗑️) — טבעת מול כרטיס המכשיר', trash.ring, trash.behind, 3);
    check(mode, '.btn-danger (🗑️) — טבעת מול מילוי הכפתור', trash.ring, trash.fill, 3);
    before(mode, '.btn-danger — לפני: המילוי מול הכרטיס', trash.fill, trash.behind, 3);

    await page.locator('.device').first().screenshot({ path: `${HERE}0${mode === 'light' ? 1 : 2}-device-card-${mode}.png` });

    // .btn-primary was not changed. It is measured so that "only the two light
    // fills failed" is a measurement and not an assumption. It has to be read
    // from the edit dialog: the devices screen has no primary button, and the
    // `✏️ עריכה` on the card — the obvious candidate — is a `.btn-light`.
    await page.locator('.device').first().getByRole('button', { name: /עריכה/ }).click();
    await page.waitForSelector('.modal .btn-primary');
    const prim = await page.locator('.modal .btn-primary').first().evaluate(READ);
    await page.locator('.modal .btn-light').last().click();
    await page.waitForTimeout(200);

    // --- inside a modal: the pair that carries real text, on `.modal`'s own
    //     background, which is `#fff` in light and `--card` in dark.
    await page.locator('.device').first().getByRole('button', { name: '🗑️' }).click();
    await page.waitForSelector('.modal .btn-danger');
    const yes = await page.locator('.modal .btn-danger').first().evaluate(READ);
    const no = await page.locator('.modal .btn-light').first().evaluate(READ);
    check(mode, `.btn-danger ("${yes.text}") — טבעת מול החלון`, yes.ring, yes.behind, 3);
    check(mode, `.btn-light ("${no.text}") — טבעת מול החלון`, no.ring, no.behind, 3);
    // the previous step's text contrast, re-measured: this one must not move it.
    check(mode, `.btn-danger — טקסט מול המילוי (רגרסיה)`, yes.ink, yes.fill, 4.5);
    check(mode, `.btn-light — טקסט מול המילוי (רגרסיה)`, no.ink, no.fill, 4.5);
    check(mode, `.btn-primary ("${prim.text}") — המילוי מול המשטח (לא שונה)`, prim.fill, prim.behind, 3);
    await page.screenshot({ path: `${HERE}0${mode === 'light' ? 3 : 4}-modal-${mode}.png` });

    // "before", in the same run and the same DOM: the ring removed. `.btn`
    // carries `transition: .15s`, i.e. *all* properties — box-shadow included —
    // so the read has to wait out the transition or it returns where the
    // transition started. The previous step was caught by exactly this.
    const gone = await page.locator('.modal .btn-light').first().evaluate(async (el) => {
      const style = document.createElement('style');
      style.textContent = '.btn-light, .btn-danger { box-shadow: none !important; }';
      document.head.appendChild(style);
      await new Promise((r) => setTimeout(r, 300));
      const s = getComputedStyle(el).boxShadow;
      style.remove();
      return s;
    });
    rows.push({
      mode, what: '.btn-light — לפני: ‎box-shadow‎ שהוזרק חזרה ל-‎none‎',
      fg: '`' + gone + '`', bg: '—', ratio: '—', min: '—', ok: gone === 'none',
    });
    if (gone !== 'none') process.exitCode = 1;

    await page.locator('.modal .btn-light').first().click();
    await page.waitForTimeout(200);

    // --- the landing page: .btn-ghost is an <a> on --navy with a real border.
    //     Not part of this change; measured so it is not left unknown.
    await page.goto(BASE + '/');
    await page.waitForSelector('.nav .btn-ghost');
    const ghost = await page.locator('.nav .btn-ghost').first().evaluate((el) => {
      const s = getComputedStyle(el);
      let n = el.parentElement, behind = 'rgb(255, 255, 255)';
      while (n) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) { behind = b; break; } n = n.parentElement; }
      // the border is semi-transparent white; composite it onto what is behind.
      const [r, g, b, a = 1] = s.borderTopColor.match(/\d+(\.\d+)?/g).map(Number);
      const [br, bg2, bb] = behind.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      const mix = [r, g, b].map((c, i) => Math.round(c * a + [br, bg2, bb][i] * (1 - a)));
      return { border: `rgb(${mix.join(', ')})`, behind, text: el.textContent.trim() };
    });
    check(mode, `.btn-ghost ("${ghost.text}") — מסגרת ממוזגת מול הסרגל`, ghost.border, ghost.behind, 3);
    await page.locator('.nav').screenshot({ path: `${HERE}0${mode === 'light' ? 5 : 6}-nav-${mode}.png` });

    console.log(`[${mode}] ring(light)=${refresh.ring} ring(danger)=${trash.ring} behind(card)=${trash.behind}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מה נמדד | קדמת | רקע | יחס | סף | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const fg = r.fg.startsWith('`') ? r.fg : '`' + r.fg + '`';
  console.log(`| ${r.mode} | ${r.what} | ${fg} | ${r.bg === '—' ? '—' : '`' + r.bg + '`'} | **${r.ratio}** | ${r.min} | ${r.ok ? '✅' : '❌'} |`);
}
const passing = rows.filter((r) => r.ok).length;
console.log(`\n${passing}/${rows.length} עוברים; שורות ה"לפני" אמורות ליפול (❌ בהן = הבדיקה מסוגלת ליפול).`);
console.log('exitCode=' + (process.exitCode || 0));
