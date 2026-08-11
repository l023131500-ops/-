// WCAG 1.4.1 — the one thing `screens-enrol-settings-0811` wrote down as open
// rather than closed: the console's in-text links were distinguished from the
// text around them by **colour alone**, and no contrast ratio can answer that.
// 2026-08-11.
//
// This run measures a different property from every screen-by-screen run before
// it. There is no ratio here: what is graded is `text-decoration-line` on the
// links that sit inside running text, and the *absence* of it on the anchors
// that are navigation or buttons. Both halves matter — an underline on every
// `<a>` in the console would put one under all seven sidebar items and under
// every `.btn`, which is a worse screen than the one this fixes.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, unchanged: it serves the real
// `server/public/` and cans only the API, and it already answers the two routes
// (`GET`/`POST /api/enrollments`) that paint `.alert-ok` — the surface the
// install link sits on, and the one link here a person is meant to copy and send
// on to whoever is holding the tablet.
//
// Both colour schemes are driven even though the property does not invert: the
// decoration's *colour* follows `color`, which does, and `index.html` is graded
// in the same pass because the rule is global and that page is the one place a
// `.btn` sits inside a `<p>`.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8817;
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };

// `text-decoration-line` and not the `text-decoration` shorthand: the shorthand
// serialises the colour and the thickness with it, so a value that differs only
// in ink reads as a different decoration. What 1.4.1 asks is whether a line is
// drawn at all.
const DECO = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const s = getComputedStyle(e);
  return {
    line: s.textDecorationLine,
    color: s.textDecorationColor,
    ink: s.color,
    offset: s.textUnderlineOffset,
    thickness: s.textDecorationThickness,
    text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
  };
};

// The injected control. `.15s` transitions live on `.btn` in this stylesheet, and
// `button-boundary-0811` was bitten by reading a computed value inside the
// injection's own tick — so this waits a frame plus 60ms the same way that run's
// harness ended up doing.
const INJECTED = ([sel, css]) => new Promise((done) => {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  requestAnimationFrame(() => setTimeout(() => {
    const line = getComputedStyle(document.querySelector(sel)).textDecorationLine;
    s.remove();
    done(line);
  }, 60));
});

const grade = async (page, mode, screen, sel, want, what, note = '') => {
  const d = await page.evaluate(DECO, sel);
  if (!d) { fail(`${screen}: ${sel} לא נמצא`); return null; }
  const has = d.line.split(' ').includes('underline');
  const ok = want === 'underline' ? has : !has;
  rows.push({
    mode, screen, what: `${what} — "${d.text}"`, want, got: d.line,
    ink: d.ink, deco: d.color, offset: d.offset, ok, note,
  });
  if (!ok) process.exitCode = 1;
  return d;
};

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
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    // ── the three in-text links, which are all of them ────────────
    // 1. the guide link. A `<p>` on a `--card`, and the only sentence on that
    //    screen that goes anywhere.
    await page.locator('.side nav [data-view=guide]').click();
    await page.waitForSelector('#gd-list .device-row, #gd-list p');
    await grade(page, mode, 'הוראות הפעלה', '#content .card p > a', 'underline',
      'הקישור למדריך המשתמש', 'טקסט רץ');
    await page.locator('#content').screenshot({ path: `${name()}-guide-${mode}.png` });

    // The paragraph the link sits inside, for the record: same size, and its own
    // colour. Before this change the link differed from it in colour and in
    // nothing else, which is the defect stated as two rows.
    const near = await page.evaluate((s) => {
      const e = document.querySelector(s);
      const st = getComputedStyle(e);
      return { color: st.color, size: st.fontSize, weight: st.fontWeight };
    }, '#content .card p');
    console.log(`[${mode}] הוראות הפעלה · הטקסט סביב הקישור: ${near.color} ${near.size}/${near.weight}`);

    // 2. the install link, inside `.alert-ok`. It only exists after a POST.
    await page.locator('.side nav [data-view=enroll]').click();
    await page.waitForSelector('#e-create');
    await page.fill('#e-url', 'https://hadar.example.com/event/12');
    await page.locator('#e-create').click();
    await page.waitForSelector('#e-result .alert-ok');
    await grade(page, mode, 'הוספת מכשיר', '#e-result a', 'underline',
      'קישור ההתקנה בתוך .alert-ok', 'טקסט רץ, ‎break-all‎');
    // The copy button beside it is a `.btn` in the same block — the one place in
    // the console where a button and an in-text link are adjacent, so it is the
    // row that proves the rule did not spill.
    await grade(page, mode, 'הוספת מכשיר', '#e-result .btn-light', 'none',
      'כפתור "העתקת הקישור" לידו', 'כפתור');
    await page.locator('#e-result').screenshot({ path: `${name()}-install-link-${mode}.png` });

    // 3. `← חזרה לאתר`, on the login card, which is mounted and hidden while
    //    signed in — unhidden to be measured the way the previous run did it.
    await page.evaluate(() => document.querySelector('#login-view').classList.remove('hidden'));
    await grade(page, mode, 'מסך הכניסה', '#login-view .auth-card p.hint > a', 'underline',
      'הקישור "חזרה לאתר"', 'טקסט רץ');
    await page.locator('#login-view .auth-card').screenshot({ path: `${name()}-login-${mode}.png` });
    await page.evaluate(() => document.querySelector('#login-view').classList.add('hidden'));

    // ── the half that must stay unlined ───────────────────────────
    await grade(page, mode, 'סרגל הצד', '.side nav [data-view=devices]', 'none',
      'פריט ניווט נבחר', 'ניווט');
    await grade(page, mode, 'סרגל הצד', '#logout-btn', 'none', 'כפתור התנתקות', 'כפתור');

    // ── the control ───────────────────────────────────────────────
    // Without it the table above is a list of the values this run wanted. The
    // injected row is the declaration that was replaced (`a { text-decoration:
    // none }` reaching an in-text link), measured here rather than quoted.
    await page.locator('.side nav [data-view=guide]').click();
    await page.waitForSelector('#gd-list .device-row, #gd-list p');
    const was = await page.evaluate(INJECTED, ['#content .card p > a',
      '#content .card p > a { text-decoration: none !important; }']);
    rows.push({
      mode, screen: 'הוראות הפעלה', what: 'הקישור למדריך — **לפני** (‎a{text-decoration:none}‎)',
      want: 'underline', got: was, ink: '—', deco: '—', offset: '—',
      ok: was.split(' ').includes('underline'), note: 'בקרת שפיות, אמורה ליפול',
    });

    // ── the marketing page, in the same pass ──────────────────────
    // The rule is global and this page is the one place a `.btn` sits inside a
    // `<p>`-like block and a real in-text link exists in a footer.
    await page.goto(BASE + '/');
    await page.waitForSelector('.nav-links');
    await grade(page, mode, 'דף השיווק', '.skip', 'none', 'קישור הדילוג לתוכן', 'ניווט');
    await grade(page, mode, 'דף השיווק', '.nav-links a[href="#what"]', 'none',
      'פריט בסרגל הניווט', 'ניווט');
    await grade(page, mode, 'דף השיווק', '.nav-links a.btn', 'none', '"כניסת לקוחות"', 'כפתור');
    await grade(page, mode, 'דף השיווק', '.plan a.btn', 'none',
      'כפתור בכרטיס מחיר (אחרי ‎<ul><li>‎)', 'כפתור');
    await grade(page, mode, 'דף השיווק', 'footer p a', 'underline',
      'הקישור ל-more30.com בפוטר', 'טקסט רץ');
    await page.locator('footer').screenshot({ path: `${name()}-footer-${mode}.png` });

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מסך | מה נמדד | נדרש | ‎text-decoration-line‎ | צבע הטקסט | צבע הקו | היסט | סוג | |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.screen} | ${r.what} | ${r.want} | \`${r.got}\` | \`${r.ink}\` | \`${r.deco}\` | ${r.offset} | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => /בקרת שפיות/.test(r.note));
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות בקרה (אמורות ליפול): ${ctrl.filter((r) => !r.ok).length} נפלו.`);
if (ctrl.some((r) => r.ok)) fail('שורת הבקרה עברה — הבדיקה אינה מסוגלת ליפול.');
