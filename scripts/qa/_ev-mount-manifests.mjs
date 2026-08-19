// ראיה חד-פעמית לסבב מניפסטי ההרכבות. נקרא ישירות מהייצור.
import { writeFileSync } from 'node:fs';

const out = { probed_at_utc: process.env.STAMP ?? null, rows: [] };
const urls = [
  'https://more30.com/manifest.webmanifest',
  'https://more30.com/galil/manifest.webmanifest',
  'https://more30.com/galil/pwa-192.png',
  'https://more30.com/galil/pwa-512.png',
  'https://more30.com/mthbram/manifest.webmanifest',
  'https://more30.com/icon-192.png',
  'https://more30.com/icon-512.png',
  'https://more30.com/mthbram/icon-192.png',
  'https://more30.com/pwa-192.png',
  'https://more30.com/pwa-512.png',
  'https://more30.com/tivuch/manifest.webmanifest',
];

for (const u of urls) {
  const r = await fetch(u, { redirect: 'follow' });
  const b = Buffer.from(await r.arrayBuffer());
  const row = {
    url: u, status: r.status, server: r.headers.get('server'),
    content_type: r.headers.get('content-type'), bytes: b.length,
  };
  if (b.length > 24 && b.subarray(1, 4).toString('latin1') === 'PNG') {
    row.pixels = `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
  }
  if (r.status === 200 && /manifest|json/.test(row.content_type ?? '')) {
    row.body = JSON.parse(b.toString('utf8'));
  }
  out.rows.push(row);
}

writeFileSync('QA/platform/mount-icons-0810/_live-manifests.json', JSON.stringify(out, null, 2), 'utf8');
console.log(out.rows.map((r) => `${r.status} ${String(r.bytes).padStart(7)} ${r.pixels ?? ''}\t${r.url}`).join('\n'));
