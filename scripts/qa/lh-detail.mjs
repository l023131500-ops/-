// lh-detail.mjs — name the DOM nodes behind one Lighthouse audit.
//
// lighthouse-run.mjs records which audits failed, not which elements failed
// them, and "color-contrast: score 0" is not something you can act on. This
// re-runs a single audit and prints each offending node's selector and snippet.
//
// It also settles disagreements between Lighthouse and our own probes: the two
// emulate different viewports and handle translucent colours differently, so
// when contrast-probe.mjs says clean and Lighthouse says fail, this says who
// is looking at what.
//
// Usage:  node lh-detail.mjs <url> [auditId]   (default: color-contrast)

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const url = process.argv[2];
const auditId = process.argv[3] || 'color-contrast';
if (!url) { console.error('usage: node lh-detail.mjs <url> [auditId]'); process.exit(1); }

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox'],
  chromePath: 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe',
});

try {
  const res = await lighthouse(url, { port: chrome.port, output: 'json', onlyAudits: [auditId] });
  const a = res.lhr.audits[auditId];
  console.log(`${auditId} — score ${a.score} · ${a.title}`);
  const items = a.details?.items || [];
  if (!items.length) console.log('(no failing nodes reported)');
  for (const item of items) {
    console.log('---');
    if (item.node?.selector) console.log('  ' + item.node.selector);
    if (item.node?.snippet) console.log('  ' + item.node.snippet.replace(/\s+/g, ' ').slice(0, 200));
    if (item.node?.explanation) console.log('  → ' + item.node.explanation);
  }
} finally {
  // chrome-launcher removes its temp profile on kill, and Windows keeps a
  // handle open a moment longer — an EPERM here would mask the report above.
  try { await chrome.kill(); } catch (e) { console.error(`(chrome cleanup: ${e.message})`); }
}
