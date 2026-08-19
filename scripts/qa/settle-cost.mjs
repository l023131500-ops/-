// settle-cost.mjs — what does the 13000ms floor in lib/settle.mjs still buy,
// now that the sampler waits for networkidle before it starts timing?
//
// core.issues #80: a full platform-audit.mjs pass went from ~10 minutes to ~1
// hour. The cost is settle()'s floor — after networkidle it still refuses to
// return for another 13 seconds, on every route, in all three modes.
//
// The floor was raised three times (5000 → 9000 → 13000) for one reason: kupot
// serves a loading shell that sits PERFECTLY STILL while a fetch is in flight,
// so three stable samples land inside it. Then networkidle was added in front
// of the sampler, which addresses that exact failure directly — the shell is
// waiting on a fetch, and networkidle is that fetch finishing. If that holds,
// the floor is now paying twice for the same guarantee on every page that goes
// idle, and is only load-bearing on pages that never do.
//
// "If that holds" is the thing to measure, not assume. This harness reproduces
// settle() exactly — same 1200ms cadence, same 3 stable samples, same 20000ms
// bounded networkidle wait — records one series per target, and replays two
// policies over that ONE series so the comparison is free of run-to-run drift:
//
//   floor-13000   what settle() does today
//   idle-aware    floor 0 when networkidle was reached, 13000 when it was not
//
// A verdict of "same chars, less time" on every target is the licence to change
// the floor. Any target where idle-aware reads SHORT is the counter-example and
// the floor stays.
//
// Output: QA/platform/_settle-cost.json + a table on stdout.
//
// Usage:  node scripts/qa/settle-cost.mjs

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform';
const ORIGIN = 'https://more30.com';

// settle.mjs's own constants, mirrored so the replay is faithful.
const SAMPLE_MS = 1200;
const STABLE_SAMPLES = 3;
const MAX_SAMPLES = 20;
const IDLE_TIMEOUT_MS = 20000;
const CURRENT_FLOOR_MS = 13000;

// The targets are chosen, not sampled: the two known-hard cases first, the two
// known-never-idle cases second, and four ordinary routes to price the saving.
const TARGETS = [
  { key: 'kupot', mode: 'desktop', path: '/kupot', why: 'the shell every floor raise was bought for' },
  { key: 'kupot', mode: 'mobile', path: '/kupot', why: 'read 908 at 18.5s — the case 13000ms did NOT cover' },
  { key: 'mechiron', mode: 'desktop', path: '/mechiron', why: 'never reaches networkidle (issue #80)' },
  { key: 'kiosk', mode: 'desktop', path: '/kiosk/', why: 'holds a WebSocket open — never idle by design' },
  { key: 'home', mode: 'desktop', path: '/', why: 'ordinary route' },
  { key: 'zchuyot', mode: 'desktop', path: '/zchuyot', why: 'ordinary route' },
  { key: 'nadlan', mode: 'desktop', path: '/nadlan', why: 'ordinary route' },
  { key: 'chatzor-app', mode: 'desktop', path: '/chatzor/', why: 'ordinary route' },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });

async function measure(t) {
  const ctx = await browser.newContext({
    viewport: t.mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    locale: 'he-IL',
    isMobile: t.mode === 'mobile',
    hasTouch: t.mode === 'mobile',
    deviceScaleFactor: t.mode === 'mobile' ? 2 : 1,
    userAgent: t.mode === 'mobile'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  const page = await ctx.newPage();
  const url = ORIGIN + t.path;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

    // settle()'s minChars gate, as platform-audit.mjs calls it.
    await page
      .waitForFunction((n) => document.body.innerText.length > n, 50, { timeout: 30000 })
      .catch(() => {});

    const tIdle0 = Date.now();
    let idleReached = true;
    await page
      .waitForLoadState('networkidle', { timeout: IDLE_TIMEOUT_MS })
      .catch(() => { idleReached = false; });
    const idleMs = Date.now() - tIdle0;

    // one series, sampled exactly as settle() samples, never cut short — both
    // policies are replayed over it below.
    const t0 = Date.now();
    const series = [];
    for (let i = 0; i < MAX_SAMPLES; i++) {
      await page.waitForTimeout(SAMPLE_MS);
      const chars = await page.evaluate(() => document.body.innerText.length).catch(() => -1);
      series.push({ atMs: Date.now() - t0, chars });
    }
    await ctx.close();
    return { ...t, url, idleReached, idleMs, series };
  } catch (e) {
    await ctx.close();
    return { ...t, url, error: String(e).slice(0, 160) };
  }
}

// settle()'s loop, replayed over a recorded series.
function replay(series, floorMs) {
  let last = -1;
  let stable = 0;
  for (const s of series) {
    stable = s.chars === last ? stable + 1 : 0;
    last = s.chars;
    if (stable >= STABLE_SAMPLES && s.atMs >= floorMs) {
      return { chars: last, sampleMs: s.atMs };
    }
  }
  return { chars: last, sampleMs: series[series.length - 1].atMs };
}

const results = [];
for (const t of TARGETS) {
  const r = await measure(t);
  if (r.error) {
    results.push(r);
    console.log(`${(r.key + ' ' + r.mode).padEnd(20)} ERROR ${r.error}`);
    continue;
  }
  const current = replay(r.series, CURRENT_FLOOR_MS);
  const proposed = replay(r.series, r.idleReached ? 0 : CURRENT_FLOOR_MS);
  // total wall clock settle() costs: the networkidle wait plus the sampling.
  const row = {
    ...r,
    settled: r.series[r.series.length - 1].chars,
    current: { ...current, totalMs: r.idleMs + current.sampleMs },
    proposed: { ...proposed, totalMs: r.idleMs + proposed.sampleMs },
  };
  row.sameReading = current.chars === proposed.chars;
  row.savedMs = row.current.totalMs - row.proposed.totalMs;
  results.push(row);

  console.log(
    `${(row.key + ' ' + row.mode).padEnd(20)}` +
    ` idle ${row.idleReached ? String(row.idleMs).padStart(6) + 'ms' : ' TIMEOUT'}` +
    ` · now ${String(current.chars).padStart(6)} ch @ ${String(row.current.totalMs).padStart(6)}ms` +
    ` · proposed ${String(proposed.chars).padStart(6)} ch @ ${String(row.proposed.totalMs).padStart(6)}ms` +
    ` · ${row.sameReading ? `same, saves ${row.savedMs}ms` : 'DIFFERENT READING'}`,
  );
}

fs.writeFileSync(
  path.join(OUT, '_settle-cost.json'),
  JSON.stringify(
    { sampleMs: SAMPLE_MS, stableSamples: STABLE_SAMPLES, currentFloorMs: CURRENT_FLOOR_MS, results },
    null, 2,
  ),
  'utf8',
);
await browser.close();

const measured = results.filter((r) => !r.error);
const differ = measured.filter((r) => !r.sameReading);
const saved = measured.reduce((a, r) => a + r.savedMs, 0);
console.log(
  `\n${differ.length} of ${measured.length} targets read differently under the idle-aware floor` +
  `${differ.length ? `: ${differ.map((r) => r.key + '/' + r.mode).join(', ')}` : ''}.` +
  ` Saved across these ${measured.length}: ${(saved / 1000).toFixed(1)}s.`,
);
