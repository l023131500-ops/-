/**
 * Did the clearance actually take effect, or did the route just happen to
 * measure clear?
 *
 * `authbutton-overlap.mjs` answers "does the pill cover a control right now",
 * which is the outcome that matters — but it cannot tell a nav that reserved
 * space from a nav whose last control simply sits somewhere else. On mthbram
 * the declaration is present in the style attribute, valid in isolation, and
 * computes to 16px anyway. That is worth knowing everywhere the same fix was
 * applied, rather than assuming eight systems are fine because they measured
 * clear once.
 *
 *   node scripts/qa/authbutton-applied.mjs
 */
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';

// route -> the element the clearance was written onto, and which side of the
// box it uses. Most reserve padding on the nav row; mthbram cannot, because its
// own CSS carries `.container{padding-left:1rem!important}` and `!important` in
// an author sheet beats a normal inline declaration — so there the clearance is
// a margin on the control itself.
const TARGETS = [
  ['torah', '/torah', 'header > div', 'padding'],
  ['tamlul', '/tamlul', 'header > div', 'padding'],
  ['imud', '/imud', 'header > div', 'padding'],
  ['smel', '/smel', 'header > div', 'padding'],
  ['egod', '/egod', 'nav > div', 'padding'],
  ['chatzor-app', '/chatzor/', 'header > div', 'padding'],
  ['galil', '/galil', 'nav > div', 'padding'],
  ['mthbram', '/mthbram', 'nav > div button[aria-label]', 'margin'],
  ['nadlan', '/nadlan', 'header > div', 'padding'],
  ['bkalot', '/bkalot', '.header-inner', 'padding'],
  ['home', '/', '.nav-in', 'padding'],
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
let notReserved = 0;
for (const [key, path, sel, side] of TARGETS) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true,
  });
  try {
    await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4500);
    const r = await page.evaluate(([sel, side]) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--more30-auth-inset').trim();
      const el = document.querySelector(sel);
      if (!el) return { varSet: v, found: false };
      const cs = getComputedStyle(el);
      return {
        varSet: v,
        found: true,
        value: side === 'margin' ? cs.marginInlineEnd : cs.paddingInlineEnd,
      };
    }, [sel, side]);

    if (!r.found) { console.log(`${key.padEnd(12)} selector not found: ${sel}`); notReserved++; }
    else {
      // The pill measures ~96px wide, so anything under 60 is not clearance.
      const applied = parseFloat(r.value) >= 60;
      if (!applied) notReserved++;
      console.log(
        `${key.padEnd(12)} var=${String(r.varSet).padEnd(6)} ${side}InlineEnd=${String(r.value).padEnd(8)}` +
          ` ${applied ? 'RESERVED' : 'NOT reserved'}`,
      );
    }
  } catch (e) {
    console.log(`${key.padEnd(12)} ERR ${String(e.message).slice(0, 60)}`);
    notReserved++;
  }
  await page.close();
}
console.log(`\n${TARGETS.length - notReserved}/${TARGETS.length} reserving space`);
await browser.close();
