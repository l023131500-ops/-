// QA: NADLAN_SPEC §6 — the two control addresses, measured against production.
//
// The master spec names two addresses and states what a correct report MUST reflect
// for each. Nothing in QA/ had ever run that check, so "the report is good" was an
// assumption. This probes the LIVE premium report API through more30.com (never the
// bare *.vercel.app host — NetFree 418s it from here) and reports, per spec layer,
// what is present, what is "לא זמין", and what is missing outright.
//
// Read-only: GET only, no writes, no report row created, no real send, no charge.
//
//   node scripts/qa/nadlan-spec-control-addresses.mjs [outDir]

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'https://more30.com/nadlan';
const OUT = process.argv[2] || 'QA/platform/nadlan-spec-control-0818';

// §6 of the master spec, verbatim expectations.
const ADDRESSES = [
  {
    label: 'הדקל 22, חצור הגלילית',
    query: 'הדקל 22 חצור הגלילית',
    expects: 'כל השכבות מלאות ומדויקות',
  },
  {
    label: 'הבעל שם טוב 9, רחובות',
    query: 'הבעל שם טוב 9 רחובות',
    expects: 'אוכלוסייה חרדית · בניין חדש (בן שנים בודדות) · דירות רבות שנמכרו לאחרונה',
  },
];

// The report layers the spec enumerates in §4, each with the field that carries it.
// Field names were read off a live response (scripts/qa/nadlan-report-keys.mjs)
// rather than guessed — an invented key name reads as a missing layer and would
// manufacture a defect that is not there.
const LAYERS = [
  { id: '4.1 כותרת/כתובת',        pick: (r) => r.title?.headline },
  { id: '4.1 שני שמות הרחוב',      pick: (r) => r.title?.streetAliases },
  { id: '4.1 גוש/חלקה',           pick: (r) => r.parcelIdentity },
  { id: '4.2 אופי אוכלוסייה',      pick: (r) => r.background?.population },
  { id: '4.2 אופי בנייה',          pick: (r) => r.background?.buildingCharacter },
  { id: '4.3 גיל הבניין',          pick: (r) => r.buildingAge },
  { id: '4.4 עסקאות שנמכרו',       pick: (r) => r.soldDeals },
  { id: '4.4 עסקאות בבניין',       pick: (r) => r.building?.dealsInBuilding },
  { id: '4.5 דירות מוצעות',        pick: (r) => r.listings },
  { id: '4.6 מוסדות + מרחק',       pick: (r) => r.places },
  { id: '4.6 מקוואות',            pick: (r) => r.mikvaot },
  { id: '4.7 תחבורה',             pick: (r) => r.transitStops },
  { id: '4.8 צילום בניין',         pick: (r) => r.streetView },
  { id: '4.9 מגמת מחירים',         pick: (r) => r.priceTrend },
  { id: '4.9 הערכת שווי',          pick: (r) => r.valuation },
  { id: '4.9 תב״ע/זכויות בנייה',   pick: (r) => r.permits },
  { id: '4.9 היתכנות',            pick: (r) => r.feasibility },
  { id: '§12 בנייה בסביבה',        pick: (r) => r.nearbyPlans },
];

// null and undefined are NOT the same finding here, and collapsing them invents
// defects: streetView is null at basic/premium because §2 makes the building photo
// a VIP item (buildreport.ts gates the availability probe itself on
// tierMayUseImagery), and it comes back populated at vip. Reported as one state,
// that reads as "the report has no building photo" — which is false.
function classify(v) {
  if (v === undefined) return { state: 'MISSING', detail: 'השדה אינו קיים בתשובה' };
  if (v === null) return { state: 'NULL', detail: 'null — שכבה חסומה לרמה זו או שאין נתון' };
  if (typeof v === 'string') {
    if (!v.trim()) return { state: 'EMPTY', detail: 'מחרוזת ריקה' };
    if (v.includes('לא זמין')) return { state: 'NOT_AVAILABLE', detail: v.slice(0, 80) };
    return { state: 'PRESENT', detail: v.slice(0, 80) };
  }
  if (Array.isArray(v)) {
    return v.length
      ? { state: 'PRESENT', detail: `${v.length} פריטים` }
      : { state: 'EMPTY', detail: 'מערך ריק' };
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    const live = keys.filter((k) => v[k] !== null && v[k] !== undefined && v[k] !== '');
    return live.length
      ? { state: 'PRESENT', detail: `${live.length}/${keys.length} שדות מלאים: ${live.slice(0, 6).join(',')}` }
      : { state: 'EMPTY', detail: `${keys.length} שדות, כולם ריקים` };
  }
  return { state: 'PRESENT', detail: String(v).slice(0, 80) };
}

async function fetchReport(query, tier) {
  const url = `${BASE}/api/report?q=${encodeURIComponent(query)}&tier=${tier}&cachebust=spec0818`;
  const t0 = Date.now();
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  const ms = Date.now() - t0;
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* left null on purpose — a non-JSON body is itself the finding */
  }
  return { url, status: res.status, ms, bytes: text.length, json, rawHead: text.slice(0, 200) };
}

const results = [];
for (const addr of ADDRESSES) {
  // vip is not optional in this sweep: it is the only tier that carries the §4.8
  // building photo, so a run without it cannot tell a gated layer from a broken one.
  for (const tier of ['basic', 'premium', 'vip']) {
    const r = await fetchReport(addr.query, tier);
    const layers = r.json
      ? LAYERS.map((l) => {
          let v;
          try {
            v = l.pick(r.json);
          } catch {
            v = undefined;
          }
          return { layer: l.id, ...classify(v) };
        })
      : [];
    results.push({ address: addr.label, expects: addr.expects, tier, ...r, json: undefined, layers });
    const present = layers.filter((l) => l.state === 'PRESENT').length;
    const missing = layers.filter((l) => l.state === 'MISSING').map((l) => l.layer);
    if (missing.length) console.log(`  !! MISSING (field absent, not merely null): ${missing.join(' · ')}`);
    console.log(
      `${addr.label} [${tier}] -> ${r.status}, ${r.bytes}B, ${r.ms}ms, ${present}/${LAYERS.length} layers present`,
    );
    for (const l of layers) console.log(`    ${l.state.padEnd(14)} ${l.layer} — ${l.detail}`);
  }
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, '_results.json'), JSON.stringify({ base: BASE, results }, null, 2), 'utf8');
console.log(`\nwrote ${join(OUT, '_results.json')}`);

const broken = results.filter((r) => r.status !== 200 || !r.layers.length);
console.log(broken.length ? `FAIL: ${broken.length} responses unusable` : 'All responses parsed.');
