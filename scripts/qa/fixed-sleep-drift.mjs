// fixed-sleep-drift.mjs — does the sleep each QA script uses land on the page,
// or on the loading shell in front of it?
//
// core.issues #44 lists ten scripts that read text out of a page after a fixed
// waitForTimeout. probe-all.mjs was moved to lib/settle.mjs on 06/08; the other
// nine are still guessing. "Still guessing" is not the same as "still wrong",
// and the issue never said which of the nine actually mis-read anything — so
// this measures first and the migration follows the numbers.
//
// Method: open each script's landing URL, sample document.body.innerText.length
// once a second for 18s, then report what the script's own sleep would have
// read versus what the page settles on. A route whose reading at its sleep
// already equals the settled reading is fine as it stands.
//
// ⚠️ Read the `guard` column before acting on a row. This harness samples a
// bare navigation, so it measures the URL, not the script. A script that waits
// for a content selector before its sleep is not reading the shell even when
// the bare URL is still growing — kupot-flow.mjs is exactly that case, and the
// row below would have condemned it wrongly. It was run separately to check:
// 435 results, 24 cards → 48 after "load more", filter to 71, in all three
// modes, identical. Its waitForSelector is doing the work settle() would do.
// The guard is load-bearing; do not remove it in a later tidy-up sweep.
//
// Output: QA/platform/_fixed-sleep-drift.json + a table on stdout.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform';
const SAMPLE_MS = 1000;
const SAMPLES = 18;

// script → the sleep it uses before its first text reading, the URL it reads,
// and whether it waits for a content selector first (see the warning above).
const TARGETS = [
  { script: 'chatzor-flow.mjs', sleepMs: 4500, url: 'https://more30.com/chatzor/', guard: null },
  { script: 'chizukim-flow.mjs', sleepMs: 4000, url: 'https://more30.com/chizukim/', guard: null },
  { script: 'customer-login-flow.mjs', sleepMs: 3000, url: 'https://more30.com/login?from=%2F', guard: null },
  { script: 'kupot-flow.mjs', sleepMs: 1500, url: 'https://more30.com/kupot', guard: '[data-testid^="card-topic-"]' },
  { script: 'orech-flow.mjs', sleepMs: 3500, url: 'https://more30.com/orech', guard: null },
  { script: 'platform-audit.mjs', sleepMs: 3500, url: 'https://more30.com/kupot', guard: null },
  { script: 'probe-redirect.mjs', sleepMs: 6000, url: 'https://more30.com/bkalot', guard: null },
  { script: 'studio-flow.mjs', sleepMs: 5000, url: 'https://more30.com/studio', guard: null },
  { script: 'zchuyot-flow.mjs', sleepMs: 4000, url: 'https://more30.com/zchuyot', guard: null },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });

async function sample(target) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, locale: 'he-IL',
  });
  const page = await ctx.newPage();
  const series = [];
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const t0 = Date.now();
    for (let i = 0; i < SAMPLES; i++) {
      await page.waitForTimeout(SAMPLE_MS);
      const n = await page
        .evaluate(() => (document.body ? document.body.innerText.length : 0))
        .catch(() => -1);
      series.push({ atMs: Date.now() - t0, chars: n });
    }
  } catch (e) {
    await ctx.close();
    return { ...target, error: String(e).slice(0, 140) };
  }
  await ctx.close();

  // what the script's sleep reads: the last sample at or before its wake-up.
  const before = series.filter((s) => s.atMs <= target.sleepMs);
  const atSleep = before.length ? before[before.length - 1].chars : series[0].chars;
  const settled = series[series.length - 1].chars;
  // when the page first reaches the value it ends on, and stays there.
  let settledAtMs = series[series.length - 1].atMs;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].chars !== settled) break;
    settledAtMs = series[i].atMs;
  }
  return { ...target, atSleep, settled, settledAtMs, series };
}

const results = [];
for (const t of TARGETS) {
  const r = await sample(t);
  results.push(r);
  if (r.error) {
    console.log(`${r.script.padEnd(24)} ERROR ${r.error}`);
  } else {
    const verdict = r.atSleep === r.settled
      ? 'ok'
      : r.guard
        ? `bare URL short by ${r.settled - r.atSleep} — but guarded by ${r.guard}`
        : `SHORT by ${r.settled - r.atSleep} chars`;
    console.log(
      `${r.script.padEnd(24)} sleep ${String(r.sleepMs).padStart(5)}ms → ${String(r.atSleep).padStart(6)} chars` +
      ` · settles ${String(r.settled).padStart(6)} at ${String(r.settledAtMs).padStart(6)}ms · ${verdict}`,
    );
  }
}

fs.writeFileSync(
  path.join(OUT, '_fixed-sleep-drift.json'),
  JSON.stringify({ sampleMs: SAMPLE_MS, samples: SAMPLES, results }, null, 2),
  'utf8',
);
await browser.close();

const short = results.filter((r) => !r.error && r.atSleep !== r.settled && !r.guard);
console.log(`\n${short.length} of ${results.length} read the page before it stopped changing` +
  `${short.length ? `: ${short.map((r) => r.script).join(', ')}` : ''}.`);
