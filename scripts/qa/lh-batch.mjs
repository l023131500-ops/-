// Lighthouse across several routes in one pass, so the prerender work can be
// aimed at the systems that actually need it rather than applied blindly.
//   node scripts/qa/lh-batch.mjs /zchuyot /kupot /mechiron /egod /chatzor
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const routes = process.argv.slice(2);
const out = {};

for (const r of routes) {
  const key = r.replace(/\//g, '') || 'home';
  const file = `QA/shots/lh-${key}.json`;
  try {
    execFileSync(
      'npx',
      ['--yes', 'lighthouse@13', 'https://more30.com' + r, '--quiet',
       '--chrome-flags=--headless=new --no-sandbox',
       '--only-categories=performance,accessibility,best-practices,seo',
       '--output=json', `--output-path=${file}`],
      { stdio: 'ignore', shell: true, timeout: 300000 },
    );
  } catch (e) { /* lighthouse exits non-zero on some audits; the file is what matters */ }

  if (!fs.existsSync(file)) { console.log(`${key.padEnd(11)} FAILED`); continue; }
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const s = (c) => Math.round((j.categories[c]?.score ?? 0) * 100);
  const m = (id) => j.audits[id]?.displayValue ?? '';
  out[key] = { perf: s('performance'), a11y: s('accessibility'),
               bp: s('best-practices'), seo: s('seo'),
               fcp: m('first-contentful-paint'), lcp: m('largest-contentful-paint'),
               tbt: m('total-blocking-time'), cls: m('cumulative-layout-shift') };
  console.log(
    `${key.padEnd(11)} perf=${String(out[key].perf).padEnd(4)} a11y=${String(out[key].a11y).padEnd(4)} ` +
    `bp=${String(out[key].bp).padEnd(4)} seo=${String(out[key].seo).padEnd(4)} ` +
    `FCP=${out[key].fcp.padEnd(8)} LCP=${out[key].lcp}`);
}

fs.writeFileSync('QA/shots/_lh.json', JSON.stringify(out, null, 2), 'utf8');
