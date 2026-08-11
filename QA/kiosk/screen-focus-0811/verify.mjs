// Where focus lands after a screen redraw. 2026-08-11.
//
// STATUS.md item 7 names this as the one thing left open under the keyboard
// heading: "the console rebuilds `#content` with `innerHTML` on every route
// change, so where focus lands **after a redraw** is still unmeasured". The
// sidebar (`nav-keyboard-0811`) and the dialogs (`dialog-focus-0811`,
// `dialog-inert-0811`) are closed; the screens themselves were never pressed.
//
// The defect being graded: the control that asks for a route change is often
// *inside* `#content` — `➕ הוספת מכשיר` on the devices screen, `🚀 אשף התקנה`
// on the guide screen — and route() replaces the whole of `#content`. Removing
// the node that holds focus drops focus to `<body>`, so after a screen change
// nothing is focused: nothing is announced, and there is no position to press
// Shift+Tab back from.
//
// **The first version of this file claimed more than that and was wrong**, and
// the control row is what caught it: it asserted that the next Tab restarts at
// the top of the document. It does not, in Chromium — removing the focused node
// leaves the *sequential focus navigation starting point* where that node was,
// so a forward Tab happens to continue into the new screen anyway. The row is
// now a measurement rather than an assertion, and the cost being fixed is the
// one that was really there: `activeElement` is `<body>`.
//
// What is measured here:
//
//   1. **the boot render does not move focus** — route() at login is not a
//      screen change and nothing holds focus yet.
//   2. **every screen reachable from the sidebar**, activated by `Enter` on a
//      nav button, lands focus on that screen's own `<h1>`, carrying
//      `tabindex="-1"`. Six screens × two colour schemes.
//   3. **the case the defect is actually about** — `➕ הוספת מכשיר`, a button
//      inside `#content` that routes and is then destroyed.
//   4. **Tab continuity**: one press from the heading has to land *inside*
//      `#content`, i.e. the heading is a position the order continues from and
//      not a dead end.
//   5. **an in-screen redraw must NOT steal focus.** `renderDevices()` replaces
//      the children of a box inside `#content`; pulling focus up to the heading
//      on every list refresh would fight the person using the screen. This is
//      the row that `subtree: true` would fail.
//   6. **the ring** — `:focus-visible` and not `:focus`: a heading is not a
//      control, so a mouse user gets no ring and a keyboard user does.
//
// **The control is the previous behaviour, produced in the same live page**:
// `route(view)` called without the `fromUser` flag is byte-for-byte the code
// path that shipped before this change.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: the real
// `server/public/`, canned API only.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8836;
const BASE = `http://127.0.0.1:${PORT}`;

// The six screens a non-admin reaches from the sidebar, and the <h1> each one
// mounts. `admin` is left out: `viewAdmin` returns straight back to devices for
// this user, so it is a redirect and not a screen.
const SCREENS = [
  ['links', 'ספריית קישורים'],
  ['clients', 'מזהי לקוח'],
  ['enroll', 'הוספת מכשיר'],
  ['guide', 'הוראות הפעלה'],
  ['settings', 'הגדרות'],
  ['devices', 'המכשירים שלי'],
];

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.mode}: ${r.group} — ${r.what} (${r.value})`); };

// ── contrast, for the ring ──────────────────────────────────────
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Press Tab **until** the target is focused, never a fixed count: the tab order
// is a ring, and an index into a recorded list is not a number of presses —
// both lessons are `nav-keyboard-0811`'s, paid for there.
async function tabTo(page, sel, max = 60) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), sel)) return i;
  }
  return 0;
}

// Where focus is, described well enough to read in a failing row.
const where = (page) => page.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return { tag: 'body', inContent: false, text: '', tabindex: null };
  return {
    tag: a.tagName.toLowerCase(),
    inContent: !!a.closest('#content'),
    text: (a.textContent || '').trim().slice(0, 30),
    tabindex: a.getAttribute('tabindex'),
    isH1: a.tagName === 'H1',
  };
});

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

let shot = 0;
const shotName = () => `${HERE}0${++shot}`;

const open = async (ctx) => {
  const page = await ctx.newPage();
  await page.goto(BASE + '/console');
  await page.waitForSelector('.device');
  await page.evaluate(() => document.fonts.ready);
  return page;
};

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1000 } });
    await ctx.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));

    // ── 1. the boot render ────────────────────────────────────────
    let page = await open(ctx);
    let w = await where(page);
    add({
      mode, group: 'טעינה', what: 'הציור הראשון אינו לוקח פוקוס', kind: 'בסיס',
      value: w.tag, ok: w.tag === 'body',
      note: 'אין עדיין פוקוס לאף אחד, וגרירתו לכותרת הייתה מדלגת על הסרגל',
    });

    // ── 2. every screen, activated from the keyboard ──────────────
    for (const [view, title] of SCREENS) {
      const presses = await tabTo(page, `#menu button[data-view="${view}"]`);
      if (!presses) { add({ mode, group: `מסך ${title}`, what: 'הגעה לכפתור הניווט', kind: 'תיקון', value: 'לא נמצא', ok: false }); continue; }
      await page.keyboard.press('Enter');
      await page.waitForFunction((t) => { const h = document.querySelector('#content h1'); return h && h.textContent.trim() === t; }, title);
      w = await where(page);
      add({
        mode, group: `מסך ${title}`, what: 'הפוקוס עבר לכותרת המסך', kind: 'תיקון',
        value: `${w.tag}${w.isH1 ? ` «${w.text}»` : ''} · tabindex=${w.tabindex}`,
        ok: w.isH1 && w.text === title && w.tabindex === '-1',
      });
    }

    // ── 3. the case the defect is about: a router inside #content ──
    // Back to devices, then `➕ הוספת מכשיר` — a button that routes and is
    // destroyed by the screen it opens.
    await tabTo(page, '#menu button[data-view="devices"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#add');
    const addPresses = await tabTo(page, '#add');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const h = document.querySelector('#content h1'); return h && h.textContent.trim() === 'הוספת מכשיר'; });
    w = await where(page);
    const gone = await page.evaluate(() => !document.querySelector('#add'));
    add({
      mode, group: 'כפתור מתוך המסך', what: '‎➕ הוספת מכשיר‎ נהרס עם המסך', kind: 'בסיס',
      value: gone ? 'נהרס' : 'עדיין קיים', ok: gone,
      note: `הגעה ב-${addPresses} הקשות; אחרת אין כאן דבר למדוד`,
    });
    add({
      mode, group: 'כפתור מתוך המסך', what: 'הפוקוס עבר לכותרת ולא ל-‎body‎', kind: 'תיקון',
      value: `${w.tag}${w.isH1 ? ` «${w.text}»` : ''}`, ok: w.isH1 && w.text === 'הוספת מכשיר',
    });

    // ── 4. Tab continuity from the heading ────────────────────────
    await page.keyboard.press('Tab');
    const afterH1 = await where(page);
    add({
      mode, group: 'המשך המסלול', what: 'הקשה אחת מהכותרת נוחתת בתוך ‎#content‎', kind: 'תיקון',
      value: `${afterH1.tag} «${afterH1.text}» · ${afterH1.inContent ? 'בתוך' : 'מחוץ'}`,
      ok: afterH1.inContent,
    });

    // ── the ring, keyboard ────────────────────────────────────────
    // Re-focus the heading the same way (Tab is what makes :focus-visible match).
    await page.evaluate(() => { const h = document.querySelector('#content h1'); h.blur(); });
    await tabTo(page, '#menu button[data-view="links"]');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const h = document.querySelector('#content h1'); return h && h.textContent.trim() === 'ספריית קישורים'; });
    const ring = await page.evaluate(() => {
      const h = document.querySelector('#content h1');
      const cs = getComputedStyle(h);
      // the surface actually painted behind the heading, not the token
      let n = h, bg = 'rgba(0, 0, 0, 0)';
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; }
        n = n.parentElement;
      }
      if (bg === 'rgba(0, 0, 0, 0)') bg = getComputedStyle(document.body).backgroundColor;
      return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor, offset: cs.outlineOffset, bg };
    });
    const ringOk = ring.style !== 'none' && parseFloat(ring.width) >= 2;
    add({
      mode, group: 'טבעת המיקוד', what: 'טבעת אחרי הגעה במקלדת', kind: 'תיקון',
      value: `${ring.style} ${ring.width} ${ring.color} · offset ${ring.offset}`, ok: ringOk,
    });
    const cr = ratio(ring.color, ring.bg);
    add({
      mode, group: 'טבעת המיקוד', what: 'ניגודיות הטבעת מול המשטח שמאחוריה (1.4.11 ⇐ 3:1)', kind: 'תיקון',
      value: `${cr.toFixed(2)}:1 מול ${ring.bg}`, ok: cr >= 3,
    });
    await page.screenshot({ path: `${shotName()}-heading-focus-${mode}.png`, clip: { x: 0, y: 0, width: 1280, height: 320 } });

    // ── the ring, mouse ───────────────────────────────────────────
    // The heading still takes focus (that is what the fix does), but a person
    // who clicked does not need a ring drawn on a heading.
    await page.click('#menu button[data-view="clients"]');
    await page.waitForFunction(() => { const h = document.querySelector('#content h1'); return h && h.textContent.trim() === 'מזהי לקוח'; });
    const mouse = await page.evaluate(() => {
      const h = document.querySelector('#content h1');
      const cs = getComputedStyle(h);
      return { focused: document.activeElement === h, style: cs.outlineStyle, width: cs.outlineWidth };
    });
    add({
      mode, group: 'טבעת המיקוד', what: 'אין טבעת אחרי לחיצת עכבר', kind: 'תיקון',
      value: `פוקוס=${mouse.focused} · ${mouse.style} ${mouse.width}`,
      ok: mouse.focused && (mouse.style === 'none' || parseFloat(mouse.width) === 0),
    });

    // ── 5. an in-screen redraw must not steal focus ───────────────
    // The observer is armed by hand, then a *subtree* mutation is made. This is
    // the row `subtree: true` fails.
    await page.click('#menu button[data-view="devices"]');
    await page.waitForSelector('#refresh');
    const refreshPresses = await tabTo(page, '#refresh');
    await page.evaluate(() => { focusNewScreen(); renderDevices(); });
    await new Promise((r) => setTimeout(r, 120));
    w = await where(page);
    add({
      mode, group: 'ציור מחדש בתוך המסך', what: 'רענון הרשימה אינו גורר את הפוקוס לכותרת', kind: 'תיקון',
      value: `${w.tag} «${w.text}»`, ok: !w.isH1 && w.text.includes('רענון'),
      note: `הגעה ל-‎רענון‎ ב-${refreshPresses} הקשות`,
    });
    await page.close();

    // ── the control: the previous behaviour, in the same live page ─
    // `route(view)` without the flag is the code that shipped before.
    page = await open(ctx);
    await tabTo(page, '#add');
    await page.evaluate(() => route('enroll'));
    await page.waitForFunction(() => { const h = document.querySelector('#content h1'); return h && h.textContent.trim() === 'הוספת מכשיר'; });
    w = await where(page);
    add({
      mode, group: 'בקרה — ההתנהגות הקודמת', what: 'הפוקוס נופל ל-‎body‎', kind: 'לפני',
      value: w.tag, ok: w.tag === 'body',
      note: 'שורה זו חייבת לעבור, אחרת אין באג ואין מה לתקן',
    });
    await page.keyboard.press('Tab');
    const ctrlTab = await where(page);
    add({
      mode, group: 'בקרה — ההתנהגות הקודמת', what: 'לאן נוחתת ההקשה הבאה', kind: 'ממצא',
      value: `${ctrlTab.tag} «${ctrlTab.text}» · ${ctrlTab.inContent ? 'בתוך #content' : 'מחוץ ל-#content'}`,
      ok: true,
      note: 'נמדד ולא נטען: כרום שומר את נקודת ההתחלה במקום הצומת שנמחק',
    });
    await page.close();
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | קבוצה | מה נבדק | סוג | הנמדד | הערה | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.group} | ${r.what} | ${r.kind} | ${r.value} | ${r.note || ''} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => r.kind === 'לפני');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות בקרה: ${ctrl.filter((r) => r.ok).length} אישרו שההתנהגות הקודמת אכן הפילה את הפוקוס ל-body.`);
