/**
 * The page half of the same defect: 0033 makes the RPC return no plans for a
 * system that is not offered, and an empty list is not an explanation.
 *
 * Two pages draw plan cards — /system.html and /subscribe — and both would have
 * shown a heading ("מסלולים", "בחירת מסלול") over blank space, with the line
 * "בחירת מסלול בתשלום רושמת בקשה ואינה מחייבת" still under it, reading as an
 * invitation to choose from nothing. Each now says why, in the words the
 * database supplies, and /system.html keeps drawing everything below the plans —
 * the §3 admin link sits after that block, and skipping it would trade one
 * defect for another.
 *
 *   node scripts/qa/hidden-not-sellable-page.mjs
 *
 * Served from portal/public locally against the live RPC: the deploy queue is
 * blocked on core.issues #83, so the HTML under test is the one in this commit.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5219;
const OUT = 'QA/platform/hidden-not-sellable-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? `  << ${detail}` : '')); }
  results.push({ name, pass: !!cond, detail: detail ?? null });
};

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
    { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 700));

  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  const visit = async (url) => {
    await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  };

  try {
    // --- a system that is not offered: /system.html
    await visit('/system.html?app=mechiron');
    let s = await page.evaluate(() => ({
      cards: document.querySelectorAll('#planList .plan').length,
      lede: document.getElementById('plansLede')?.textContent?.trim() ?? '',
      noteHidden: document.querySelector('#plans .note')?.hidden ?? null,
      // everything below the plans block must still be drawn
      adminNoteHidden: document.getElementById('adminNote')?.hidden ?? null,
      title: document.getElementById('title')?.textContent?.trim() ?? '',
      enter: document.getElementById('enter')?.getAttribute('href') ?? null,
    }));
    ok('system.html(mechiron) draws no plan card', s.cards === 0, `cards=${s.cards}`);
    ok('and states why in place of the plan list', /אינה מוצעת|אינה פעילה/.test(s.lede), s.lede);
    ok('the "choosing a plan registers a request" note is withdrawn', s.noteHidden === true,
      `hidden=${s.noteHidden}`);
    ok('the system itself is still named', s.title.length > 0, s.title);
    ok('and the link into the product is still there', !!s.enter, `href=${s.enter}`);
    await page.screenshot({ path: `${OUT}/system-mechiron.png`, fullPage: true });

    // --- a system that is not offered: /subscribe
    await visit('/subscribe.html?app=mechiron');
    let b = await page.evaluate(() => ({
      cards: document.querySelectorAll('#planList .plan').length,
      lede: document.getElementById('lede')?.textContent?.trim() ?? '',
      buttons: document.querySelectorAll('#planList button[data-plan]').length,
    }));
    ok('subscribe(mechiron) draws no plan card', b.cards === 0, `cards=${b.cards}`);
    ok('and no button that could send a subscribe call', b.buttons === 0, `buttons=${b.buttons}`);
    ok('and states why', /אינה מוצעת|אינה פעילה/.test(b.lede), b.lede);
    await page.screenshot({ path: `${OUT}/subscribe-mechiron.png`, fullPage: true });

    // --- a system that is offered: unchanged, and this is the half that proves
    //     the guard did not simply blank the plan section for everybody.
    await visit('/system.html?app=kupot');
    s = await page.evaluate(() => ({
      cards: document.querySelectorAll('#planList .plan').length,
      noteHidden: document.querySelector('#plans .note')?.hidden ?? null,
      lede: document.getElementById('plansLede')?.textContent?.trim() ?? '',
    }));
    ok('system.html(kupot) still draws its three plans', s.cards === 3, `cards=${s.cards}`);
    ok('and keeps the billing note', s.noteHidden === false, `hidden=${s.noteHidden}`);
    ok('and does not claim it is unavailable', !/אינה מוצעת|אינה פעילה/.test(s.lede), s.lede);
    await page.screenshot({ path: `${OUT}/system-kupot.png`, fullPage: true });

    await visit('/subscribe.html?app=kupot');
    b = await page.evaluate(() => ({
      cards: document.querySelectorAll('#planList .plan').length,
      buttons: document.querySelectorAll('#planList button[data-plan]').length,
    }));
    ok('subscribe(kupot) still draws its three plans', b.cards === 3, `cards=${b.cards}`);
    ok('with a choosable button on each', b.buttons === 3, `buttons=${b.buttons}`);
    await page.screenshot({ path: `${OUT}/subscribe-kupot.png`, fullPage: true });

    ok('no page threw on any of the four loads', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
    server.kill();
  }

  await writeFile(`${OUT}/_page_results.json`, JSON.stringify({
    measured_at: new Date().toISOString(),
    served_from: 'portal/public',
    pass, fail, results,
  }, null, 2), 'utf8');

  console.log(`\n${pass} passed / ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
};

main().catch((e) => { console.error(e); process.exit(1); });
