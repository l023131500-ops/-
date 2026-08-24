/**
 * Drives the stub console in a real Chromium and asserts the new "📋 יומן"
 * device-activity-log view (KIOSK_BUILD.md §9) renders correctly:
 *  - the button exists on every device card
 *  - clicking it fetches GET /devices/:id and renders commands + events,
 *    newest first, with Hebrew labels for every type logEvent()/issueCommand()
 *    is actually called with in the server source (not just a happy-path subset)
 *  - an unmapped/future event type falls back to its raw string instead of
 *    throwing or printing "undefined"
 *  - a device with no history yet shows the two empty-state messages, not a
 *    blank panel or a stuck spinner
 *  - the modal closes cleanly
 * Screenshots both light and dark (the console reads prefers-color-scheme).
 *
 * Run: node QA/kiosk/device-log-0824/run.mjs
 * (spawns stub-server.mjs itself; requires the playwright package installed
 * at /tmp/qa/node_modules, per this session's environment)
 */
import { chromium } from '/tmp/qa/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4175;
const BASE = `http://127.0.0.1:${PORT}`;

function pass(msg) { console.log(`  ok — ${msg}`); }
function fail(msg) { console.error(`  FAIL — ${msg}`); process.exitCode = 1; }
function assertTrue(cond, msg) { if (cond) pass(msg); else fail(msg); }

async function main() {
  const srv = spawn('node', [path.join(HERE, 'stub-server.mjs'), String(PORT)], { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 400));

  const browser = await chromium.launch();
  try {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      await page.goto(`${BASE}/console`);
      await page.evaluate(() => { localStorage.setItem('kf_token', 'qa-token'); });
      await page.reload();
      await page.waitForSelector('.device', { timeout: 5000 });

      const cards = await page.$$('.device');
      assertTrue(cards.length === 2, `[${scheme}] two device cards render`);

      const logButtons = await page.$$('button:has-text("📋 יומן")');
      assertTrue(logButtons.length === 2, `[${scheme}] every device card has a 📋 יומן button`);

      // Device 1 — populated log.
      await logButtons[0].click();
      await page.waitForSelector('.modal h4', { timeout: 5000 });
      const modalText = await page.textContent('.modal');

      assertTrue(modalText.includes('אתחול') && modalText.includes('נכשל'), `[${scheme}] a failed reboot command renders type + status in Hebrew`);
      assertTrue(modalText.includes('צילום מסך') && modalText.includes('בוצע'), `[${scheme}] a done screenshot command renders`);
      assertTrue(modalText.includes('עדכון הגדרות') && modalText.includes('נשלח'), `[${scheme}] a delivered update_config command renders`);

      for (const label of ['פקודה נשלחה', 'המכשיר נרשם', 'המכשיר התחבר', 'זוהה לקוח במכשיר', 'צילום מסך נלכד', 'תגובת מכשיר לפקודה', 'הגדרות עודכנו', 'לקוח אושר למכשיר', 'אישור לקוח בוטל']) {
        assertTrue(modalText.includes(label), `[${scheme}] event type label "${label}" renders`);
      }
      assertTrue(modalText.includes('weird_future_type'), `[${scheme}] an unmapped event type falls back to its raw name instead of "undefined"`);
      assertTrue(!modalText.includes('undefined') && !modalText.includes('[object'), `[${scheme}] no raw "undefined"/"[object Object]" leaked into the modal`);

      // Order: newest-first, exactly as the server query already returns it —
      // the modal must not re-sort or reverse.
      const rows = await page.$$eval('.modal table:nth-of-type(2) tr', (trs) => trs.map((tr) => tr.textContent));
      const revokedIdx = rows.findIndex((r) => r.includes('אישור לקוח בוטל'));
      const enrolledIdx = rows.findIndex((r) => r.includes('המכשיר נרשם'));
      assertTrue(revokedIdx > 0 && enrolledIdx > revokedIdx, `[${scheme}] events render newest-first (server order preserved)`);

      await page.screenshot({ path: path.join(HERE, `01-log-populated-${scheme}.png`) });

      const closeBtn = await page.$('.modal button:has-text("סגירה")');
      await closeBtn.click();
      assertTrue((await page.$('.modal-bg')) === null, `[${scheme}] closing the modal removes it`);

      // Device 2 — empty state.
      await logButtons[1].click();
      await page.waitForSelector('.modal h4', { timeout: 5000 });
      const emptyText = await page.textContent('.modal');
      assertTrue(emptyText.includes('אין עדיין פקודות'), `[${scheme}] empty commands shows the no-commands message, not a blank table`);
      assertTrue(emptyText.includes('אין עדיין אירועים'), `[${scheme}] empty events shows the no-events message, not a blank table`);
      await page.screenshot({ path: path.join(HERE, `02-log-empty-${scheme}.png`) });
      await page.click('.modal button:has-text("סגירה")');

      assertTrue(errors.length === 0, `[${scheme}] no console/page errors during the whole flow${errors.length ? ': ' + errors.join(' | ') : ''}`);

      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  if (process.exitCode) { console.error('\nRESULT: FAIL'); } else { console.log('\nRESULT: PASS'); }
}

main();
