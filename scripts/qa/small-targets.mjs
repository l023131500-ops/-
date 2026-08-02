// List every remaining sub-24px touch target across the platform, grouped, so
// the fixes can be batched instead of hunted one system at a time.
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync('QA/platform/_results.json', 'utf8'));
const rs = r.routes || r;

for (const key of Object.keys(rs)) {
  const v = rs[key];
  if (!v || typeof v !== 'object') continue;
  const d = v.desktop || v;
  const small = d.smallTargets || [];
  if (!small.length) continue;
  const groups = {};
  for (const t of small) {
    const k = `${t.tag} ${t.w}x${t.h} "${t.name || ''}"`;
    groups[k] = (groups[k] || 0) + 1;
  }
  console.log(`\n=== ${key}  (${small.length})`);
  for (const [k, n] of Object.entries(groups)) console.log(`  ${n} x  ${k}`);
}
