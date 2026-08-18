/**
 * §12 in the spec ("construction/plans near the property", premium/VIP) —
 * next step after nearby-plans-geometry.mjs (0818, commit 4ca4770), which
 * only locked down the centroid math with hand-built polygons. This is the
 * "look by eye before release" step that was explicitly deferred: run the
 * real `nearbyConstructionPlans` against the live XPLAN service for the four
 * addresses named in the spec, and print what actually comes back — same
 * gap the Street View heading fix (db3f2c1) needed closed before it shipped.
 *
 * Geocodes each address with the app's own `geocodeAddress` (GovMap primary,
 * Nominatim fallback) to get real ITM coordinates, then calls
 * `nearbyConstructionPlans` unmodified. No API route, no UI, no DB writes —
 * read-only network calls against public XPLAN/GovMap endpoints.
 *
 *   node scripts/qa/nearby-plans-live.mjs
 */
import { geocodeAddress } from '../../apps/32-nadlan-berega/lib/geocode.ts';
import { nearbyConstructionPlans } from '../../apps/32-nadlan-berega/lib/nearbyplans.ts';

const ADDRESSES = [
  'דורש טוב 17 ירושלים',
  'שמואל הנביא 86 ירושלים',
  'הדקל 22 חצור הגלילית',
  'הבעל שם טוב 9 רחובות',
];

let ok = 0;
let fail = 0;

for (const address of ADDRESSES) {
  console.log(`\n=== ${address} ===`);
  try {
    const candidates = await geocodeAddress(address);
    const chosen = candidates[0];
    if (!chosen) {
      console.log('  FAIL  geocode returned no candidates');
      fail++;
      continue;
    }
    console.log(
      `  geocoded -> ${chosen.label} (source=${chosen.source}, cityVerified=${chosen.cityVerified}, itm=${chosen.itmX.toFixed(1)},${chosen.itmY.toFixed(1)})`,
    );
    if (!chosen.cityVerified) {
      console.log('  NOTE  city not verified against the typed text — treat this result with caution');
    }

    const plans = await nearbyConstructionPlans(chosen.itmX, chosen.itmY, 400);
    console.log(`  PASS  ${plans.length} nearby plan(s) within 400m`);
    for (const p of plans) {
      console.log(
        `    - ${p.planNumber ?? '(no number)'} "${p.planName ?? ''}" [${p.status ?? 'no status'}] ` +
          `${p.distanceM}m away, ${p.areaDunam ?? '?'} dunam, lat/lng=${p.lat.toFixed(5)},${p.lng.toFixed(5)}`,
      );
    }
    ok++;
  } catch (e) {
    console.log(`  FAIL  ${e?.message ?? e}`);
    fail++;
  }
}

console.log(`\n${ok}/${ADDRESSES.length} addresses resolved and queried without error, ${fail} failed`);
console.log(
  '\nWhat this does not cover: whether the returned plan locations are\n' +
    'visually correct on a map, an API route, a UI panel, or a premium-tier\n' +
    'gate. Those are still the next steps.',
);
process.exit(fail ? 1 : 0);
