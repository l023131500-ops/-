/**
 * Wait for a page to stop growing before measuring it.
 *
 * ⚠️ Why this is a shared module rather than a snippet copied per script.
 *
 * The same measurement bug has now been found three times in this repo, each
 * time in a script that had copied an earlier version of the idea:
 *
 *   · report-integrity.mjs reported the property report as "575 characters" —
 *     a broken product — when it had simply been measured mid-load.
 *   · placeholder-leak.mjs and dead-controls.mjs recorded kupot at 908
 *     characters. The same page reads 908 at two seconds and 3,164 at five.
 *   · a fixed sleep in system-facts.mjs was persisting those short readings
 *     into the QA records.
 *
 * A fixed sleep does not measure a page, it measures the network that minute.
 * Two stable samples is not enough either: a loading shell can hold steady for
 * seconds and be mistaken for the finished article. Three consecutive identical
 * readings plus a floor is what actually held up against kupot, the slowest
 * page measured here.
 *
 * The numbers are not arbitrary and are not to be tuned down without a
 * measurement that justifies it.
 */

export const SETTLE_FLOOR_MS = 5000;
const SAMPLE_MS = 1200;
const STABLE_SAMPLES = 3;
const MAX_SAMPLES = 20;

/**
 * @param {import('playwright-core').Page} page
 * @param {{ floorMs?: number, minChars?: number }} [opts]
 *   minChars — wait for a page to exist at all before timing its stability;
 *   without it a shell of 0 characters counts as three stable samples.
 */
export async function settle(page, opts = {}) {
  const floor = opts.floorMs ?? SETTLE_FLOOR_MS;

  if (opts.minChars) {
    await page
      .waitForFunction(
        (n) => document.body.innerText.length > n,
        opts.minChars,
        { timeout: 30000 },
      )
      .catch(() => {});
  }

  const start = Date.now();
  let last = -1;
  let stable = 0;
  for (let i = 0; i < MAX_SAMPLES; i++) {
    await page.waitForTimeout(SAMPLE_MS);
    const n = await page.evaluate(() => document.body.innerText.length);
    stable = n === last ? stable + 1 : 0;
    last = n;
    if (stable >= STABLE_SAMPLES && Date.now() - start >= floor) return last;
  }
  return last;
}
