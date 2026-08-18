// Prints the real top-level shape of the live nadlan report payload, so a
// "field missing" claim can be checked against the actual key names instead of
// guessed ones. Read-only GET through more30.com.
//
//   node scripts/qa/nadlan-report-keys.mjs "<query>" [tier]

const q = process.argv[2] || 'הבעל שם טוב 9 רחובות';
const tier = process.argv[3] || 'premium';
const url = `https://more30.com/nadlan/api/report?q=${encodeURIComponent(q)}&tier=${tier}&cachebust=keys0818`;

const res = await fetch(url, { headers: { accept: 'application/json' } });
const j = await res.json();

function shape(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `array(${v.length})${v.length ? ' of ' + (typeof v[0] === 'object' && v[0] ? '{' + Object.keys(v[0]).slice(0, 8).join(',') + '}' : typeof v[0]) : ''}`;
  if (typeof v === 'object') return '{' + Object.keys(v).slice(0, 14).join(',') + '}';
  return `${typeof v}: ${String(v).slice(0, 60)}`;
}

console.log(`status ${res.status}  tier ${tier}  query ${q}`);
for (const k of Object.keys(j)) console.log(`${k.padEnd(22)} ${shape(j[k])}`);
