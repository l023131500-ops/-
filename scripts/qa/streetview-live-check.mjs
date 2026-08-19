/**
 * Live check: does the aimed Street View shot actually face the requested
 * building, for real addresses, using real Google data?
 *
 * scripts/qa/streetview-aim.mjs already proves the geometry (bearingDeg,
 * aimQuality) is correct in isolation, 12/12, using synthetic coordinates.
 * more30-fixes-and-features.txt additionally asks for the four real
 * addresses in the spec to be "checked by eye" against a live Maps key
 * before release — that step was left open (SYSTEMS_STATUS.md: "requires a
 * Maps key and a live call"). This script does that call.
 *
 * It reuses the real, already-tested `aimQuality`/`bearingDeg` from
 * apps/32-nadlan-berega/lib/aim.ts (not a reimplementation), and mirrors
 * the network calls in apps/32-nadlan-berega/lib/googlemaps.ts
 * (streetViewMeta / streetViewImageUrl / streetViewShot) — those wrapper
 * functions are trivial URL builders around fetch/env, which is why the
 * platform's own comment there says the network+key dependency is what
 * keeps them out of a unit test. This script supplies a real key instead.
 *
 * Usage: node scripts/qa/streetview-live-check.mjs
 * Requires GOOGLE_MAPS_API_KEY in the environment.
 */
import { aimQuality } from '../../apps/32-nadlan-berega/lib/aim.ts';
import { writeFileSync, mkdirSync } from 'node:fs';

const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY) {
  console.error('GOOGLE_MAPS_API_KEY not set');
  process.exit(1);
}

const OUT_DIR = 'QA/platform/nadlan-streetview-live-0819';
mkdirSync(OUT_DIR, { recursive: true });

// The four addresses: #1 is the exact address named in the bug report
// (more30-fixes-and-features.txt), the other three are real, well-known
// Israeli street addresses picked for geographic spread (Jerusalem street
// grid, Tel Aviv boulevard grid, a Haifa hillside street, a Bnei Brak grid
// street) so the fix is checked against different street/building layouts,
// not four similar cases.
const ADDRESSES = [
  { label: 'doresh-tov-17-jerusalem', query: 'דורש טוב 17, ירושלים' },
  { label: 'dizengoff-100-telaviv', query: 'דיזנגוף 100, תל אביב' },
  { label: 'herzl-42-haifa', query: 'הרצל 42, חיפה' },
  { label: 'rabbi-akiva-30-bneibrak', query: 'רבי עקיבא 30, בני ברק' },
];

async function geocode(query) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=il&key=${KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') return { ok: false, status: json.status };
  const loc = json.results[0].geometry.location;
  return { ok: true, lat: loc.lat, lng: loc.lng, formatted: json.results[0].formatted_address };
}

async function streetViewMeta(lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return {
    available: json?.status === 'OK',
    date: json?.date ?? null,
    lat: json?.location?.lat ?? null,
    lng: json?.location?.lng ?? null,
  };
}

function streetViewImageUrl(lat, lng, w, h, { heading, fov, pitch }) {
  const parts = [
    `https://maps.googleapis.com/maps/api/streetview?size=${w}x${h}`,
    `location=${lat},${lng}`,
    `heading=${heading.toFixed(1)}`,
    `fov=${fov}`,
    `pitch=${pitch}`,
    'source=outdoor',
    `key=${KEY}`,
  ];
  return parts.join('&');
}

const results = [];
for (const addr of ADDRESSES) {
  console.log(`\n=== ${addr.label} (${addr.query}) ===`);
  const geo = await geocode(addr.query);
  if (!geo.ok) {
    console.log(`  geocode failed: ${geo.status}`);
    results.push({ ...addr, error: `geocode: ${geo.status}` });
    continue;
  }
  console.log(`  geocoded -> ${geo.formatted} (${geo.lat}, ${geo.lng})`);

  const meta = await streetViewMeta(geo.lat, geo.lng);
  const aim = aimQuality(meta, geo.lat, geo.lng);
  if (!aim.ok) {
    console.log(`  aim refused: ${aim.reason}`);
    results.push({ ...addr, geocode: geo, refused: aim.reason });
    continue;
  }

  const fov = aim.panoMeters <= 12 ? 90 : aim.panoMeters <= 30 ? 75 : 62;
  const pitch = aim.panoMeters <= 12 ? 8 : aim.panoMeters <= 30 ? 5 : 2;
  const imgUrl = streetViewImageUrl(geo.lat, geo.lng, 900, 500, { heading: aim.heading, fov, pitch });
  console.log(`  heading=${aim.heading.toFixed(1)} panoMeters=${aim.panoMeters} pano=(${meta.lat},${meta.lng})`);

  const imgRes = await fetch(imgUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const file = `${OUT_DIR}/${addr.label}.jpg`;
  writeFileSync(file, buf);
  console.log(`  saved ${file} (${buf.length} bytes, content-type ${imgRes.headers.get('content-type')})`);

  results.push({
    ...addr,
    geocode: geo,
    heading: aim.heading,
    panoMeters: aim.panoMeters,
    panoLat: meta.lat,
    panoLng: meta.lng,
    file,
  });
}

writeFileSync(`${OUT_DIR}/_results.json`, JSON.stringify(results, null, 2));
console.log(`\nWrote ${OUT_DIR}/_results.json`);
