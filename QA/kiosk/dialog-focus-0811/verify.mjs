// The kiosk console's dialogs, by keyboard. 2026-08-11.
//
// STATUS.md item 7 leaves two things open under the keyboard heading, and this
// is the second of them: "the sequence after a redraw, and **whether focus is
// trapped in an open dialog**, are both still unmeasured".
//
// The console does not use `<dialog>`. `modal()` appends a `.modal-bg` into
// `#modal-root`, a sibling of `#app-view`, so the platform does nothing for it:
// no top layer, no inertness behind it, no focus move on open, no Escape. What
// that means for someone who is not using a mouse is that a confirmation can be
// on screen while their focus is still on the button underneath it — and in
// this console that button is `🗑️` or `♻️ אתחל`. The only close path was the
// backdrop click, which is a mouse.
//
// So what is graded here is the whole loop, per dialog:
//
//   1. **on open** — focus lands inside the dialog. And *where*: a confirmation
//      must land on the box and not on `כן, בצע`, because that one is a delete
//      or a reboot one Space away from somebody who was only tabbing. A dialog
//      that exists to take a value is the opposite case and gets the field.
//   2. **the trap** — Tab, many times, and every stop stays inside `.modal`.
//      Pressed enough times to lap the dialog several times over: a trap that
//      holds for one cycle and leaks on the second is the same defect.
//   3. **Shift+Tab off the first control** wraps to the last rather than
//      stepping out the top. Backwards is the direction a hand-rolled trap
//      usually misses.
//   4. **Escape closes**, which is the keyboard's equivalent of the backdrop
//      click that was the only way out.
//   5. **focus comes back to the opener.** Not decoration: `#content` is a long
//      column of device cards, and focus dropped to `<body>` puts the person
//      back at the top of the page, tabbing through the sidebar to find where
//      they were.
//   6. the accessible name — `role=dialog`, `aria-modal=true`, and
//      `aria-labelledby` resolving to the dialog's own `<h3>`.
//
// **The control is the previous behaviour, rebuilt in the same live page**: the
// same markup appended to `#modal-root` by hand, without `modal()`. It is
// required to fail (1), (2) and (4) — focus stays on the opener, Tab walks the
// page behind, Escape does nothing. A trap that passes proves nothing unless
// the shape it replaced is measured failing here, in this browser.
//
// Focus is taken **by Tab and never by `el.focus()`**: a scripted focus does
// not exercise the keydown handler that is the whole subject.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: the real
// `server/public/`, canned API only.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8829;
const BASE = `http://127.0.0.1:${PORT}`;
const LAPS = 24;   // presses in the trap sweep — several laps of the largest dialog here

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };

// The three dialogs, chosen for the three shapes `modal()` has to tell apart.
// `♻️ אתחל` is a confirmation whose first control is destructive; `✏️ עריכה`
// opens to take values; `🔑 קוד גישה` has no text field but does have controls,
// and it is the one that re-renders itself in place.
const DIALOGS = [
  { btn: '♻️ אתחל', title: 'לאתחל את המכשיר?', want: 'box', why: 'הפקד הראשון הוא «כן, בצע»' },
  { btn: '✏️ עריכה', title: 'עריכת מכשיר', want: 'field', why: 'הדיאלוג נפתח כדי לקבל ערך' },
  { btn: '🔑 קוד גישה', title: 'קוד גישה למכשיר', want: 'box', why: 'אין שדה טקסט — ההנפקה מחדש היא פעולה' },
];

// A description of the focused element that survives the console redrawing
// `#content`, and says which side of the dialog boundary it is on.
const WHERE = `(el) => {
  if (!el || el === document.body || el === document.documentElement) return { in: false, key: 'body' };
  const box = document.querySelector('#modal-root .modal');
  const key = (el.id ? '#' + el.id : el.tagName.toLowerCase())
    + (el.className ? '.' + String(el.className).split(/\\s+/)[0] : '')
    + (el.textContent && el.textContent.length < 22 ? ' «' + el.textContent.trim() + '»' : '');
  return { in: !!box && (el === box || box.contains(el)), key, isBox: el === box };
}`;
const where = (page) => page.evaluate(`(${WHERE})(document.activeElement)`);

// The opener's key is read off the element **through the same `WHERE`** rather
// than written out here. A hand-written string is a second description of the
// same thing, and the two drifted the first time this ran: `where()` names a
// button by its class, so every "focus came home" row failed while reporting
// the correct button in its own value column — a red harness over a green fix,
// which is the failure mode that gets a working change reverted.
const keyOf = (page, label) => page.evaluate(([w, l]) => {
  const b = [...document.querySelector('.device').querySelectorAll('button')].find((x) => x.textContent.includes(l));
  return eval(w)(b);
}, [WHERE, label]);

// Open by **clicking** the card button, which is what leaves the opener as the
// sequential focus starting point — the state `bg.remove()` has to restore.
const open = async (page, label) => {
  await page.locator('.device').first().locator('button', { hasText: label }).first().click();
  await page.waitForSelector('#modal-root .modal');
  await page.waitForTimeout(120);
};

const inDialog = (page) => page.evaluate(() => {
  const box = document.querySelector('#modal-root .modal');
  if (!box) return null;
  const sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return [...box.querySelectorAll(sel)].filter((e) => e.offsetParent !== null).length;
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

    for (const d of DIALOGS) {
      const g = d.btn;
      const opener = await keyOf(page, d.btn);

      // ── 1. on open ────────────────────────────────────────────────
      await open(page, d.btn);
      const landed = await where(page);
      const count = await inDialog(page);
      const okLand = landed.in && (d.want === 'box' ? landed.isBox : !landed.isBox);
      rows.push({
        mode, group: g, what: 'המיקוד בפתיחה', kind: 'אחרי',
        value: landed.key, note: `${d.want === 'box' ? 'התיבה עצמה' : 'השדה הראשון'} — ${d.why} · ${count} פקדים`,
        ok: okLand,
      });
      if (!okLand) fail(`${g} (${mode}): המיקוד בפתיחה נחת על ${landed.key}, ציפינו ל-${d.want}`);

      // ── 6. the accessible name ────────────────────────────────────
      const aria = await page.evaluate(() => {
        const box = document.querySelector('#modal-root .modal');
        const id = box.getAttribute('aria-labelledby');
        const t = id && document.getElementById(id);
        return { role: box.getAttribute('role'), modal: box.getAttribute('aria-modal'), name: t ? t.textContent.trim() : null, tag: t ? t.tagName : null };
      });
      const okAria = aria.role === 'dialog' && aria.modal === 'true' && aria.tag === 'H3' && aria.name === d.title;
      rows.push({
        mode, group: g, what: 'שם נגיש', kind: 'אחרי',
        value: `role=${aria.role} · aria-modal=${aria.modal} · «${aria.name}»`, ok: okAria,
      });
      if (!okAria) fail(`${g} (${mode}): שם נגיש — role=${aria.role}, aria-modal=${aria.modal}, name=${aria.name}`);

      // ── 2. the trap, forwards ─────────────────────────────────────
      const out = [];
      for (let i = 0; i < LAPS; i++) {
        await page.keyboard.press('Tab');
        const w = await where(page);
        if (!w.in) out.push(`#${i + 1} ${w.key}`);
      }
      rows.push({
        mode, group: g, what: `Tab ×${LAPS} — כל עצירה בתוך הדיאלוג`, kind: 'אחרי',
        value: out.length ? `יצא ב-${out.length} עצירות: ${out.slice(0, 3).join(', ')}` : `${LAPS}/${LAPS} בפנים`,
        ok: out.length === 0,
      });
      if (out.length) fail(`${g} (${mode}): המיקוד יצא מהדיאלוג — ${out.slice(0, 3).join(', ')}`);

      // ── 3. Shift+Tab off the first control ────────────────────────
      // Reached by Tab from the box rather than by `focus()`, so the wrap is
      // measured on the handler a real key press runs.
      await page.evaluate(() => document.querySelector('#modal-root .modal').focus());
      await page.keyboard.press('Tab');
      const first = await where(page);
      await page.keyboard.press('Shift+Tab');
      const back = await where(page);
      const okWrap = back.in && back.key !== first.key;
      rows.push({
        mode, group: g, what: 'Shift+Tab מהפקד הראשון גולש לאחרון', kind: 'אחרי',
        value: `${first.key} → ${back.key}`, ok: okWrap || count === 1,
        note: count === 1 ? 'פקד יחיד — גלישה אליו עצמו' : '',
      });
      if (!back.in) fail(`${g} (${mode}): Shift+Tab יצא מהדיאלוג אל ${back.key}`);

      if (d.btn === '✏️ עריכה') {
        await page.screenshot({ path: `${name()}-edit-focus-${mode}.png`, clip: await page.evaluate(() => {
          const r = document.querySelector('#modal-root .modal').getBoundingClientRect();
          return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16 };
        }) });
      }

      // ── 4 + 5. Escape closes, focus goes home ─────────────────────
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const closed = await page.evaluate(() => !document.querySelector('#modal-root .modal'));
      const home = await where(page);
      rows.push({ mode, group: g, what: 'Escape סוגר', kind: 'אחרי', value: closed ? 'נסגר' : 'עדיין פתוח', ok: closed });
      if (!closed) fail(`${g} (${mode}): Escape לא סגר את הדיאלוג`);
      const okHome = home.key === opener.key;
      rows.push({
        mode, group: g, what: 'המיקוד חוזר לכפתור שפתח', kind: 'אחרי',
        value: home.key, ok: okHome,
      });
      if (!okHome) fail(`${g} (${mode}): אחרי הסגירה המיקוד על ${home.key} ולא על הכפתור שפתח`);
    }

    // ── the control: a `.modal-bg` without `modal()` ────────────────
    // The same markup, appended by hand. This is what the console had before —
    // a sibling div, no focus move, no keydown handler — and it has to fail
    // (1), (2) and (4) here or the rows above are not measuring anything.
    await page.locator('.device').first().locator('button', { hasText: '♻️ אתחל' }).first().focus();
    const ctrlOpener = await where(page);
    await page.evaluate(() => {
      const bg = document.createElement('div');
      bg.className = 'modal-bg';
      bg.innerHTML = '<div class="modal"><h3>לאתחל את המכשיר?</h3>'
        + '<div class="row"><button class="btn btn-danger" id="qa-y">כן, בצע</button>'
        + '<button class="btn btn-light" id="qa-n">ביטול</button></div></div>';
      document.querySelector('#modal-root').appendChild(bg);
    });
    await page.waitForTimeout(120);
    const ctrlLand = await where(page);
    rows.push({
      mode, group: 'בקרה — ‎.modal-bg‎ בלי ‎modal()‎', what: 'המיקוד בפתיחה', kind: 'לפני',
      value: ctrlLand.key, note: 'נשאר על הכפתור שמתחת לדיאלוג', ok: !ctrlLand.in && ctrlLand.key === ctrlOpener.key,
    });
    if (ctrlLand.in) fail(`בקרה (${mode}): המיקוד נכנס לדיאלוג שנבנה ביד — הבדיקה אינה מסוגלת ליפול`);

    const ctrlOut = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const w = await where(page);
      if (!w.in) ctrlOut.push(w.key);
    }
    rows.push({
      mode, group: 'בקרה — ‎.modal-bg‎ בלי ‎modal()‎', what: 'Tab ×6 הולך לדף שמאחור', kind: 'לפני',
      value: ctrlOut.length ? `${ctrlOut.length} עצירות מחוץ לדיאלוג: ${ctrlOut.slice(0, 2).join(', ')}` : 'הכל נשאר בפנים',
      ok: ctrlOut.length > 0,
    });
    if (!ctrlOut.length) fail(`בקרה (${mode}): גם בלי modal() המיקוד נלכד — הבדיקה אינה מסוגלת ליפול`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    const ctrlStill = await page.evaluate(() => !!document.querySelector('#modal-root .modal-bg .modal'));
    rows.push({
      mode, group: 'בקרה — ‎.modal-bg‎ בלי ‎modal()‎', what: 'Escape אינו סוגר', kind: 'לפני',
      value: ctrlStill ? 'נשאר פתוח' : 'נסגר', ok: ctrlStill,
    });
    if (!ctrlStill) fail(`בקרה (${mode}): Escape סגר דיאלוג שנבנה ביד`);
    await page.screenshot({ path: `${name()}-control-${mode}.png`, clip: { x: 0, y: 0, width: 1280, height: 700 } });
    await page.evaluate(() => document.querySelector('#modal-root').replaceChildren());

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | דיאלוג | מה נבדק | סוג | הנמדד | הערה | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.group} | ${r.what} | ${r.kind} | ${r.value} | ${r.note || ''} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => r.kind === 'לפני');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות בקרה: ${ctrl.filter((r) => r.ok).length} אישרו שהמצב הקודם אינו נגיש למקלדת.`);
