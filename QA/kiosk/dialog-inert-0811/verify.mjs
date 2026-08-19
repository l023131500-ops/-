// The page behind an open dialog, and whether it is still there. 2026-08-11.
//
// `dialog-focus-0811` closed the Tab trap and left one thing written down under
// "found and not fixed": **the page behind an open dialog is not inert**. The
// trap covers Tab, which is what a keyboard user presses. It covers nothing
// else — a screen reader's virtual cursor walks the whole document without ever
// pressing Tab, and Ctrl+F → Enter reaches a button under the backdrop the same
// way. `aria-modal="true"` was set, and that is a promise to AT, not a fact
// about the DOM: the buttons behind `לאתחל את המכשיר?` were still in the
// accessibility tree and still took `focus()`.
//
// So what is graded here is the page behind, not the dialog:
//
//   1. `#app-view` and `#login-view` carry `inert` while a dialog is open —
//      and `#toast-root` does **not**, deliberately: it is the live region that
//      announces what the dialog's save did, and inert would silence it.
//   2. **the accessibility tree** — the device card's own buttons are gone from
//      it while the dialog is open, and back after it closes. Read through
//      `page.accessibility.snapshot()`, i.e. the browser's real tree, not a
//      selector query: what an ignored node looks like is the browser's call.
//   3. **`focus()` on a button behind is a no-op** — the scripted focus a find
//      -and-Enter ends in. Focus stays where the dialog put it.
//   4. **nesting** — a dialog opened on top of another one, then closed, must
//      leave the page inert, because the first dialog is still on screen. This
//      is the row that a boolean flag fails and a child count passes.
//   5. **the ordering on close** — inert comes off before focus goes home.
//      `focus()` inside an inert subtree is a no-op, so the wrong order here
//      does not throw, it just silently drops focus to `<body>`, which is the
//      defect `dialog-focus-0811` fixed. Measured as a pair.
//
// **The control is the previous behaviour, produced in the same live page**:
// the attribute is taken off by hand with the dialog still open, and (2) and
// (3) are required to flip back. A passing row proves nothing unless the state
// it replaced is measured failing here, in this browser.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: the real
// `server/public/`, canned API only.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8831;
const BASE = `http://127.0.0.1:${PORT}`;

// A button on the device card behind the dialog. Not the one that opens the
// dialog — that one is the opener and focus is meant to come back to it — and
// not a destructive one either: `🌙 כבה מסך` is a button whose whole point here
// is that it must be unreachable.
const BEHIND = '🌙 כבה מסך';
const OPENER = '♻️ אתחל';

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };

// The browser's own accessibility tree, flattened to the names in it. An inert
// subtree is ignored wholesale, so a name that is present with the dialog open
// is a node a screen reader can still land on.
const names = async (page) => {
  const out = [];
  const walk = (n) => { if (!n) return; if (n.name) out.push(n.name); (n.children || []).forEach(walk); };
  walk(await page.accessibility.snapshot({ interestingOnly: true }));
  return out;
};
const hasName = (list, needle) => list.some((n) => n.includes(needle));

// The scripted focus a `find`-and-Enter ends in. Returns whether it took.
const focusBehind = (page) => page.evaluate((label) => {
  const b = [...document.querySelectorAll('.device button')].find((x) => x.textContent.includes(label));
  if (!b) return { found: false };
  b.focus();
  const a = document.activeElement;
  return {
    found: true,
    took: a === b,
    landed: a === document.body ? 'body' : (a.className ? a.tagName.toLowerCase() + '.' + String(a.className).split(/\s+/)[0] : a.tagName.toLowerCase()),
  };
}, BEHIND);

const attrs = (page) => page.evaluate(() => ({
  app: document.querySelector('#app-view').hasAttribute('inert'),
  login: document.querySelector('#login-view').hasAttribute('inert'),
  toast: document.querySelector('#toast-root').hasAttribute('inert'),
  open: document.querySelector('#modal-root').children.length,
}));

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

    // ── closed: the baseline ──────────────────────────────────────────
    const before = await attrs(page);
    const namesClosed = await names(page);
    rows.push({
      mode, group: 'אין דיאלוג', what: 'אין ‎inert‎ על הדף', kind: 'בסיס',
      value: `app=${before.app} · login=${before.login}`, ok: !before.app && !before.login,
    });
    if (before.app || before.login) fail(`${mode}: inert קיים כשאין דיאלוג פתוח`);
    rows.push({
      mode, group: 'אין דיאלוג', what: `«${BEHIND}» בעץ הנגישות`, kind: 'בסיס',
      value: hasName(namesClosed, BEHIND) ? 'קיים' : 'חסר', ok: hasName(namesClosed, BEHIND),
      note: 'אחרת הבדיקה שלמטה אינה מסוגלת ליפול',
    });
    if (!hasName(namesClosed, BEHIND)) fail(`${mode}: «${BEHIND}» לא בעץ הנגישות גם בלי דיאלוג — אין מה למדוד`);

    // ── open ──────────────────────────────────────────────────────────
    // By clicking, which is what leaves the opener as the focus starting point.
    await page.locator('.device').first().locator('button', { hasText: OPENER }).first().click();
    await page.waitForSelector('#modal-root .modal');
    await page.waitForTimeout(150);

    const during = await attrs(page);
    rows.push({
      mode, group: 'דיאלוג פתוח', what: '‎inert‎ על הדף שמאחור', kind: 'אחרי',
      value: `app=${during.app} · login=${during.login}`, ok: during.app && during.login,
    });
    if (!(during.app && during.login)) fail(`${mode}: הדף שמאחור אינו inert — app=${during.app}, login=${during.login}`);
    rows.push({
      mode, group: 'דיאלוג פתוח', what: '‎#toast-root‎ נשאר בחוץ', kind: 'אחרי',
      value: during.toast ? 'inert' : 'לא inert', ok: !during.toast,
      note: 'אזור ההכרזות — inert היה משתיק אותו',
    });
    if (during.toast) fail(`${mode}: #toast-root סומן inert — הודעות השמירה יושתקו`);

    const namesOpen = await names(page);
    rows.push({
      mode, group: 'דיאלוג פתוח', what: `«${BEHIND}» ירד מעץ הנגישות`, kind: 'אחרי',
      value: hasName(namesOpen, BEHIND) ? 'עדיין בעץ' : 'ירד', ok: !hasName(namesOpen, BEHIND),
    });
    if (hasName(namesOpen, BEHIND)) fail(`${mode}: «${BEHIND}» עדיין בעץ הנגישות מאחורי הדיאלוג`);
    rows.push({
      mode, group: 'דיאלוג פתוח', what: 'הדיאלוג עצמו בעץ', kind: 'אחרי',
      value: hasName(namesOpen, 'לאתחל את המכשיר?') ? 'קיים' : 'חסר',
      ok: hasName(namesOpen, 'לאתחל את המכשיר?'), note: 'אחרת ה-inert בלע גם אותו',
    });
    if (!hasName(namesOpen, 'לאתחל את המכשיר?')) fail(`${mode}: הדיאלוג עצמו נעלם מעץ הנגישות`);

    const f = await focusBehind(page);
    rows.push({
      mode, group: 'דיאלוג פתוח', what: `‎focus()‎ על «${BEHIND}» שמאחור`, kind: 'אחרי',
      value: f.took ? `תפס — ${f.landed}` : `לא תפס — נשאר על ${f.landed}`, ok: f.found && !f.took,
    });
    if (!f.found) fail(`${mode}: «${BEHIND}» לא נמצא בכרטיס — הבדיקה אינה מסוגלת ליפול`);
    if (f.took) fail(`${mode}: focus() על כפתור מאחורי הדיאלוג תפס`);

    await page.screenshot({ path: `${name()}-open-${mode}.png`, clip: { x: 0, y: 0, width: 1280, height: 700 } });

    // ── the control: the same page, inert taken off by hand ───────────
    // This is what the console had until this step, produced live rather than
    // asserted: the dialog is still open, the backdrop is still on screen, and
    // the page behind is reachable again.
    await page.evaluate(() => document.querySelector('#app-view').removeAttribute('inert'));
    await page.waitForTimeout(80);
    const ctrlNames = await names(page);
    rows.push({
      mode, group: 'בקרה — ‎inert‎ הוסר ביד', what: `«${BEHIND}» בעץ הנגישות`, kind: 'לפני',
      value: hasName(ctrlNames, BEHIND) ? 'חזר לעץ' : 'עדיין ירד', ok: hasName(ctrlNames, BEHIND),
    });
    if (!hasName(ctrlNames, BEHIND)) fail(`בקרה (${mode}): הסרת inert לא החזירה את «${BEHIND}» לעץ — לא ה-inert הוא שהוריד אותו`);
    const ctrlF = await focusBehind(page);
    rows.push({
      mode, group: 'בקרה — ‎inert‎ הוסר ביד', what: `‎focus()‎ על «${BEHIND}»`, kind: 'לפני',
      value: ctrlF.took ? 'תפס — הכפתור שמתחת לדיאלוג ממוקד' : `לא תפס — ${ctrlF.landed}`, ok: ctrlF.took,
    });
    if (!ctrlF.took) fail(`בקרה (${mode}): גם בלי inert המיקוד לא תפס — הבדיקה אינה מסוגלת ליפול`);
    await page.evaluate(() => document.querySelector('#app-view').toggleAttribute('inert', true));
    await page.evaluate(() => document.querySelector('#modal-root .modal').focus());

    // ── nesting ───────────────────────────────────────────────────────
    // A second dialog through the real `modal()`, then closed. The first is
    // still on screen, so the page behind must stay inert. A boolean flag set
    // on open and cleared on close fails exactly here.
    await page.evaluate(() => modal('<h3>דיאלוג שני</h3><div class="row"><button class="btn btn-light" id="qa-2">סגירה</button></div>'));
    await page.waitForTimeout(120);
    const two = await attrs(page);
    rows.push({
      mode, group: 'שני דיאלוגים', what: 'שניים פתוחים — הדף inert', kind: 'אחרי',
      value: `${two.open} פתוחים · app=${two.app}`, ok: two.open === 2 && two.app,
    });
    if (!(two.open === 2 && two.app)) fail(`${mode}: שני דיאלוגים — open=${two.open}, inert=${two.app}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const one = await attrs(page);
    rows.push({
      mode, group: 'שני דיאלוגים', what: 'העליון נסגר — הדף נשאר inert', kind: 'אחרי',
      value: `${one.open} פתוח · app=${one.app}`, ok: one.open === 1 && one.app,
      note: 'הראשון עדיין על המסך',
    });
    if (!(one.open === 1 && one.app)) fail(`${mode}: אחרי סגירת העליון — open=${one.open}, inert=${one.app}`);

    // ── close: inert off, and focus home ──────────────────────────────
    await page.keyboard.press('Escape');
    await page.waitForTimeout(180);
    const after = await attrs(page);
    const home = await page.evaluate(() => {
      const a = document.activeElement;
      return a === document.body ? 'body' : (a.textContent || '').trim().slice(0, 20);
    });
    rows.push({
      mode, group: 'אחרי הסגירה', what: '‎inert‎ ירד', kind: 'אחרי',
      value: `app=${after.app} · login=${after.login} · ${after.open} פתוחים`,
      ok: !after.app && !after.login && after.open === 0,
    });
    if (after.app || after.login) fail(`${mode}: inert נשאר על הדף אחרי שכל הדיאלוגים נסגרו — הדף מת`);
    rows.push({
      mode, group: 'אחרי הסגירה', what: 'המיקוד חזר לכפתור שפתח', kind: 'אחרי',
      value: home, ok: home.includes(OPENER),
      note: 'הסדר: ‎inert‎ יורד לפני ה-‎focus()‎',
    });
    if (!home.includes(OPENER)) fail(`${mode}: אחרי הסגירה המיקוד על «${home}» ולא על «${OPENER}» — סדר הפעולות ב-bg.remove`);

    const namesAfter = await names(page);
    rows.push({
      mode, group: 'אחרי הסגירה', what: `«${BEHIND}» חזר לעץ הנגישות`, kind: 'אחרי',
      value: hasName(namesAfter, BEHIND) ? 'קיים' : 'חסר', ok: hasName(namesAfter, BEHIND),
    });
    if (!hasName(namesAfter, BEHIND)) fail(`${mode}: «${BEHIND}» לא חזר לעץ הנגישות אחרי הסגירה`);

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מתי | מה נבדק | סוג | הנמדד | הערה | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.group} | ${r.what} | ${r.kind} | ${r.value} | ${r.note || ''} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => r.kind === 'לפני');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות בקרה: ${ctrl.filter((r) => r.ok).length} אישרו שהמצב הקודם השאיר את הדף שמאחור נגיש.`);
