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
 * readings plus a floor is the shape of the answer — but see the correction
 * below for what the floor actually has to be, because the first one was set
 * too low and kupot, the slowest page measured here, walked straight through it.
 *
 * The numbers are not arbitrary and are not to be tuned down without a
 * measurement that justifies it.
 *
 * ⚠️ 06/08 — the floor was 5000ms and that was not enough, on the very page
 * this module cites as its worst case. Sampled once a second, twice:
 *
 *   run 1   2.7s..5.7s 901 chars / 24 links   →   6.7s onward 3157 / 50
 *   run 2   2.9s..5.0s 901 chars / 24 links   →   6.0s onward 3157 / 50
 *
 * kupot serves a loading shell that sits PERFECTLY STILL for about six seconds.
 * Three stable samples land inside it, and the floor released the reading at
 * 6.0s — right as the real content arrived. probe-all.mjs adopted settle() and
 * kupot promptly got *worse*, 3157 characters down to 901, because the fixed
 * 4.2s sleep it replaced had been landing on the far side of the flip by luck.
 * The floor was then 9000ms: three seconds clear of the longest plateau measured,
 * so the sampler was guaranteed to still be watching when the shell gave way.
 *
 * ⚠️ 07/08 — 9000ms was not enough either, on the same page, and this time the
 * failure was caught in the output rather than in review. platform-audit.mjs
 * adopted settle() and recorded kupot at 908 characters / 25 interactive
 * elements on desktop and dark, and 3164 / 51 on mobile — one run, one URL,
 * three modes, two of them still reading the shell. Re-sampled once a second
 * for 25s, twice:
 *
 *   run 1   1.0s 460 chars / 7 controls   2.1s..9.2s 908 / 25   →  10.2s onward 3164 / 51
 *   run 2                                 1.0s..7.1s 908 / 25   →   8.1s onward 3164 / 51
 *
 * The plateau is not a fixed six seconds; it tracks how long the data behind it
 * takes that minute, and it reached 9.2s here. A 9000ms floor releases the
 * reading at the fourth stable sample, ~9.6s — inside run 1's plateau by four
 * tenths of a second. That is the whole margin the previous correction bought.
 *
 * Note what does NOT help: sampling the interactive-element count alongside the
 * text. Both numbers are equally frozen during the plateau (908/25 for seven to
 * nine seconds). No stability test can see through a shell that is genuinely
 * still — only the floor can, which is why the floor is the thing that moves.
 *
 * The floor is now 13000ms: 3.8 seconds clear of the longest plateau measured.
 * This makes every adopting script slower — a full platform-audit.mjs pass over
 * 30 routes × 3 modes goes from roughly ten minutes to roughly half an hour.
 * That is the correct trade. A fast number that is wrong is worth less than a
 * slow number that is right, and these numbers are what SYSTEMS_STATUS.md and
 * core.projects.public_visible are decided from.
 *
 * ⚠️ And 13000ms was still not enough — kupot's MOBILE pass read 908 at 18.5s
 * while desktop and dark both read 3164. Raising the floor a third time would
 * be guessing at a duration that plainly varies with the emulated device, the
 * data behind the page and the minute of the day. So the floor stopped being
 * the only answer.
 *
 * The shell is not idle while it sits still — it is waiting on a fetch. That
 * fetch is an observable event, unlike the duration it happens to take, so the
 * sampler now waits for the network to go quiet BEFORE it starts timing
 * stability. The floor is retained behind it as the backstop for pages that
 * render late off already-loaded data.
 *
 * The networkidle wait is bounded and swallowed on purpose: a page holding a
 * WebSocket open (/kiosk) or polling on an interval never goes idle at all, and
 * must fall through to plain sampling rather than stall the run.
 */

export const SETTLE_FLOOR_MS = 13000;
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

  // the shell is waiting on a fetch, not idling — wait for that, not for a
  // duration. Bounded and swallowed: a page that never goes idle (WebSocket,
  // polling) falls through to sampling instead of stalling the run.
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

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
